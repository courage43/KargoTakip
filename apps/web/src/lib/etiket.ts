import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface EtiketVerisi { barkod: string; unvan: string; adres: string; ilce: string | null; kurye: string | null; sira: number | null }

const MM = 72 / 25.4;
// A4 3×8 etiket (70×36 mm; Avery 3475 benzeri), kenar boşlukları 0 / 4.5 mm
const SAYFA = { w: 210 * MM, h: 297 * MM }, ET = { w: 70 * MM, h: 36 * MM }, SUTUN = 3, SATIR = 8, UST = 4.5 * MM;

function kirp(metin: string, font: PDFFont, boyut: number, maxW: number): string[] {
  const kelimeler = metin.split(/\s+/); const satirlar: string[] = []; let s = "";
  for (const k of kelimeler) {
    const d = s ? `${s} ${k}` : k;
    if (font.widthOfTextAtSize(d, boyut) <= maxW) s = d; else { if (s) satirlar.push(s); s = k; }
  }
  if (s) satirlar.push(s);
  return satirlar;
}

/** Zarf etiketleri PDF'i (A4, 24 etiket/sayfa) */
export async function etiketPdf(liste: EtiketVerisi[], baslik: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await readFile(path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf"));
  const font = await pdf.embedFont(fontBytes, { subset: true });
  pdf.setTitle(`Zarf etiketleri - ${baslik}`);
  let sayfa = pdf.addPage([SAYFA.w, SAYFA.h]);
  for (let i = 0; i < liste.length; i++) {
    const idx = i % (SUTUN * SATIR);
    if (i > 0 && idx === 0) sayfa = pdf.addPage([SAYFA.w, SAYFA.h]);
    const e = liste[i];
    const col = idx % SUTUN, row = Math.floor(idx / SUTUN);
    const x0 = col * ET.w, y0 = SAYFA.h - UST - (row + 1) * ET.h;
    const pad = 3 * MM, qrBoyut = 22 * MM;
    // QR
    const qrPng = await QRCode.toBuffer(e.barkod, { type: "png", margin: 0, width: 220, errorCorrectionLevel: "M" });
    const qr = await pdf.embedPng(qrPng);
    sayfa.drawImage(qr, { x: x0 + ET.w - pad - qrBoyut, y: y0 + (ET.h - qrBoyut) / 2 + 1.5 * MM, width: qrBoyut, height: qrBoyut });
    sayfa.drawText(e.barkod, { x: x0 + ET.w - pad - qrBoyut, y: y0 + 2.2 * MM, size: 6.5, font, color: rgb(0.25, 0.25, 0.25) });
    // Metin
    const metinW = ET.w - pad * 2 - qrBoyut - 2 * MM;
    let y = y0 + ET.h - pad - 7;
    for (const s of kirp(e.unvan, font, 8, metinW).slice(0, 2)) { sayfa.drawText(s, { x: x0 + pad, y, size: 8, font }); y -= 9.5; }
    for (const s of kirp(e.adres, font, 6.5, metinW).slice(0, 3)) { sayfa.drawText(s, { x: x0 + pad, y, size: 6.5, font, color: rgb(0.15, 0.15, 0.15) }); y -= 8; }
    const alt = [e.ilce, e.kurye ? `Kurye: ${e.kurye}` : null, e.sira != null ? `#${e.sira}` : null].filter(Boolean).join(" · ");
    sayfa.drawText(alt, { x: x0 + pad, y: y0 + 2.2 * MM, size: 6.5, font, color: rgb(0.1, 0.3, 0.7) });
    // kesim çizgisi (hafif)
    sayfa.drawRectangle({ x: x0 + 0.5, y: y0 + 0.5, width: ET.w - 1, height: ET.h - 1, borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.3 });
  }
  return pdf.save();
}

/** Kısa zarf kodu: K{kampanya sırası}-{4 haneli sıra} */
export function barkodUret(kampanyaNo: number, sira: number): string {
  return `K${kampanyaNo}-${String(sira).padStart(4, "0")}`;
}
