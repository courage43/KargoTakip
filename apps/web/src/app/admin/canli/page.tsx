import { prisma } from "@/lib/db";
import { CanliHarita } from "@/components/CanliHarita";
import { GONDERI_DURUMU_ETIKET } from "@dagitim/shared";

export default async function Canli() {
  const aktif = await prisma.campaign.findMany({ where: { durum: "AKTIF" }, select: { id: true, ad: true } });
  const ids = aktif.map((a) => a.id);
  const [acikRotalar, gonderiler] = await Promise.all([
    prisma.route.findMany({ where: { bitis: null }, include: { courier: { include: { konumlar: { orderBy: { zaman: "desc" }, take: 1 } } } } }),
    prisma.shipment.findMany({ where: { campaignId: { in: ids }, assignedCourierId: { not: null }, memberAddress: { geoLat: { not: null } } }, select: { id: true, durum: true, assignedCourierId: true, member: { select: { unvan: true } }, memberAddress: { select: { geoLat: true, geoLng: true } } }, take: 6000 }),
  ]);
  const kuryeler = acikRotalar.map((r) => { const k = r.courier.konumlar[0]; return { id: r.courierId, ad: r.courier.adSoyad, lat: k?.lat ?? null, lng: k?.lng ?? null, zaman: k?.zaman?.toISOString() ?? null, rotaBaslangic: r.baslangic.toISOString() }; });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Canlı Harita</h1>
      <p className="text-sm text-gray-600">Rotası açık kuryeler ve aktif dağıtımlardaki gönderiler. Konumlar kurye "Rotaya başla" dediği sürece 30 sn'de bir güncellenir.</p>
      <CanliHarita kuryeler={kuryeler} gonderiler={gonderiler.map((g) => ({ id: g.id, lat: g.memberAddress.geoLat!, lng: g.memberAddress.geoLng!, durum: g.durum, kurye: g.assignedCourierId!, etiket: `${g.member.unvan} · ${GONDERI_DURUMU_ETIKET[g.durum]}`, href: `/admin/gonderiler/${g.id}` }))} />
    </div>
  );
}
