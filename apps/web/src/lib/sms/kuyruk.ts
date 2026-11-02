import { prisma, type Prisma } from "../db";
import { saglayiciAl, sablonDoldur, linkUret, mesajUzunluk, smsAyarlari, tarihAraligi } from "./index";
import { cepTelefonuMu } from "@dagitim/excel";
import { yayinla } from "../notify";

export type SablonAdi = "TERCIH" | "YOLDA" | "TEST";

export interface KuyruklamaSonucu { kuyruklanan: number; telefonsuz: number; zatenVar: number; atlanan: number }

/**
 * Kampanyadaki gönderiler için SMS kuyrukla. Gönderi + şablon başına tek kayıt (idempotent).
 * Kapanmış gönderiler (teslim, üye istemedi, iade) atlanır.
 */
export async function kampanyaSmsKuyrukla(campaignId: string, sablonAdi: "TERCIH" | "YOLDA", filtre: { courierId?: string } = {}): Promise<KuyruklamaSonucu> {
  const [k, ayar] = await Promise.all([prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }), smsAyarlari()]);
  const sablon = sablonAdi === "TERCIH" ? (k.smsSablonu || ayar.sablonTercih) : (k.smsYoldaSablonu || ayar.sablonYolda);
  const where: Prisma.ShipmentWhereInput = {
    campaignId,
    durum: { in: sablonAdi === "TERCIH" ? [...TERCIH_UYGUN_DURUMLAR] : ["ATANDI", "YOLDA"] },
    ...(filtre.courierId ? { assignedCourierId: filtre.courierId } : {}),
    smsLoglari: { none: { sablon: sablonAdi } },
  };
  const gonderiler = await prisma.shipment.findMany({ where, include: { member: { select: { unvan: true, cepTelefonu: true } } } });
  const sonuc: KuyruklamaSonucu = { kuyruklanan: 0, telefonsuz: 0, zatenVar: 0, atlanan: 0 };
  const veriler: Prisma.SmsLogCreateManyInput[] = [];
  for (const g of gonderiler) {
    const tel = g.member.cepTelefonu;
    if (!tel || !cepTelefonuMu(tel)) { sonuc.telefonsuz++; continue; }
    const mesaj = sablonDoldur(sablon, { ODA: ayar.odaAdi, TARIH: tarihAraligi(k.planlananBaslangic, k.planlananBitis), LINK: linkUret(g.token), UNVAN: g.member.unvan });
    veriler.push({ shipmentId: g.id, campaignId, telefon: tel, sablon: sablonAdi, mesaj, parcaSayisi: mesajUzunluk(mesaj).parca });
  }
  for (let i = 0; i < veriler.length; i += 500) sonuc.kuyruklanan += (await prisma.smsLog.createMany({ data: veriler.slice(i, i + 500) })).count;
  if (sablonAdi === "TERCIH" && sonuc.kuyruklanan) await prisma.campaign.update({ where: { id: campaignId }, data: { smsGonderildi: true } });
  return sonuc;
}

let isleyiciCalisiyor = false;

/** Kuyruktaki SMS'leri gönder. Satır kilidi ile çoklu işleyiciye dayanıklı. Gönderilen sayıyı döner. */
export async function kuyruguIsle(limit = 100): Promise<number> {
  const ayar = await smsAyarlari();
  const saglayici = saglayiciAl();
  if (saglayici.ad !== "sahte" && !ayar.baslik) throw new Error("SMS başlığı (gönderici adı) Ayarlar'da tanımlı değil");
  // Satırları kilitle ve ISLENIYOR benzeri işaret için gonderimZamani yaz (ayrı durum eklemeden)
  const satirlar = await prisma.$transaction(async (tx) => {
    const ids = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "SmsLog" WHERE durum = 'KUYRUKTA' AND "gonderimZamani" IS NULL ORDER BY "createdAt" LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
    if (!ids.length) return [];
    await tx.smsLog.updateMany({ where: { id: { in: ids.map((x) => x.id) } }, data: { gonderimZamani: new Date() } });
    return tx.smsLog.findMany({ where: { id: { in: ids.map((x) => x.id) } } });
  });
  let gonderilen = 0;
  const ESZAMANLI = 5;
  for (let i = 0; i < satirlar.length; i += ESZAMANLI) {
    await Promise.all(satirlar.slice(i, i + ESZAMANLI).map(async (s) => {
      const r = await saglayici.gonder({ telefon: s.telefon, mesaj: s.mesaj, baslik: ayar.baslik || "TEST" });
      await prisma.smsLog.update({ where: { id: s.id }, data: { durum: r.durum, saglayici: saglayici.ad, saglayiciMesajId: r.saglayiciMesajId ?? null, hata: r.hata ?? null, gonderimZamani: new Date() } });
      if (r.durum === "GONDERILDI") gonderilen++;
    }));
  }
  if (satirlar.length) await yayinla("campaign", { tip: "sms", adet: satirlar.length });
  return satirlar.length;
}

/** Arka planda kuyruk boşalana kadar işle (server action tetikler). */
export function isleyiciTetikle() {
  if (isleyiciCalisiyor) return;
  isleyiciCalisiyor = true;
  setImmediate(async () => {
    try {
      for (let tur = 0; tur < 200; tur++) {
        const n = await kuyruguIsle(100);
        if (n === 0) break;
      }
    } catch (e) {
      console.error("SMS işleyici hatası", e);
    } finally {
      isleyiciCalisiyor = false;
    }
  });
}

/** Sağlayıcıdan teslim raporlarını çek (son 48 saat, GONDERILDI durumundakiler). */
export async function raporlariGuncelle(): Promise<number> {
  const saglayici = saglayiciAl();
  if (!saglayici.raporSorgula) return 0;
  const since = new Date(Date.now() - 48 * 3600 * 1000);
  const bekleyen = await prisma.smsLog.findMany({ where: { durum: "GONDERILDI", saglayici: saglayici.ad, saglayiciMesajId: { not: null }, gonderimZamani: { gte: since } }, take: 200, orderBy: { gonderimZamani: "asc" } });
  if (!bekleyen.length) return 0;
  const ids = [...new Set(bekleyen.map((b) => b.saglayiciMesajId!))];
  const rapor = await saglayici.raporSorgula(ids);
  let g = 0;
  for (const b of bekleyen) {
    const d = rapor[b.saglayiciMesajId!];
    if (!d || d === "BEKLIYOR") continue;
    await prisma.smsLog.update({ where: { id: b.id }, data: { durum: d, raporZamani: new Date(), ...(d === "HATA" ? { hata: b.hata ?? "Operatör raporu: iletilemedi" } : {}) } });
    g++;
  }
  return g;
}

/** Hatalı SMS'leri yeniden kuyruğa al */
export async function hatalilariYenidenKuyrukla(campaignId: string): Promise<number> {
  const r = await prisma.smsLog.updateMany({ where: { campaignId, durum: "HATA" }, data: { durum: "KUYRUKTA", gonderimZamani: null, hata: null, saglayiciMesajId: null } });
  return r.count;
}

export const TERCIH_UYGUN_DURUMLAR = ["BEKLIYOR", "ATANDI", "YOLDA", "ADRESTE_BULUNAMADI", "ADRES_HATALI"] as const;

export async function kampanyaSmsOzeti(campaignId: string) {
  const [grup, telefonlu, telefonsuz, uygunTercih] = await Promise.all([
    prisma.smsLog.groupBy({ by: ["durum", "sablon"], where: { campaignId }, _count: { _all: true }, _sum: { parcaSayisi: true } }),
    prisma.shipment.count({ where: { campaignId, member: { cepTelefonu: { startsWith: "5" } } } }),
    prisma.shipment.count({ where: { campaignId, OR: [{ member: { cepTelefonu: null } }, { member: { NOT: { cepTelefonu: { startsWith: "5" } } } }] } }),
    prisma.shipment.count({ where: { campaignId, durum: { in: [...TERCIH_UYGUN_DURUMLAR] }, member: { cepTelefonu: { startsWith: "5" } }, smsLoglari: { none: { sablon: "TERCIH" } } } }),
  ]);
  const ozet: Record<string, Record<string, number>> = {};
  let toplamParca = 0;
  for (const g of grup) { ozet[g.sablon] ??= {}; ozet[g.sablon][g.durum] = g._count._all; toplamParca += g._sum.parcaSayisi ?? 0; }
  return { ozet, telefonlu, telefonsuz, toplamParca, uygunTercih };
}
