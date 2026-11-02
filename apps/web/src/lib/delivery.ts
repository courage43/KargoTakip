import { prisma } from "./db";
import { mesafeM, KONUM_CAKISMA_ESIGI_M, TESLIM_SONUCLARI, type TeslimatDenemesiInput } from "@dagitim/shared";
import { yayinla } from "./notify";
import { denetimKaydi } from "./audit";

/**
 * Kurye teslimat denemesini kaydet; gönderi durumunu güncelle; konum kaydet kuralını uygula.
 * Çevrimdışı tekrar gönderimler istemciId ile tekilleştirilir.
 */
export async function denemeKaydet(input: TeslimatDenemesiInput, courierId: string) {
  const mevcut = await prisma.deliveryAttempt.findUnique({ where: { istemciId: input.istemciId } });
  if (mevcut) return { attempt: mevcut, tekrar: true as const };

  const g = await prisma.shipment.findUnique({ where: { id: input.shipmentId }, include: { memberAddress: true } });
  if (!g) throw new Error("Gönderi bulunamadı");
  if (g.assignedCourierId !== courierId) throw new Error("Bu gönderi size atanmamış");

  const adres = g.memberAddress;
  let adresMesafesiM: number | null = null;
  if (input.lat != null && input.lng != null && adres.geoLat != null && adres.geoLng != null) {
    adresMesafesiM = Math.round(mesafeM(input.lat, input.lng, adres.geoLat, adres.geoLng));
  }

  let konumSonucu: "KAYDEDILDI" | "CAKISMA" | "ATLANDI" = "ATLANDI";
  const sonuc = await prisma.$transaction(async (tx) => {
    const attempt = await tx.deliveryAttempt.create({
      data: {
        shipmentId: g.id, courierId, sonuc: input.sonuc,
        lat: input.lat ?? null, lng: input.lng ?? null, accuracyM: input.accuracyM ?? null, adresMesafesiM,
        fotoUrls: input.fotoUrls, imzaUrl: input.imzaUrl ?? null,
        teslimAlanAdi: input.teslimAlanAdi ?? null, teslimAlanIliskisi: input.teslimAlanIliskisi ?? null,
        not: input.not ?? null, konumKaydet: input.konumKaydet, offlineOlusturuldu: input.offlineOlusturuldu,
        istemciId: input.istemciId, cihazZamani: new Date(input.cihazZamani),
      },
    });

    // Konum kaydet kuralı
    const konumUygun = input.konumKaydet && input.lat != null && input.lng != null && !["ADRES_HATALI", "TASINMIS"].includes(input.sonuc);
    if (konumUygun) {
      if (adres.konumDurumu === "DOGRULANDI" && adres.geoLat != null && adres.geoLng != null) {
        const uzaklik = mesafeM(input.lat!, input.lng!, adres.geoLat, adres.geoLng);
        if (uzaklik > KONUM_CAKISMA_ESIGI_M) {
          konumSonucu = "CAKISMA";
          await tx.memberAddress.update({
            where: { id: adres.id },
            data: { konumDurumu: "CAKISMA_BEKLIYOR", adayLat: input.lat, adayLng: input.lng, adayAttemptId: attempt.id },
          });
        } else {
          konumSonucu = "KAYDEDILDI";
          // Yakın tekrar doğrulama: ağırlıklı ortalama ile hafifçe iyileştir
          const n = adres.verifiedCount;
          const lat = (adres.geoLat * n + input.lat!) / (n + 1);
          const lng = (adres.geoLng * n + input.lng!) / (n + 1);
          await tx.memberAddress.update({
            where: { id: adres.id },
            data: { geoLat: lat, geoLng: lng, geoAccuracyM: input.accuracyM ?? adres.geoAccuracyM, verifiedCount: n + 1, lastVerifiedAt: new Date() },
          });
        }
      } else {
        konumSonucu = "KAYDEDILDI";
        await tx.memberAddress.update({
          where: { id: adres.id },
          data: {
            geoLat: input.lat, geoLng: input.lng, geoAccuracyM: input.accuracyM ?? null, geoSource: "KURYE_GPS",
            konumDurumu: "DOGRULANDI", verifiedCount: 1, lastVerifiedAt: new Date(), adayLat: null, adayLng: null, adayAttemptId: null,
          },
        });
      }
    }
    if (input.kuryeNotu && input.kuryeNotu.trim()) {
      await tx.memberAddress.update({ where: { id: adres.id }, data: { kuryeNotu: input.kuryeNotu.trim() } });
    }
    await tx.deliveryAttempt.update({ where: { id: attempt.id }, data: { konumSonucu } });

    // Gönderi durumu
    await tx.shipment.update({
      where: { id: g.id },
      data: { durum: input.sonuc, denemeSayisi: { increment: 1 }, sonDenemeAt: new Date(), sonDurumAt: new Date() },
    });

    // Taşınmış → adres değişikliği şüphesi
    if (input.sonuc === "TASINMIS") {
      await tx.addressChangeRequest.create({
        data: {
          memberId: g.memberId, eskiAddressId: adres.id, eskiAdres: adres.adresMetni,
          yeniAdres: input.not?.trim() || "(Kurye: üye bu adresten taşınmış)", kaynak: "KURYE_TASINMIS", shipmentId: g.id,
          eskiKonumVarMi: adres.konumDurumu === "DOGRULANDI",
        },
      });
    }
    return attempt;
  });

  await yayinla("shipment", { tip: "deneme", shipmentId: g.id, campaignId: g.campaignId, courierId, durum: input.sonuc, lat: input.lat, lng: input.lng });
  await denetimKaydi(courierId, "TESLIMAT_DENEMESI", "Shipment", g.id, { sonuc: input.sonuc, konumSonucu, adresMesafesiM });
  return { attempt: sonuc, tekrar: false as const, konumSonucu, teslim: TESLIM_SONUCLARI.includes(input.sonuc) };
}

/** Admin: konum çakışmasını çöz */
export async function konumCakismasiCoz(addressId: string, secim: "MEVCUT" | "ADAY" | { lat: number; lng: number }, userId: string) {
  const a = await prisma.memberAddress.findUniqueOrThrow({ where: { id: addressId } });
  let lat = a.geoLat, lng = a.geoLng, source = a.geoSource;
  if (secim === "ADAY") { lat = a.adayLat; lng = a.adayLng; source = "KURYE_GPS"; }
  else if (typeof secim === "object") { lat = secim.lat; lng = secim.lng; source = "ADMIN_DUZELTME"; }
  await prisma.memberAddress.update({
    where: { id: addressId },
    data: { geoLat: lat, geoLng: lng, geoSource: source, konumDurumu: lat != null ? "DOGRULANDI" : "YOK", adayLat: null, adayLng: null, adayAttemptId: null, verifiedCount: secim === "MEVCUT" ? a.verifiedCount : 1, lastVerifiedAt: new Date() },
  });
  await denetimKaydi(userId, "KONUM_CAKISMASI_COZULDU", "MemberAddress", addressId, { secim });
}

/** Admin: haritada sürükleyerek konum düzeltme */
export async function konumDuzelt(addressId: string, lat: number, lng: number, userId: string) {
  await prisma.memberAddress.update({
    where: { id: addressId },
    data: { geoLat: lat, geoLng: lng, geoSource: "ADMIN_DUZELTME", konumDurumu: "DOGRULANDI", verifiedCount: 1, lastVerifiedAt: new Date(), adayLat: null, adayLng: null, adayAttemptId: null },
  });
  await denetimKaydi(userId, "KONUM_DUZELTME", "MemberAddress", addressId, { lat, lng });
}
