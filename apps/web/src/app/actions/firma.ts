"use server";
import { revalidatePath } from "next/cache";
import { oturumGerekli, sifreHashle } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gonderileriAta } from "@/lib/campaign";
import { denetimKaydi } from "@/lib/audit";
import { telefonNormalize } from "@dagitim/excel";

export async function ata(shipmentIds: string[], courierId: string | null): Promise<{ adet?: number; hata?: string }> {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI", "ODA_ADMIN"]);
  try {
    const adet = await gonderileriAta(shipmentIds, courierId, o);
    return { adet };
  } catch (e) {
    return { hata: String((e as Error).message ?? e) };
  }
}

export async function kuryeEkle(form: FormData): Promise<void> {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI"]);
  const telefon = telefonNormalize(String(form.get("telefon")));
  if (!telefon) throw new Error("Telefon geçersiz");
  const u = await prisma.user.create({
    data: { rol: "KURYE", adSoyad: String(form.get("adSoyad")), telefon, pinHash: await sifreHashle(String(form.get("pin"))), courierCompanyId: o.companyId },
  });
  await denetimKaydi(o.sub, "KURYE_EKLE", "User", u.id);
  revalidatePath("/firma/kuryeler");
}

export async function kuryePinSifirla(userId: string, pin: string) {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI"]);
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u || u.courierCompanyId !== o.companyId) throw new Error("Yetkisiz");
  await prisma.user.update({ where: { id: userId }, data: { pinHash: await sifreHashle(pin) } });
  await denetimKaydi(o.sub, "KURYE_PIN", "User", userId);
  revalidatePath("/firma/kuryeler");
}

export async function kuryeAktiflik(userId: string, aktif: boolean) {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI"]);
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u || u.courierCompanyId !== o.companyId) throw new Error("Yetkisiz");
  await prisma.user.update({ where: { id: userId }, data: { aktif } });
  revalidatePath("/firma/kuryeler");
}
