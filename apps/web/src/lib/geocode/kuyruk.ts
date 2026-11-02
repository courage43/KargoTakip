import { prisma } from "../db";
import { geocodeSaglayiciAl } from "./index";
import { yayinla } from "../notify";

const MAX_DENEME = 3;

export interface GeocodeOzet { bekleyen: number; tahmini: number; dogrulanmis: number; basarisiz: number }

export async function geocodeOzeti(): Promise<GeocodeOzet> {
  const [bekleyen, tahmini, dogrulanmis, basarisiz] = await Promise.all([
    prisma.memberAddress.count({ where: { gecerlilikBitis: null, geoLat: null, geocodeDenemesi: { lt: MAX_DENEME } } }),
    prisma.memberAddress.count({ where: { gecerlilikBitis: null, konumDurumu: "TAHMINI" } }),
    prisma.memberAddress.count({ where: { gecerlilikBitis: null, konumDurumu: "DOGRULANDI" } }),
    prisma.memberAddress.count({ where: { gecerlilikBitis: null, geoLat: null, geocodeDenemesi: { gte: MAX_DENEME } } }),
  ]);
  return { bekleyen, tahmini, dogrulanmis, basarisiz };
}

/**
 * Konumu olmayan güncel adresleri sağlayıcı hız sınırına uyarak geocode et.
 * Önce önbelleğe bakar; sonuç adres satırına yazılır. İşlenen adres sayısını döner.
 */
export async function geocodeKuyruguIsle(limit = 50, sureMs = 50000): Promise<{ islenen: number; bulunan: number; onbellekten: number }> {
  const saglayici = geocodeSaglayiciAl();
  const adresler = await prisma.memberAddress.findMany({
    where: { gecerlilikBitis: null, geoLat: null, geocodeDenemesi: { lt: MAX_DENEME } },
    orderBy: [{ geocodeDenemesi: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
  const basla = Date.now();
  const aralikMs = Math.ceil(1000 / saglayici.hizSaniye);
  let islenen = 0, bulunan = 0, onbellekten = 0;
  for (const a of adresler) {
    if (Date.now() - basla > sureMs) break;
    let sonuc: { lat: number | null; lng: number | null; kalite: string | null } | null = null;
    const cache = await prisma.geocodeCache.findUnique({ where: { adresNormalize: a.adresNormalize } });
    if (cache) { sonuc = { lat: cache.lat, lng: cache.lng, kalite: cache.kalite }; onbellekten++; }
    else {
      const t0 = Date.now();
      try {
        const r = await saglayici.bul(a.adresMetni, a.ilce, a.il);
        sonuc = r ? { lat: r.lat, lng: r.lng, kalite: r.kalite } : { lat: null, lng: null, kalite: null };
        await prisma.geocodeCache.upsert({ where: { adresNormalize: a.adresNormalize }, update: { ...sonuc, saglayici: saglayici.ad }, create: { adresNormalize: a.adresNormalize, ...sonuc, saglayici: saglayici.ad } });
      } catch (e) {
        await prisma.memberAddress.update({ where: { id: a.id }, data: { geocodeDenemesi: { increment: 1 }, geocodeHata: (e as Error).message.slice(0, 200) } });
        islenen++;
        // sağlayıcı hatasında (ağ/limit) bu turu bitir
        if (/HTTP 429|HTTP 5|OVER_QUERY_LIMIT|Ağ/i.test((e as Error).message)) break;
        continue;
      } finally {
        const gecen = Date.now() - t0;
        if (gecen < aralikMs) await new Promise((r) => setTimeout(r, aralikMs - gecen));
      }
    }
    islenen++;
    if (sonuc?.lat != null && sonuc.lng != null) {
      bulunan++;
      await prisma.memberAddress.update({
        where: { id: a.id },
        data: {
          geoLat: sonuc.lat, geoLng: sonuc.lng, geoSource: "GEOCODE_TAHMIN", geoKalite: sonuc.kalite, geocodeHata: null,
          konumDurumu: a.konumDurumu === "YOK" ? "TAHMINI" : a.konumDurumu,
        },
      });
    } else {
      await prisma.memberAddress.update({ where: { id: a.id }, data: { geocodeDenemesi: { increment: 1 }, geocodeHata: "Adres bulunamadı" } });
    }
  }
  if (bulunan) await yayinla("campaign", { tip: "geocode", bulunan });
  return { islenen, bulunan, onbellekten };
}

let calisiyor = false;
/** Arka planda kuyruk bitene kadar işle (admin düğmesi tetikler) */
export function geocodeTetikle() {
  if (calisiyor) return;
  calisiyor = true;
  setImmediate(async () => {
    try {
      for (let tur = 0; tur < 500; tur++) {
        const r = await geocodeKuyruguIsle(100, 55000);
        if (r.islenen === 0) break;
      }
    } catch (e) { console.error("geocode işleyici hatası", e); }
    finally { calisiyor = false; }
  });
}
export const geocodeCalisiyor = () => calisiyor;
