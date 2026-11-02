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

export interface HakedisSatiri {
  kuryeId: string; kurye: string; gun: string;
  teslim: number; basarisiz: number; deneme: number;
  ilk: Date | null; son: Date | null; rotaKm: number | null;
}

/** Kurye × gün bazlı hakediş: teslim, başarısız, deneme, ilk/son saat, rota km */
export async function kampanyaHakedis(campaignId: string, courierCompanyId?: string | null): Promise<HakedisSatiri[]> {
  const denemeler = await prisma.deliveryAttempt.findMany({
    where: { shipment: { campaignId }, ...(courierCompanyId ? { courier: { courierCompanyId } } : {}) },
    include: { courier: { select: { id: true, adSoyad: true } } },
    orderBy: { sunucuZamani: "asc" },
  });
  const gunAnahtar = (d: Date) => d.toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" });
  const satirlar = new Map<string, HakedisSatiri>();
  for (const d of denemeler) {
    const gun = gunAnahtar(d.sunucuZamani);
    const k = `${d.courierId}|${gun}`;
    const s = satirlar.get(k) ?? { kuryeId: d.courierId, kurye: d.courier.adSoyad, gun, teslim: 0, basarisiz: 0, deneme: 0, ilk: null, son: null, rotaKm: null };
    s.deneme++;
    if (["TESLIM_EDILDI", "KOMSUYA_BIRAKILDI", "ISYERINE_BIRAKILDI"].includes(d.sonuc)) s.teslim++;
    if (["ADRESTE_BULUNAMADI", "ADRES_HATALI", "TASINMIS"].includes(d.sonuc)) s.basarisiz++;
    if (!s.ilk || d.sunucuZamani < s.ilk) s.ilk = d.sunucuZamani;
    if (!s.son || d.sunucuZamani > s.son) s.son = d.sunucuZamani;
    satirlar.set(k, s);
  }
  // Rota km: o gün o kuryenin kapanmış rotalarının toplamı
  const kuryeIds = [...new Set(denemeler.map((d) => d.courierId))];
  if (kuryeIds.length) {
    const rotalar = await prisma.route.findMany({ where: { courierId: { in: kuryeIds }, mesafeM: { not: null } }, select: { courierId: true, baslangic: true, mesafeM: true } });
    for (const r of rotalar) {
      const s = satirlar.get(`${r.courierId}|${gunAnahtar(r.baslangic)}`);
      if (s) s.rotaKm = Math.round(((s.rotaKm ?? 0) + (r.mesafeM ?? 0) / 1000) * 10) / 10;
    }
  }
  return [...satirlar.values()].sort((a, b) => a.kurye.localeCompare(b.kurye, "tr") || a.gun.localeCompare(b.gun));
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
