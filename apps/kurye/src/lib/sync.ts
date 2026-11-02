import { api } from "./api";
import { kuyruguOku, kuyruktanSil, kuyrukHata } from "./db";

let calisiyor = false;

/** Bekleyen teslimatları sırayla sunucuya gönder (foto → deneme) */
export async function kuyruguGonder(onDegisim?: (kalan: number) => void): Promise<number> {
  if (calisiyor || !navigator.onLine) return (await kuyruguOku()).length;
  calisiyor = true;
  try {
    const liste = (await kuyruguOku()).sort((a, b) => a.olusturma.localeCompare(b.olusturma));
    for (const b of liste) {
      try {
        const fotoUrls: string[] = [];
        let imzaUrl: string | null = null;
        for (const f of b.fotolar) {
          const fd = new FormData();
          fd.append("dosya", f.blob, f.tur === "imza" ? "imza.png" : "foto.jpg");
          fd.append("tur", f.tur);
          const r = await api<{ yol: string }>("/api/kurye/dosya", { method: "POST", body: fd });
          if (f.tur === "imza") imzaUrl = r.yol; else fotoUrls.push(r.yol);
        }
        await api("/api/kurye/denemeler", { method: "POST", body: JSON.stringify({ ...b.payload, fotoUrls, imzaUrl, istemciId: b.istemciId, shipmentId: b.shipmentId }) });
        await kuyruktanSil(b.istemciId);
        onDegisim?.((await kuyruguOku()).length);
      } catch (e) {
        const st = (e as { status?: number }).status;
        if (st && st >= 400 && st < 500 && st !== 401) {
          // Kalıcı hata (örn. gönderi artık bu kuryede değil): kuyrukta hata notuyla bırak, diğerlerine geç
          await kuyrukHata(b.istemciId, (e as Error).message);
        } else {
          break; // ağ hatası: dur, sonra tekrar
        }
      }
    }
  } finally { calisiyor = false; }
  return (await kuyruguOku()).length;
}
