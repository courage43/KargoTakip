import { prisma } from "@/lib/db";
import { json, options, kuryeGerekli } from "@/lib/api";

export const OPTIONS = options;
export async function GET(req: Request) {
  const o = await kuryeGerekli(req); if (o instanceof Response) return o;
  const [u, rota, nav] = await Promise.all([
    prisma.user.findUnique({ where: { id: o.sub }, include: { courierCompany: true } }),
    prisma.route.findFirst({ where: { courierId: o.sub, bitis: null } }),
    prisma.setting.findUnique({ where: { key: "NAVIGASYON" } }),
  ]);
  return json({ id: o.sub, ad: o.ad, firma: u?.courierCompany?.ad ?? null, rotaAcik: !!rota, rotaId: rota?.id ?? null, navigasyon: nav?.value ?? "google" });
}
