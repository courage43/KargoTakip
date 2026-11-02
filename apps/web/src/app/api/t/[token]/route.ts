import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uyeTercihSchema } from "@dagitim/shared";
import { yayinla } from "@/lib/notify";

/** Üye tercih sayfası formu (girişsiz, token ile) */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const g = await prisma.shipment.findUnique({ where: { token }, include: { campaign: true, memberAddress: true } });
  if (!g || g.campaign.durum === "TAMAMLANDI") return NextResponse.json({ hata: "Bağlantı geçersiz veya süresi dolmuş" }, { status: 404 });
  const p = uyeTercihSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ hata: "Geçersiz veri" }, { status: 400 });
  const d = p.data;
  await prisma.shipment.update({ where: { id: g.id }, data: { uyeTercihi: d.uyeTercihi, uyeNotu: d.uyeNotu, komsuBilgisi: d.komsuBilgisi, alternatifAdres: d.alternatifAdres, uygunSaat: d.uygunSaat, tercihTarihi: new Date(), ...(d.uyeTercihi === "ZARF_ISTEMIYORUM" ? { durum: "UYE_ISTEMEDI" as const, sonDurumAt: new Date() } : {}) } });
  if ((d.uyeTercihi === "BASKA_ADRESE" || d.uyeTercihi === "EVDEYIM") && d.alternatifAdres && d.alternatifAdres.trim().length > 5) {
    await prisma.addressChangeRequest.create({ data: { memberId: g.memberId, eskiAddressId: g.memberAddressId, eskiAdres: g.memberAddress.adresMetni, yeniAdres: d.alternatifAdres.trim(), kaynak: "UYE_SAYFASI", shipmentId: g.id, eskiKonumVarMi: g.memberAddress.konumDurumu === "DOGRULANDI" } });
  }
  await yayinla("shipment", { tip: "tercih", shipmentId: g.id, campaignId: g.campaignId, courierId: g.assignedCourierId, durum: d.uyeTercihi === "ZARF_ISTEMIYORUM" ? "UYE_ISTEMEDI" : g.durum });
  return NextResponse.json({ ok: true });
}
