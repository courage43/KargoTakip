import { prisma } from "@/lib/db";
import { kuryeKonumSchema } from "@dagitim/shared";
import { yayinla } from "@/lib/notify";
import { json, options, kuryeGerekli } from "@/lib/api";

export const OPTIONS = options;

/** Rota açıkken periyodik konum; rota kapalıysa kaydetmez */
export async function POST(req: Request) {
  const o = await kuryeGerekli(req); if (o instanceof Response) return o;
  const p = kuryeKonumSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ hata: "Geçersiz konum" }, 400);
  const rota = await prisma.route.findFirst({ where: { courierId: o.sub, bitis: null } });
  if (!rota) return json({ ok: false, rotaAcik: false });
  await prisma.courierLocation.create({ data: { courierId: o.sub, campaignId: rota.campaignId, lat: p.data.lat, lng: p.data.lng, accuracyM: p.data.accuracyM ?? null, hiz: p.data.hiz ?? null, zaman: p.data.zaman ? new Date(p.data.zaman) : new Date() } });
  await yayinla("courier_location", { courierId: o.sub, ad: o.ad, companyId: o.companyId, campaignId: rota.campaignId, lat: p.data.lat, lng: p.data.lng });
  return json({ ok: true, rotaAcik: true });
}
