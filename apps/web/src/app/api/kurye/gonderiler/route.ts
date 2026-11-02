import { prisma } from "@/lib/db";
import { json, options, kuryeGerekli } from "@/lib/api";

export const OPTIONS = options;

/** Kuryeye atanmış açık gönderiler + bugün kapattıkları */
export async function GET(req: Request) {
  const o = await kuryeGerekli(req); if (o instanceof Response) return o;
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const liste = await prisma.shipment.findMany({
    where: { assignedCourierId: o.sub, campaign: { durum: "AKTIF" }, OR: [{ durum: { in: ["ATANDI", "YOLDA"] } }, { sonDurumAt: { gte: bugun } }] },
    include: { member: { select: { unvan: true, tabelaUnvani: true, sicilNo: true, cepTelefonu: true, isTelefonu: true, yetkiliAdSoyad: true } }, memberAddress: true, campaign: { select: { id: true, ad: true } }, denemeler: { orderBy: { sunucuZamani: "desc" }, take: 1, select: { sonuc: true, sunucuZamani: true } } },
    orderBy: [{ siraNo: "asc" }, { memberAddress: { ilce: "asc" } }, { member: { unvan: "asc" } }],
  });
  return json({
    sunucuZamani: new Date().toISOString(),
    gonderiler: liste.map((g) => ({
      id: g.id, kampanyaId: g.campaign.id, kampanyaAd: g.campaign.ad, durum: g.durum, siraNo: g.siraNo, barkod: g.barkod, denemeSayisi: g.denemeSayisi,
      uye: { unvan: g.member.unvan, tabelaUnvani: g.member.tabelaUnvani, sicilNo: g.member.sicilNo, cepTelefonu: g.member.cepTelefonu, isTelefonu: g.member.isTelefonu, yetkili: g.member.yetkiliAdSoyad },
      adres: { id: g.memberAddress.id, metin: g.memberAddress.adresMetni, ilce: g.memberAddress.ilce, lat: g.memberAddress.geoLat, lng: g.memberAddress.geoLng, konumDurumu: g.memberAddress.konumDurumu, kuryeNotu: g.memberAddress.kuryeNotu },
      tercih: g.uyeTercihi, uyeNotu: g.uyeNotu, komsuBilgisi: g.komsuBilgisi, alternatifAdres: g.alternatifAdres, uygunSaat: g.uygunSaat,
      sonDeneme: g.denemeler[0] ?? null,
    })),
  });
}
