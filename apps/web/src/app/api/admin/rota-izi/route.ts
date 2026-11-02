import { NextResponse } from "next/server";
import { oturumAl } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Bir kuryenin bugünkü (açık rotadaki) izini döner: canlı haritada çizgi için */
export async function GET(req: Request) {
  const o = await oturumAl();
  if (!o || o.rol === "KURYE") return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const courierId = new URL(req.url).searchParams.get("courierId");
  if (!courierId) return NextResponse.json({ hata: "courierId gerekli" }, { status: 400 });
  const kurye = await prisma.user.findUnique({ where: { id: courierId }, select: { courierCompanyId: true } });
  if (!kurye || (o.rol === "KURYE_FIRMA_YONETICI" && kurye.courierCompanyId !== o.companyId)) return NextResponse.json({ hata: "Yetkisiz" }, { status: 403 });
  const rota = await prisma.route.findFirst({ where: { courierId, bitis: null }, orderBy: { baslangic: "desc" } });
  const baslangic = rota?.baslangic ?? new Date(new Date().setHours(0, 0, 0, 0));
  const konumlar = await prisma.courierLocation.findMany({ where: { courierId, zaman: { gte: baslangic } }, orderBy: { zaman: "asc" }, take: 500, select: { lat: true, lng: true, zaman: true } });
  return NextResponse.json({ rotaId: rota?.id ?? null, konumlar: konumlar.map((k) => [k.lat, k.lng, k.zaman.getTime()]) });
}
