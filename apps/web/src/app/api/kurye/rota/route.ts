import { prisma } from "@/lib/db";
import { yayinla } from "@/lib/notify";
import { json, options, kuryeGerekli } from "@/lib/api";

export const OPTIONS = options;

/** { islem: "baslat" | "bitir" } */
export async function POST(req: Request) {
  const o = await kuryeGerekli(req); if (o instanceof Response) return o;
  const b = await req.json().catch(() => ({}));
  const acik = await prisma.route.findFirst({ where: { courierId: o.sub, bitis: null } });
  if (b.islem === "baslat") {
    if (acik) return json({ rotaAcik: true, rotaId: acik.id });
    const g = await prisma.shipment.findFirst({ where: { assignedCourierId: o.sub, durum: { in: ["ATANDI", "YOLDA"] } }, select: { campaignId: true } });
    const r = await prisma.route.create({ data: { courierId: o.sub, campaignId: g?.campaignId ?? null } });
    await prisma.shipment.updateMany({ where: { assignedCourierId: o.sub, durum: "ATANDI" }, data: { durum: "YOLDA", sonDurumAt: new Date() } });
    await yayinla("route", { tip: "baslangic", courierId: o.sub, ad: o.ad, companyId: o.companyId, campaignId: g?.campaignId });
    return json({ rotaAcik: true, rotaId: r.id });
  }
  if (b.islem === "bitir") {
    if (acik) {
      await prisma.route.update({ where: { id: acik.id }, data: { bitis: new Date() } });
      await prisma.shipment.updateMany({ where: { assignedCourierId: o.sub, durum: "YOLDA" }, data: { durum: "ATANDI", sonDurumAt: new Date() } });
      await yayinla("route", { tip: "bitis", courierId: o.sub, ad: o.ad, companyId: o.companyId, campaignId: acik.campaignId });
    }
    return json({ rotaAcik: false });
  }
  return json({ hata: "islem: baslat | bitir" }, 400);
}
