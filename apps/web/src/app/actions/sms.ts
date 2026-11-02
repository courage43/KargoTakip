"use server";
import { revalidatePath } from "next/cache";
import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { kampanyaSmsKuyrukla, isleyiciTetikle, hatalilariYenidenKuyrukla, raporlariGuncelle } from "@/lib/sms/kuyruk";
import { saglayiciAl, sablonDoldur, linkUret, smsAyarlari, tarihAraligi } from "@/lib/sms";
import { denetimKaydi } from "@/lib/audit";
import { telefonNormalize } from "@dagitim/excel";

export async function kampanyaSmsGonder(campaignId: string, sablon: "TERCIH" | "YOLDA"): Promise<{ kuyruklanan: number; telefonsuz: number; hata?: string }> {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  try {
    const r = await kampanyaSmsKuyrukla(campaignId, sablon);
    isleyiciTetikle();
    await denetimKaydi(o.sub, "SMS_KUYRUKLA", "Campaign", campaignId, { sablon, ...r });
    revalidatePath(`/admin/dagitimlar/${campaignId}`);
    return { kuyruklanan: r.kuyruklanan, telefonsuz: r.telefonsuz };
  } catch (e) {
    return { kuyruklanan: 0, telefonsuz: 0, hata: (e as Error).message };
  }
}

export async function hataliSmsYenidenKuyrukla(campaignId: string): Promise<number> {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const n = await hatalilariYenidenKuyrukla(campaignId);
  isleyiciTetikle();
  await denetimKaydi(o.sub, "SMS_YENIDEN", "Campaign", campaignId, { adet: n });
  revalidatePath(`/admin/dagitimlar/${campaignId}/sms`);
  return n;
}

export async function smsRaporGuncelle(campaignId: string): Promise<number> {
  await oturumGerekli(["ODA_ADMIN"]);
  isleyiciTetikle();
  const n = await raporlariGuncelle();
  revalidatePath(`/admin/dagitimlar/${campaignId}`);
  return n;
}

export async function testSmsGonder(telefonHam: string): Promise<{ ok: boolean; mesaj: string }> {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const telefon = telefonNormalize(telefonHam);
  if (!telefon || !telefon.startsWith("5")) return { ok: false, mesaj: "Geçerli bir cep telefonu girin" };
  try {
    const ayar = await smsAyarlari();
    const s = saglayiciAl();
    const mesaj = sablonDoldur(ayar.sablonTercih, { ODA: ayar.odaAdi, TARIH: tarihAraligi(new Date(), new Date(Date.now() + 7 * 86400000)), LINK: linkUret("TEST"), UNVAN: "Test Firma" });
    const r = await s.gonder({ telefon, mesaj, baslik: ayar.baslik || "TEST" });
    await prisma.smsLog.create({ data: { telefon, sablon: "TEST", mesaj, saglayici: s.ad, saglayiciMesajId: r.saglayiciMesajId, durum: r.durum, hata: r.hata, gonderimZamani: new Date() } });
    await denetimKaydi(o.sub, "SMS_TEST", "SmsLog", null, { telefon, durum: r.durum });
    return r.durum === "GONDERILDI" ? { ok: true, mesaj: `Gönderildi (${s.ad}${r.saglayiciMesajId ? `, id ${r.saglayiciMesajId}` : ""})` } : { ok: false, mesaj: r.hata ?? "Hata" };
  } catch (e) {
    return { ok: false, mesaj: (e as Error).message };
  }
}

export async function smsAyarKaydet(form: FormData) {
  await oturumGerekli(["ODA_ADMIN"]);
  const anahtarlar = ["SMS_BASLIK", "SMS_SABLON_VARSAYILAN", "SMS_SABLON_YOLDA", "SMS_BIRIM_FIYAT"];
  for (const key of anahtarlar) {
    const v = form.get(key);
    if (v != null) await prisma.setting.upsert({ where: { key }, update: { value: String(v) }, create: { key, value: String(v) } });
  }
  const yolda = form.get("SMS_KURYE_YOLDA") ? "1" : "0";
  await prisma.setting.upsert({ where: { key: "SMS_KURYE_YOLDA" }, update: { value: yolda }, create: { key: "SMS_KURYE_YOLDA", value: yolda } });
  revalidatePath("/admin/ayarlar");
}
