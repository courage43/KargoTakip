"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { yuklemeBaslat, genelListeyiIsle, adresKarariUygula } from "@/lib/import";
import { dagitimListesiniIsle } from "@/lib/campaign";
import { konumCakismasiCoz, konumDuzelt } from "@/lib/delivery";
import { eslemeDogrula, type SutunEslemesi } from "@dagitim/excel";
import { denetimKaydi } from "@/lib/audit";
import { yayinla } from "@/lib/notify";
import { sifreHashle } from "@/lib/auth";

export async function genelListeYukle(form: FormData) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const dosya = form.get("dosya") as File | null;
  if (!dosya || !dosya.size) throw new Error("Dosya seçilmedi");
  const { batch } = await yuklemeBaslat({ tur: "GENEL_LISTE", dosyaAdi: dosya.name, veri: Buffer.from(await dosya.arrayBuffer()), yukleyenId: o.sub });
  redirect(`/admin/yuklemeler/${batch.id}`);
}

export async function dagitimListesiYukle(form: FormData) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const campaignId = String(form.get("campaignId"));
  const dosya = form.get("dosya") as File | null;
  if (!dosya || !dosya.size) throw new Error("Dosya seçilmedi");
  const { batch } = await yuklemeBaslat({ tur: "DAGITIM_LISTESI", dosyaAdi: dosya.name, veri: Buffer.from(await dosya.arrayBuffer()), yukleyenId: o.sub, campaignId });
  redirect(`/admin/yuklemeler/${batch.id}`);
}

export async function yuklemeyiIsle(batchId: string, esleme: SutunEslemesi[]): Promise<{ hata?: string }> {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const batch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batchId } });
  const hatalar = eslemeDogrula(esleme, batch.tur);
  if (hatalar.length) return { hata: hatalar.join(" ") };
  try {
    if (batch.tur === "GENEL_LISTE") await genelListeyiIsle(batchId, esleme, o.sub);
    else await dagitimListesiniIsle(batchId, esleme, o.sub);
  } catch (e) {
    await prisma.importBatch.update({ where: { id: batchId }, data: { durum: "HATA", hataRaporu: { mesaj: String(e) } } });
    return { hata: `İşleme hatası: ${String(e)}` };
  }
  revalidatePath(`/admin/yuklemeler/${batchId}`);
  return {};
}

export async function adresKarari(talepId: string, karar: "YENI_ADRES" | "AYNI_YER" | "REDDEDILDI") {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  await adresKarariUygula(talepId, karar, o.sub);
  revalidatePath("/admin/adres-degisiklikleri");
}

export async function topluAdresKarari(talepIds: string[], karar: "YENI_ADRES" | "AYNI_YER" | "REDDEDILDI") {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  for (const id of talepIds) await adresKarariUygula(id, karar, o.sub);
  revalidatePath("/admin/adres-degisiklikleri");
}

export async function cakismaCoz(addressId: string, secim: "MEVCUT" | "ADAY") {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  await konumCakismasiCoz(addressId, secim, o.sub);
  revalidatePath("/admin/konum-cakismalari");
}

export async function konumuDuzelt(addressId: string, lat: number, lng: number) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  await konumDuzelt(addressId, lat, lng, o.sub);
  revalidatePath("/admin/uyeler");
}

export async function kuryeNotuKaydet(addressId: string, not: string) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  await prisma.memberAddress.update({ where: { id: addressId }, data: { kuryeNotu: not.trim() || null } });
  await denetimKaydi(o.sub, "KURYE_NOTU", "MemberAddress", addressId, { not });
}

export async function adresElleDegistir(memberId: string, eskiAddressId: string | null, yeniAdres: string) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const eski = eskiAddressId ? await prisma.memberAddress.findUnique({ where: { id: eskiAddressId } }) : null;
  const t = await prisma.addressChangeRequest.create({
    data: { memberId, eskiAddressId, eskiAdres: eski?.adresMetni, yeniAdres, yeniAdresTipi: eski?.adresTipi, kaynak: "ADMIN", eskiKonumVarMi: eski?.konumDurumu === "DOGRULANDI" },
  });
  await adresKarariUygula(t.id, "YENI_ADRES", o.sub);
  revalidatePath(`/admin/uyeler/${memberId}`);
}

export async function kampanyaOlustur(form: FormData) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const k = await prisma.campaign.create({
    data: {
      ad: String(form.get("ad")),
      tur: form.get("tur") === "OZEL" ? "OZEL" : "DONEMSEL",
      planlananBaslangic: form.get("baslangic") ? new Date(String(form.get("baslangic"))) : null,
      planlananBitis: form.get("bitis") ? new Date(String(form.get("bitis"))) : null,
      courierCompanyId: String(form.get("courierCompanyId") || "") || null,
      smsSablonu: String(form.get("smsSablonu") || "") || null,
    },
  });
  await denetimKaydi(o.sub, "KAMPANYA_OLUSTUR", "Campaign", k.id);
  redirect(`/admin/dagitimlar/${k.id}`);
}

export async function kampanyaDurum(campaignId: string, durum: "TASLAK" | "AKTIF" | "TAMAMLANDI") {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  await prisma.campaign.update({ where: { id: campaignId }, data: { durum } });
  if (durum === "AKTIF") {
    // Firma atanmış ama gönderilerde firma boşsa doldur
    const k = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (k?.courierCompanyId) await prisma.shipment.updateMany({ where: { campaignId, courierCompanyId: null }, data: { courierCompanyId: k.courierCompanyId } });
  }
  await denetimKaydi(o.sub, "KAMPANYA_DURUM", "Campaign", campaignId, { durum });
  await yayinla("campaign", { campaignId, durum });
  revalidatePath(`/admin/dagitimlar/${campaignId}`);
}

export async function firmaEkle(form: FormData) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const f = await prisma.courierCompany.create({ data: { ad: String(form.get("ad")), telefon: String(form.get("telefon") || "") || null, eposta: String(form.get("eposta") || "") || null } });
  await denetimKaydi(o.sub, "FIRMA_EKLE", "CourierCompany", f.id);
  revalidatePath("/admin/ayarlar");
}

export async function kullaniciEkle(form: FormData) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const rol = String(form.get("rol")) as "ODA_ADMIN" | "KURYE_FIRMA_YONETICI";
  const u = await prisma.user.create({
    data: {
      rol, adSoyad: String(form.get("adSoyad")), eposta: String(form.get("eposta")).toLowerCase().trim(),
      sifreHash: await sifreHashle(String(form.get("sifre"))),
      courierCompanyId: rol === "KURYE_FIRMA_YONETICI" ? String(form.get("courierCompanyId")) : null,
    },
  });
  await denetimKaydi(o.sub, "KULLANICI_EKLE", "User", u.id, { rol });
  revalidatePath("/admin/ayarlar");
}

export async function kullaniciAktiflik(userId: string, aktif: boolean) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  await prisma.user.update({ where: { id: userId }, data: { aktif } });
  await denetimKaydi(o.sub, "KULLANICI_AKTIFLIK", "User", userId, { aktif });
  revalidatePath("/admin/ayarlar");
}

export async function ayarKaydet(form: FormData) {
  await oturumGerekli(["ODA_ADMIN"]);
  for (const key of ["ODA_ADI", "SMS_SABLON_VARSAYILAN", "NAVIGASYON"]) {
    const v = form.get(key);
    if (v != null) await prisma.setting.upsert({ where: { key }, update: { value: String(v) }, create: { key, value: String(v) } });
  }
  revalidatePath("/admin/ayarlar");
}

export async function gonderiDurumElle(shipmentId: string, durum: "UYE_ISTEMEDI" | "IADE" | "BEKLIYOR") {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  await prisma.shipment.update({ where: { id: shipmentId }, data: { durum, sonDurumAt: new Date(), ...(durum === "BEKLIYOR" ? { assignedCourierId: null } : {}) } });
  await denetimKaydi(o.sub, "GONDERI_DURUM_ELLE", "Shipment", shipmentId, { durum });
  await yayinla("shipment", { tip: "elle", shipmentId });
  revalidatePath(`/admin/gonderiler/${shipmentId}`);
}
