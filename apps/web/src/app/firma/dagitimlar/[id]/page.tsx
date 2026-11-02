import { notFound } from "next/navigation";
import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { kampanyaOzeti, kampanyaHakedis } from "@/lib/campaign";
import { AtamaPaneli } from "@/components/AtamaPaneli";
import { HakedisTablosu } from "@/components/HakedisTablosu";
import { tarih, yuzde } from "@/lib/format";

export default async function FirmaDagitim({ params }: { params: Promise<{ id: string }> }) {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI"]);
  const { id } = await params;
  const k = await prisma.campaign.findFirst({ where: { id, courierCompanyId: o.companyId!, durum: { in: ["AKTIF", "TAMAMLANDI"] } } });
  if (!k) notFound();
  const [ozet, kuryeler, gonderiler, hakedis] = await Promise.all([
    kampanyaOzeti(id),
    prisma.user.findMany({ where: { rol: "KURYE", courierCompanyId: o.companyId!, aktif: true }, orderBy: { adSoyad: "asc" }, select: { id: true, adSoyad: true } }),
    prisma.shipment.findMany({ where: { campaignId: id }, include: { member: { select: { unvan: true, sicilNo: true, cepTelefonu: true } }, memberAddress: true, assignedCourier: { select: { adSoyad: true } } }, orderBy: [{ memberAddress: { ilce: "asc" } }, { member: { unvan: "asc" } }] }),
    kampanyaHakedis(id, o.companyId),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-500">{tarih(k.planlananBaslangic, false)} – {tarih(k.planlananBitis, false)} · {k.durum === "AKTIF" ? "Aktif" : "Tamamlandı"}</div>
        <h1 className="text-2xl font-semibold">{k.ad}</h1>
        <div className="text-sm text-gray-600 mt-1">{ozet.toplam} gönderi · <span className="text-amber-700 font-medium">{ozet.ozet.BEKLIYOR ?? 0} atanmamış</span> · {ozet.teslim} teslim · {ozet.basarisiz} başarısız · %{yuzde(ozet.kapali, ozet.toplam)} tamamlandı</div>
      </div>
      <AtamaPaneli campaignId={id} kuryeler={kuryeler} gonderiler={gonderiler.map((g) => ({
        id: g.id, unvan: g.member.unvan, sicilNo: g.member.sicilNo, adres: g.memberAddress.adresMetni, ilce: g.memberAddress.ilce,
        lat: g.memberAddress.geoLat, lng: g.memberAddress.geoLng, konumDurumu: g.memberAddress.konumDurumu, durum: g.durum,
        kuryeId: g.assignedCourierId, kuryeAd: g.assignedCourier?.adSoyad ?? null, tercih: g.uyeTercihi, kuryeNotu: g.memberAddress.kuryeNotu, telefon: g.member.cepTelefonu, siraNo: g.siraNo, barkod: g.barkod,
      }))} />
      <HakedisTablosu satirlar={hakedis} baslik="Kuryelerinizin hakedişi (gün bazlı)" />
    </div>
  );
}
