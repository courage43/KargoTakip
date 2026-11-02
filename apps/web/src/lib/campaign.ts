import { randomBytes } from "node:crypto";
import { prisma, type Prisma } from "./db";
import { exceliOku, satirlariAyristir, type SutunEslemesi } from "@dagitim/excel";
import { dosyaOku } from "./storage";
import { denetimKaydi } from "./audit";
import { yayinla } from "./notify";

const tokenUret = () => randomBytes(16).toString("base64url");

export interface DagitimListesiSonucu {
  olusturulan: number;
  zatenVar: number;
  eslesmeyen: { satirNo: number; sicilNo: string; unvan?: string | null }[];
  adressiz: { sicilNo: string; unvan: string }[];
}

/** Dağıtım Excel'ini kampanyaya bağla: her satır için Shipment üret */
export async function dagitimListesiniIsle(batchId: string, esleme: SutunEslemesi[], userId: string): Promise<DagitimListesiSonucu> {
  const batch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batchId }, include: { campaign: true } });
  if (!batch.campaign) throw new Error("Yükleme bir dağıtıma bağlı değil");
  const dosya = await dosyaOku(batch.dosyaYolu!);
  if (!dosya) throw new Error("Dosya bulunamadı");
  await prisma.importBatch.update({ where: { id: batchId }, data: { durum: "ISLENIYOR", esleme: esleme as unknown as Prisma.InputJsonValue } });

  const tablo = exceliOku(dosya.veri);
  const ayr = satirlariAyristir(tablo, esleme);
  const sonuc: DagitimListesiSonucu = { olusturulan: 0, zatenVar: 0, eslesmeyen: [], adressiz: [] };

  const siciller = [...new Set(ayr.satirlar.map((s) => s.sicilNo))];
  const uyeler = await prisma.member.findMany({
    where: { sicilNo: { in: siciller } },
    include: { addresses: { where: { gecerlilikBitis: null } } },
  });
  const uyeMap = new Map(uyeler.map((u) => [u.sicilNo, u]));
  const mevcutGonderiler = await prisma.shipment.findMany({ where: { campaignId: batch.campaignId! }, select: { memberId: true } });
  const zaten = new Set(mevcutGonderiler.map((g) => g.memberId));

  const veriler: Prisma.ShipmentCreateManyInput[] = [];
  const islenen = new Set<string>();
  for (const s of ayr.satirlar) {
    if (islenen.has(s.sicilNo)) continue;
    islenen.add(s.sicilNo);
    const u = uyeMap.get(s.sicilNo);
    if (!u) { sonuc.eslesmeyen.push({ satirNo: s.satirNo, sicilNo: s.sicilNo, unvan: s.alanlar.unvan }); continue; }
    if (zaten.has(u.id)) { sonuc.zatenVar++; continue; }
    // Adres seçimi: Excel'de adres tipi varsa ona göre, yoksa primary, yoksa ilk
    let adres = s.alanlar.adresTipi ? u.addresses.find((a) => (a.adresTipi ?? "").toLowerCase() === s.alanlar.adresTipi!.toLowerCase()) : undefined;
    adres ??= u.addresses.find((a) => a.isPrimary) ?? u.addresses[0];
    if (!adres) { sonuc.adressiz.push({ sicilNo: u.sicilNo, unvan: u.unvan }); continue; }
    veriler.push({
      campaignId: batch.campaignId!, memberId: u.id, memberAddressId: adres.id,
      courierCompanyId: batch.campaign.courierCompanyId, token: tokenUret(),
    });
  }
  for (let i = 0; i < veriler.length; i += 500) {
    const r = await prisma.shipment.createMany({ data: veriler.slice(i, i + 500), skipDuplicates: true });
    sonuc.olusturulan += r.count;
  }
  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      durum: "TAMAMLANDI", bitisZamani: new Date(), eklenen: sonuc.olusturulan, eslesmeyen: sonuc.eslesmeyen.length,
      hataRaporu: { eslesmeyen: sonuc.eslesmeyen, adressiz: sonuc.adressiz, zatenVar: sonuc.zatenVar, hatalar: ayr.hatalar } as unknown as Prisma.InputJsonValue,
    },
  });
  await denetimKaydi(userId, "DAGITIM_LISTESI_YUKLENDI", "Campaign", batch.campaignId, { olusturulan: sonuc.olusturulan, eslesmeyen: sonuc.eslesmeyen.length });
  await yayinla("campaign", { campaignId: batch.campaignId });
  return sonuc;
}

/** Kurye firması yöneticisi: toplu atama / atama kaldırma */
export async function gonderileriAta(shipmentIds: string[], courierId: string | null, oturum: { sub: string; companyId: string | null; rol: string }) {
  const where: Prisma.ShipmentWhereInput = { id: { in: shipmentIds } };
  if (oturum.rol === "KURYE_FIRMA_YONETICI") where.courierCompanyId = oturum.companyId;
  if (courierId) {
    const kurye = await prisma.user.findUnique({ where: { id: courierId } });
    if (!kurye || kurye.rol !== "KURYE") throw new Error("Kurye bulunamadı");
    if (oturum.rol === "KURYE_FIRMA_YONETICI" && kurye.courierCompanyId !== oturum.companyId) throw new Error("Bu kurye sizin firmanızda değil");
  }
  // Yalnızca açık gönderiler yeniden atanır
  where.durum = { in: ["BEKLIYOR", "ATANDI", "YOLDA"] };
  const r = await prisma.shipment.updateMany({
    where,
    data: courierId
      ? { assignedCourierId: courierId, durum: "ATANDI", atamaTarihi: new Date(), sonDurumAt: new Date() }
      : { assignedCourierId: null, durum: "BEKLIYOR", atamaTarihi: null, sonDurumAt: new Date() },
  });
  await denetimKaydi(oturum.sub, courierId ? "ATAMA" : "ATAMA_KALDIR", "Shipment", null, { adet: r.count, courierId, shipmentIds: shipmentIds.slice(0, 50) });
  await yayinla("shipment", { tip: "atama", courierId, adet: r.count, shipmentIds: shipmentIds.slice(0, 200) });
  return r.count;
}

export async function kampanyaOzeti(campaignId: string) {
  const grup = await prisma.shipment.groupBy({ by: ["durum"], where: { campaignId }, _count: { _all: true } });
  const ozet: Record<string, number> = {};
  let toplam = 0;
  for (const g of grup) { ozet[g.durum] = g._count._all; toplam += g._count._all; }
  const teslim = (ozet.TESLIM_EDILDI ?? 0) + (ozet.KOMSUYA_BIRAKILDI ?? 0) + (ozet.ISYERINE_BIRAKILDI ?? 0);
  const basarisiz = (ozet.ADRESTE_BULUNAMADI ?? 0) + (ozet.ADRES_HATALI ?? 0) + (ozet.TASINMIS ?? 0);
  const kapali = teslim + (ozet.UYE_ISTEMEDI ?? 0) + (ozet.IADE ?? 0);
  return { ozet, toplam, teslim, basarisiz, kapali, kalan: toplam - kapali };
}
