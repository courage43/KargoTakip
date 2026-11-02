import { prisma } from "./db";
import { enYakinKomsuSirala, toplamMesafe } from "@dagitim/shared";
import { yayinla } from "./notify";

/** Kuryenin ATANDI/YOLDA gönderilerini sırala ve siraNo yaz. Başlangıç verilmezse son bilinen konum. */
export async function kuryeListesiniSirala(courierId: string, baslangic: { lat: number; lng: number } | null, campaignId?: string) {
  if (!baslangic) {
    const son = await prisma.courierLocation.findFirst({ where: { courierId }, orderBy: { zaman: "desc" } });
    if (son) baslangic = { lat: son.lat, lng: son.lng };
  }
  const gonderiler = await prisma.shipment.findMany({
    where: { assignedCourierId: courierId, durum: { in: ["ATANDI", "YOLDA"] }, ...(campaignId ? { campaignId } : {}) },
    select: { id: true, memberAddress: { select: { geoLat: true, geoLng: true, ilce: true } } },
  });
  const noktalar = gonderiler.map((g) => ({ id: g.id, lat: g.memberAddress.geoLat, lng: g.memberAddress.geoLng, ilce: g.memberAddress.ilce }));
  const sira = enYakinKomsuSirala(baslangic, noktalar);
  await prisma.$transaction(sira.map((id, i) => prisma.shipment.update({ where: { id }, data: { siraNo: i + 1 } })));
  const byId = new Map(noktalar.map((n) => [n.id, n]));
  const mesafe = Math.round(toplamMesafe(baslangic, sira.map((id) => byId.get(id)!)));
  await yayinla("shipment", { tip: "yenile", courierId });
  return { adet: sira.length, tahminiMesafeM: mesafe, koordinatsiz: noktalar.filter((n) => n.lat == null).length };
}
