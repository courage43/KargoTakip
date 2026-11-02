import { NextResponse } from "next/server";
import { oturumAl } from "@/lib/auth";
import { prisma, type Prisma } from "@/lib/db";
import { etiketPdf } from "@/lib/etiket";
import { barkodlariDoldur } from "@/lib/campaign";

/** Zarf etiketleri PDF: ?kurye=&ilce=&durum=acik */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol === "KURYE") return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const sp = new URL(req.url).searchParams;
  const k = await prisma.campaign.findUnique({ where: { id } });
  if (!k) return NextResponse.json({ hata: "Yok" }, { status: 404 });
  if (o.rol === "KURYE_FIRMA_YONETICI" && k.courierCompanyId !== o.companyId) return NextResponse.json({ hata: "Yetkisiz" }, { status: 403 });
  await barkodlariDoldur(id);
  const where: Prisma.ShipmentWhereInput = { campaignId: id };
  if (sp.get("kurye")) where.assignedCourierId = sp.get("kurye");
  if (sp.get("ilce")) where.memberAddress = { ilce: sp.get("ilce") };
  if (sp.get("durum") === "acik") where.durum = { in: ["BEKLIYOR", "ATANDI", "YOLDA"] };
  const g = await prisma.shipment.findMany({ where, include: { member: true, memberAddress: true, assignedCourier: true }, orderBy: [{ assignedCourierId: "asc" }, { siraNo: "asc" }, { memberAddress: { ilce: "asc" } }, { member: { unvan: "asc" } }], take: 6000 });
  const pdf = await etiketPdf(g.map((x) => ({ barkod: x.barkod ?? "", unvan: x.member.unvan, adres: x.memberAddress.adresMetni, ilce: x.memberAddress.ilce, kurye: x.assignedCourier?.adSoyad ?? null, sira: x.siraNo })), k.ad);
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="etiket-${encodeURIComponent(k.ad)}.pdf"` } });
}
