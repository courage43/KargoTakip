import { prisma } from "./db";
import { mesafeM, UZUN_ROTA_SAAT, KONUM_SAKLAMA_GUN } from "@dagitim/shared";
import { yayinla } from "./notify";

/** Rota kapanırken özet hesapla ve yaz */
export async function rotaOzetiHesapla(routeId: string, otomatik = false) {
  const r = await prisma.route.findUnique({ where: { id: routeId } });
  if (!r) return;
  const bitis = r.bitis ?? new Date();
  const [konumlar, denemeSayisi] = await Promise.all([
    prisma.courierLocation.findMany({ where: { courierId: r.courierId, zaman: { gte: r.baslangic, lte: bitis } }, orderBy: { zaman: "asc" }, select: { lat: true, lng: true } }),
    prisma.deliveryAttempt.count({ where: { courierId: r.courierId, sunucuZamani: { gte: r.baslangic, lte: bitis } } }),
  ]);
  let mesafe = 0;
  for (let i = 1; i < konumlar.length; i++) mesafe += mesafeM(konumlar[i - 1].lat, konumlar[i - 1].lng, konumlar[i].lat, konumlar[i].lng);
  await prisma.route.update({ where: { id: routeId }, data: { bitis, mesafeM: Math.round(mesafe), noktaSayisi: konumlar.length, denemeSayisi, otomatikKapandi: otomatik } });
}

/** 14 saati aşan açık rotaları kapat; 90 günden eski ham konumları sil */
export async function bakimCalistir(): Promise<{ kapatilanRota: number; silinenKonum: number }> {
  const esik = new Date(Date.now() - UZUN_ROTA_SAAT * 3600 * 1000);
  const uzunlar = await prisma.route.findMany({ where: { bitis: null, baslangic: { lt: esik } }, include: { courier: true } });
  for (const r of uzunlar) {
    await rotaOzetiHesapla(r.id, true);
    await prisma.shipment.updateMany({ where: { assignedCourierId: r.courierId, durum: "YOLDA" }, data: { durum: "ATANDI", sonDurumAt: new Date() } });
    await yayinla("route", { tip: "bitis", courierId: r.courierId, ad: r.courier.adSoyad, companyId: r.courier.courierCompanyId, campaignId: r.campaignId, otomatik: true });
  }
  const silinen = await prisma.courierLocation.deleteMany({ where: { zaman: { lt: new Date(Date.now() - KONUM_SAKLAMA_GUN * 86400000) } } });
  return { kapatilanRota: uzunlar.length, silinenKonum: silinen.count };
}
