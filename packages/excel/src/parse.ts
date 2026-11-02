import * as XLSX from "xlsx";
import { type SutunEslemesi, type UyeAlani } from "./columns";
import { telefonNormalize } from "./normalize";
import { adresNormalize, ilceAyikla } from "./address";

export interface HamTablo {
  basliklar: string[];
  satirlar: Record<string, unknown>[];
  sayfaAdi: string;
}

/** xlsx/xls/csv buffer'ını oku; ilk dolu satırı başlık kabul et */
export function exceliOku(buf: ArrayBuffer | Buffer, maxSatir?: number): HamTablo {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true, raw: false });
  const sayfaAdi = wb.SheetNames[0];
  const ws = wb.Sheets[sayfaAdi];
  const matris: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
  // Başlık satırı: en çok dolu hücreye sahip ilk 5 satırdan biri
  let baslikIdx = 0;
  let enCok = -1;
  for (let i = 0; i < Math.min(5, matris.length); i++) {
    const dolu = (matris[i] ?? []).filter((c) => c != null && String(c).trim() !== "").length;
    if (dolu > enCok) { enCok = dolu; baslikIdx = i; }
  }
  const basliklar = (matris[baslikIdx] ?? []).map((b, i) => (b == null || String(b).trim() === "" ? `Sütun ${i + 1}` : String(b).trim()));
  const satirlar: Record<string, unknown>[] = [];
  for (let i = baslikIdx + 1; i < matris.length; i++) {
    if (maxSatir != null && satirlar.length >= maxSatir) break;
    const r = matris[i] ?? [];
    if (r.every((c) => c == null || String(c).trim() === "")) continue;
    const obj: Record<string, unknown> = {};
    basliklar.forEach((b, j) => { obj[b] = r[j] ?? null; });
    satirlar.push(obj);
  }
  return { basliklar, satirlar, sayfaAdi };
}

export interface UyeSatiri {
  satirNo: number;
  sicilNo: string;
  alanlar: Partial<Record<UyeAlani, string | null>>;
  raw: Record<string, unknown>;
  adresNormalize: string;
  ilce: string | null;
  uyarilar: string[];
}

export interface AyristirmaSonucu {
  satirlar: UyeSatiri[];
  hatalar: { satirNo: number; mesaj: string }[];
  mukerrerSicil: string[];
}

function temiz(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Ham satırları eşlemeye göre üye satırlarına dönüştür */
export function satirlariAyristir(tablo: HamTablo, esleme: SutunEslemesi[]): AyristirmaSonucu {
  const sonuc: AyristirmaSonucu = { satirlar: [], hatalar: [], mukerrerSicil: [] };
  const sicilSayac = new Map<string, number>();
  tablo.satirlar.forEach((ham, i) => {
    const satirNo = i + 2;
    const alanlar: Partial<Record<UyeAlani, string | null>> = {};
    const raw: Record<string, unknown> = {};
    const uyarilar: string[] = [];
    for (const e of esleme) {
      const v = ham[e.baslik];
      if (e.hedef === "YOKSAY") continue;
      if (e.hedef === "RAW") { if (v != null && String(v).trim() !== "") raw[e.baslik] = temiz(v); continue; }
      alanlar[e.hedef] = temiz(v);
    }
    const sicilNo = alanlar.sicilNo?.replace(/\.0$/, "").trim() ?? "";
    if (!sicilNo) { sonuc.hatalar.push({ satirNo, mesaj: "Üye sicil no boş" }); return; }
    if (alanlar.cepTelefonu !== undefined) {
      const t = telefonNormalize(alanlar.cepTelefonu);
      if (alanlar.cepTelefonu && !t) uyarilar.push(`Cep telefonu geçersiz: ${alanlar.cepTelefonu}`);
      alanlar.cepTelefonu = t;
    }
    if (alanlar.isTelefonu !== undefined) alanlar.isTelefonu = telefonNormalize(alanlar.isTelefonu) ?? alanlar.isTelefonu;
    const adres = alanlar.adres ?? "";
    sicilSayac.set(sicilNo, (sicilSayac.get(sicilNo) ?? 0) + 1);
    sonuc.satirlar.push({
      satirNo, sicilNo, alanlar, raw,
      adresNormalize: adresNormalize(adres),
      ilce: ilceAyikla(adres),
      uyarilar,
    });
  });
  for (const [s, n] of sicilSayac) if (n > 1) sonuc.mukerrerSicil.push(s);
  return sonuc;
}
