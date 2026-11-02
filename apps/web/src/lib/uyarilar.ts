import { prisma } from "./db";
import { mesafeM, HAREKETSIZ_DK, UZUN_ROTA_SAAT, UZAK_TESLIM_ESIGI_M, HIZLI_DENEME_SN, HIZLI_DENEME_M } from "@dagitim/shared";

export type UyariTuru = "HAREKETSIZ" | "UZUN_ROTA" | "UZAK_TESLIM" | "GPSSIZ" | "HIZLI";

export interface Uyari {
  tur: UyariTuru;
  anahtar: string;          // tekilleştirme: routeId veya attemptId
  zaman: Date;
  kuryeId: string;
  kuryeAd: string;
  firmaId?: string | null;
  aciklama: string;
  shipmentId?: string;
  routeId?: string;
  deger?: number;
}

export interface UyariGirdisi {
  simdi: Date;
  rotalar: { id: string; courierId: string; kuryeAd: string; firmaId: string | null; baslangic: Date; sonKonum: Date | null }[];
  denemeler: { id: string; shipmentId: string; courierId: string; kuryeAd: string; firmaId: string | null; sonuc: string; lat: number | null; lng: number | null; adresMesafesiM: number | null; konumDurumu: string; sunucuZamani: Date }[];
}

/** Saf hesaplama: veriyi alır, uyarı listesi üretir (birim test edilebilir) */
export function uyarilariHesapla(g: UyariGirdisi): Uyari[] {
  const u: Uyari[] = [];
  for (const r of g.rotalar) {
    const acikDk = (g.simdi.getTime() - r.baslangic.getTime()) / 60000;
    if (acikDk > UZUN_ROTA_SAAT * 60) {
      u.push({ tur: "UZUN_ROTA", anahtar: r.id, zaman: r.baslangic, kuryeId: r.courierId, kuryeAd: r.kuryeAd, firmaId: r.firmaId, routeId: r.id, deger: Math.round(acikDk / 60), aciklama: `Rota ${Math.round(acikDk / 60)} saattir açık; kurye kapatmayı unutmuş olabilir.` });
    }
    const sonDk = r.sonKonum ? (g.simdi.getTime() - r.sonKonum.getTime()) / 60000 : acikDk;
    const hareketsiz = r.sonKonum ? sonDk > HAREKETSIZ_DK : acikDk > 15;
    if (hareketsiz) {
      u.push({ tur: "HAREKETSIZ", anahtar: r.id, zaman: r.sonKonum ?? r.baslangic, kuryeId: r.courierId, kuryeAd: r.kuryeAd, firmaId: r.firmaId, routeId: r.id, deger: Math.round(sonDk), aciklama: r.sonKonum ? `${Math.round(sonDk)} dk'dır konum gelmiyor (uygulama kapalı veya kurye duruyor).` : "Rota açık ama hiç konum gelmedi (konum izni verilmemiş olabilir)." });
    }
  }
  const teslimSonuclari = ["TESLIM_EDILDI", "KOMSUYA_BIRAKILDI", "ISYERINE_BIRAKILDI"];
  for (const d of g.denemeler) {
    if (d.lat == null) {
      u.push({ tur: "GPSSIZ", anahtar: d.id, zaman: d.sunucuZamani, kuryeId: d.courierId, kuryeAd: d.kuryeAd, firmaId: d.firmaId, shipmentId: d.shipmentId, aciklama: "Teslimat kaydı GPS olmadan girildi; adrese gidildiği doğrulanamıyor." });
    } else if (d.adresMesafesiM != null && d.adresMesafesiM > UZAK_TESLIM_ESIGI_M && ["DOGRULANDI", "CAKISMA_BEKLIYOR"].includes(d.konumDurumu) && teslimSonuclari.includes(d.sonuc)) {
      // CAKISMA_BEKLIYOR da sayılır: çakışma yalnızca doğrulanmış bir adreste oluşur
      u.push({ tur: "UZAK_TESLIM", anahtar: d.id, zaman: d.sunucuZamani, kuryeId: d.courierId, kuryeAd: d.kuryeAd, firmaId: d.firmaId, shipmentId: d.shipmentId, deger: Math.round(d.adresMesafesiM), aciklama: `"Teslim edildi" doğrulanmış adresten ${Math.round(d.adresMesafesiM)} m uzakta işaretlendi.` });
    }
  }
  // Çok hızlı: aynı kurye, ardışık denemeler
  const kuryeBazli = new Map<string, typeof g.denemeler>();
  for (const d of g.denemeler) { if (d.lat == null) continue; const l = kuryeBazli.get(d.courierId) ?? []; l.push(d); kuryeBazli.set(d.courierId, l); }
  for (const liste of kuryeBazli.values()) {
    liste.sort((a, b) => a.sunucuZamani.getTime() - b.sunucuZamani.getTime());
    for (let i = 1; i < liste.length; i++) {
      const a = liste[i - 1], b = liste[i];
      const sn = (b.sunucuZamani.getTime() - a.sunucuZamani.getTime()) / 1000;
      const m = mesafeM(a.lat!, a.lng!, b.lat!, b.lng!);
      if (sn < HIZLI_DENEME_SN && m > HIZLI_DENEME_M) {
        u.push({ tur: "HIZLI", anahtar: b.id, zaman: b.sunucuZamani, kuryeId: b.courierId, kuryeAd: b.kuryeAd, firmaId: b.firmaId, shipmentId: b.shipmentId, deger: Math.round(m), aciklama: `${Math.round(sn)} sn içinde ${Math.round(m)} m uzaktaki ikinci teslimat; konum veya kayıt şüpheli.` });
      }
    }
  }
  return u.sort((a, b) => b.zaman.getTime() - a.zaman.getTime());
}

/** Veritabanından toplayıp hesapla; incelenmiş olanları düş. firmaId verilirse o firmaya daralt. */
export async function uyarilariGetir(opts: { gun?: number; firmaId?: string | null } = {}): Promise<Uyari[]> {
  const since = new Date(Date.now() - (opts.gun ?? 7) * 86400000);
  const [rotalar, denemeler, isaretler] = await Promise.all([
    prisma.route.findMany({ where: { bitis: null, ...(opts.firmaId ? { courier: { courierCompanyId: opts.firmaId } } : {}) }, include: { courier: { include: { konumlar: { orderBy: { zaman: "desc" }, take: 1 } } } } }),
    prisma.deliveryAttempt.findMany({ where: { sunucuZamani: { gte: since }, ...(opts.firmaId ? { courier: { courierCompanyId: opts.firmaId } } : {}) }, include: { courier: true, shipment: { include: { memberAddress: { select: { konumDurumu: true } } } } } }),
    prisma.uyariIsareti.findMany({ select: { tur: true, anahtar: true } }),
  ]);
  const incelenmis = new Set(isaretler.map((i) => `${i.tur}:${i.anahtar}`));
  const u = uyarilariHesapla({
    simdi: new Date(),
    rotalar: rotalar.map((r) => ({ id: r.id, courierId: r.courierId, kuryeAd: r.courier.adSoyad, firmaId: r.courier.courierCompanyId, baslangic: r.baslangic, sonKonum: r.courier.konumlar[0]?.zaman ?? null })),
    denemeler: denemeler.map((d) => ({ id: d.id, shipmentId: d.shipmentId, courierId: d.courierId, kuryeAd: d.courier.adSoyad, firmaId: d.courier.courierCompanyId, sonuc: d.sonuc, lat: d.lat, lng: d.lng, adresMesafesiM: d.adresMesafesiM, konumDurumu: d.shipment.memberAddress.konumDurumu, sunucuZamani: d.sunucuZamani })),
  });
  return u.filter((x) => !incelenmis.has(`${x.tur}:${x.anahtar}`));
}

export async function uyariSayisi(): Promise<number> {
  return (await uyarilariGetir()).length;
}
