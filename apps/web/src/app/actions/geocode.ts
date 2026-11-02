"use server";
import { revalidatePath } from "next/cache";
import { oturumGerekli } from "@/lib/auth";
import { geocodeTetikle, geocodeOzeti, geocodeCalisiyor } from "@/lib/geocode/kuyruk";
import { geocodeSaglayiciAdi } from "@/lib/geocode";
import { denetimKaydi } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { uyarilariGetir } from "@/lib/uyarilar";
import { rotaOzetiHesapla } from "@/lib/bakim";
import { yayinla } from "@/lib/notify";

export async function geocodeBaslat(): Promise<{ hata?: string }> {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  try {
    geocodeSaglayiciAdi();
    geocodeTetikle();
    await denetimKaydi(o.sub, "GEOCODE_BASLAT", "MemberAddress", null);
    revalidatePath("/admin/uyeler");
    return {};
  } catch (e) { return { hata: (e as Error).message }; }
}

export async function geocodeDurum() {
  await oturumGerekli(["ODA_ADMIN"]);
  return { ...(await geocodeOzeti()), calisiyor: geocodeCalisiyor(), saglayici: geocodeSaglayiciAdi() };
}

/** Geocode denemesi başarısız adresleri yeniden kuyruğa al */
export async function geocodeBasarisizlariSifirla(): Promise<number> {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const r = await prisma.memberAddress.updateMany({ where: { gecerlilikBitis: null, geoLat: null, geocodeDenemesi: { gte: 3 } }, data: { geocodeDenemesi: 0, geocodeHata: null } });
  await prisma.geocodeCache.deleteMany({ where: { lat: null } });
  await denetimKaydi(o.sub, "GEOCODE_SIFIRLA", "MemberAddress", null, { adet: r.count });
  revalidatePath("/admin/uyeler");
  return r.count;
}

export async function uyariIncelendi(tur: string, anahtar: string) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  await prisma.uyariIsareti.upsert({ where: { tur_anahtar: { tur, anahtar } }, update: {}, create: { tur, anahtar, userId: o.sub } });
  await denetimKaydi(o.sub, "UYARI_INCELENDI", tur, anahtar);
  revalidatePath("/admin/uyarilar");
}

export async function uyarilariTopluIncele() {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const liste = await uyarilariGetir();
  for (const u of liste) await prisma.uyariIsareti.upsert({ where: { tur_anahtar: { tur: u.tur, anahtar: u.anahtar } }, update: {}, create: { tur: u.tur, anahtar: u.anahtar, userId: o.sub } });
  revalidatePath("/admin/uyarilar");
}

export async function rotayiKapat(routeId: string) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const r = await prisma.route.findUnique({ where: { id: routeId }, include: { courier: true } });
  if (!r || r.bitis) return;
  await rotaOzetiHesapla(routeId, true);
  await prisma.shipment.updateMany({ where: { assignedCourierId: r.courierId, durum: "YOLDA" }, data: { durum: "ATANDI", sonDurumAt: new Date() } });
  await yayinla("route", { tip: "bitis", courierId: r.courierId, ad: r.courier.adSoyad, companyId: r.courier.courierCompanyId, campaignId: r.campaignId });
  await denetimKaydi(o.sub, "ROTA_KAPAT_ADMIN", "Route", routeId);
  revalidatePath("/admin/uyarilar");
  revalidatePath("/admin/rotalar");
}
