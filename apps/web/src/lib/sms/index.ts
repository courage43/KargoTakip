import { prisma } from "../db";
import type { SmsSaglayici } from "./types";
import { sahteSaglayici } from "./sahte";
import { netgsmSaglayici } from "./netgsm";

export * from "./types";
export { netgsmYanitAyristir, netgsmRaporAyristir, NETGSM_KODLAR } from "./netgsm";

export function saglayiciAdi(): string {
  return (process.env.SMS_SAGLAYICI ?? "sahte").toLowerCase();
}

export function saglayiciAl(): SmsSaglayici {
  if (saglayiciAdi() === "netgsm") {
    const u = process.env.NETGSM_USERCODE, p = process.env.NETGSM_PASSWORD;
    if (!u || !p) throw new Error("NETGSM_USERCODE / NETGSM_PASSWORD tanımlı değil");
    return netgsmSaglayici(u, p);
  }
  return sahteSaglayici;
}

export interface SablonDegiskenleri { ODA: string; TARIH: string; LINK: string; UNVAN: string }

export function sablonDoldur(sablon: string, d: SablonDegiskenleri): string {
  return sablon.replace(/\{(ODA|TARIH|LINK|UNVAN)\}/g, (_, k: keyof SablonDegiskenleri) => d[k] ?? "").replace(/\s+/g, " ").trim();
}

export function linkUret(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/t/${token}`;
}

/** SMS parça sayısı: Türkçe karakter varsa 155, yoksa (GSM-7) 160 karakter; çok parçalıda 70/153 yerine Netgsm TR tarifesi varsayımıyla 155/149 */
export function mesajUzunluk(mesaj: string): { karakter: number; turkce: boolean; parca: number } {
  const turkce = /[çğıöşüÇĞİÖŞÜ]/.test(mesaj);
  const karakter = mesaj.length;
  const tek = turkce ? 155 : 160, coklu = turkce ? 149 : 153;
  const parca = karakter <= tek ? 1 : Math.ceil(karakter / coklu);
  return { karakter, turkce, parca };
}

export function tarihAraligi(b?: Date | null, e?: Date | null): string {
  const f = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  if (b && e) return `${f(b)} - ${f(e)}`;
  if (b) return `${f(b)} itibarıyla`;
  return "önümüzdeki günlerde";
}

export async function smsAyarlari() {
  const s = await prisma.setting.findMany({ where: { key: { in: ["ODA_ADI", "SMS_BASLIK", "SMS_KURYE_YOLDA", "SMS_SABLON_VARSAYILAN", "SMS_SABLON_YOLDA", "SMS_BIRIM_FIYAT"] } } });
  const m = Object.fromEntries(s.map((x) => [x.key, x.value]));
  return {
    odaAdi: m.ODA_ADI ?? "Oda",
    baslik: m.SMS_BASLIK ?? "",
    kuryeYolda: m.SMS_KURYE_YOLDA === "1",
    sablonTercih: m.SMS_SABLON_VARSAYILAN ?? "{ODA} zarfınız {TARIH} kurye ile teslim edilecektir. Teslimat tercihinizi bildirmek için: {LINK}",
    sablonYolda: m.SMS_SABLON_YOLDA ?? "{ODA} zarfınız bugün kurye ile teslim edilecektir. Tercihinizi güncellemek için: {LINK}",
    birimFiyat: Number(m.SMS_BIRIM_FIYAT ?? "0") || 0,
  };
}
