import { prisma, type Prisma } from "./db";
import { exceliOku, otomatikEsle, satirlariAyristir, adresFarki, adresNormalize, ilAyikla, ilceAyikla, type SutunEslemesi, type UyeSatiri } from "@dagitim/excel";
import { dosyaKaydet, dosyaOku } from "./storage";
import { denetimKaydi } from "./audit";

/** Yüklenen dosyayı sakla, başlıkları çıkar, otomatik eşleme öner, taslak batch oluştur */
export async function yuklemeBaslat(opts: {
  tur: "GENEL_LISTE" | "DAGITIM_LISTESI";
  dosyaAdi: string;
  veri: Buffer;
  yukleyenId: string;
  campaignId?: string;
}) {
  const tablo = exceliOku(opts.veri, 5);
  const esleme = otomatikEsle(tablo.basliklar);
  const yol = await dosyaKaydet("yuklemeler", "xlsx", opts.veri);
  const tam = exceliOku(opts.veri);
  const batch = await prisma.importBatch.create({
    data: {
      tur: opts.tur,
      dosyaAdi: opts.dosyaAdi,
      dosyaYolu: yol,
      satirSayisi: tam.satirlar.length,
      esleme: esleme as unknown as Prisma.InputJsonValue,
      yukleyenId: opts.yukleyenId,
      campaignId: opts.campaignId,
    },
  });
  return { batch, basliklar: tablo.basliklar, ornek: tablo.satirlar, esleme };
}

export interface GenelListeSonucu {
  eklenen: number;
  guncellenen: number;
  pasifYapilan: number;
  adresDegisen: number;
  yaziFarki: number;
  hatalar: { satirNo: number; mesaj: string }[];
  uyarilar: { satirNo: number; sicilNo: string; mesaj: string }[];
}

/**
 * Genel üye listesini işle (upsert). Konum verisi asla ezilmez;
 * adres değişimleri AddressChangeRequest'e düşer.
 */
export async function genelListeyiIsle(batchId: string, esleme: SutunEslemesi[], userId: string): Promise<GenelListeSonucu> {
  const batch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batchId } });
  const dosya = await dosyaOku(batch.dosyaYolu!);
  if (!dosya) throw new Error("Yüklenen dosya bulunamadı");
  await prisma.importBatch.update({ where: { id: batchId }, data: { durum: "ISLENIYOR", esleme: esleme as unknown as Prisma.InputJsonValue } });

  const tablo = exceliOku(dosya.veri);
  const ayr = satirlariAyristir(tablo, esleme);
  const sonuc: GenelListeSonucu = { eklenen: 0, guncellenen: 0, pasifYapilan: 0, adresDegisen: 0, yaziFarki: 0, hatalar: ayr.hatalar, uyarilar: [] };
  for (const s of ayr.satirlar) for (const u of s.uyarilar) sonuc.uyarilar.push({ satirNo: s.satirNo, sicilNo: s.sicilNo, mesaj: u });

  // Sicil bazında grupla (aynı sicil, farklı adres tipi → birden fazla adres)
  const gruplar = new Map<string, UyeSatiri[]>();
  for (const s of ayr.satirlar) {
    const g = gruplar.get(s.sicilNo) ?? [];
    g.push(s);
    gruplar.set(s.sicilNo, g);
  }

  const mevcutlar = await prisma.member.findMany({
    where: { sicilNo: { in: [...gruplar.keys()] } },
    include: { addresses: { where: { gecerlilikBitis: null } } },
  });
  const mevcutMap = new Map(mevcutlar.map((m) => [m.sicilNo, m]));
  const gorulenSiciller = new Set<string>();

  // Parça parça işle (5.000 satır için ~100'lük transaction'lar)
  const siciller = [...gruplar.keys()];
  const PARCA = 100;
  for (let i = 0; i < siciller.length; i += PARCA) {
    const parca = siciller.slice(i, i + PARCA);
    await prisma.$transaction(async (tx) => {
      for (const sicilNo of parca) {
        const satirlar = gruplar.get(sicilNo)!;
        const ilk = satirlar[0];
        gorulenSiciller.add(sicilNo);
        const a = ilk.alanlar;
        const uyeVeri = {
          unvan: a.unvan ?? mevcutMap.get(sicilNo)?.unvan ?? `Sicil ${sicilNo}`,
          tabelaUnvani: a.tabelaUnvani ?? undefined,
          yetkiliAdSoyad: a.yetkiliAdSoyad ?? undefined,
          cepTelefonu: a.cepTelefonu ?? undefined,
          isTelefonu: a.isTelefonu ?? undefined,
          eposta: a.eposta ?? undefined,
          meslekGrubu: a.meslekGrubu ?? undefined,
          odaBolgeKodu: a.odaBolgeKodu ?? undefined,
          durumTanimi: a.durumTanimi ?? undefined,
          subeAdi: a.subeAdi ?? undefined,
          rawData: (Object.keys(ilk.raw).length ? ilk.raw : undefined) as Prisma.InputJsonValue | undefined,
          aktif: true,
          lastImportBatchId: batchId,
        };
        let mevcut = mevcutMap.get(sicilNo);
        let memberId: string;
        if (!mevcut) {
          const m = await tx.member.create({ data: { sicilNo, ...uyeVeri } });
          memberId = m.id;
          sonuc.eklenen++;
          // Yeni üye: adresleri doğrudan ekle
          let primary = true;
          for (const s of satirlar) {
            const adres = s.alanlar.adres;
            if (!adres) continue;
            await tx.memberAddress.create({
              data: {
                memberId, adresTipi: s.alanlar.adresTipi ?? null, adresMetni: adres, adresNormalize: s.adresNormalize,
                ilce: s.ilce, il: ilAyikla(adres), isPrimary: primary, konumDurumu: "YOK",
              },
            });
            primary = false;
          }
        } else {
          memberId = mevcut.id;
          await tx.member.update({ where: { id: memberId }, data: uyeVeri });
          sonuc.guncellenen++;
          // Adres karşılaştırması: her Excel satırı için en uygun mevcut adresi bul
          const mevcutAdresler = [...mevcut.addresses];
          for (const s of satirlar) {
            const adres = s.alanlar.adres;
            if (!adres) continue;
            // Önce aynı adres tipi, yoksa en benzer
            let eslesen = mevcutAdresler.find((x) => (x.adresTipi ?? null) === (s.alanlar.adresTipi ?? null));
            if (!eslesen && mevcutAdresler.length) {
              eslesen = mevcutAdresler
                .map((x) => ({ x, f: adresFarki(x.adresNormalize, s.adresNormalize) }))
                .sort((p, q) => q.f.skor - p.f.skor)[0].x;
            }
            if (!eslesen) {
              await tx.memberAddress.create({
                data: {
                  memberId, adresTipi: s.alanlar.adresTipi ?? null, adresMetni: adres, adresNormalize: s.adresNormalize,
                  ilce: s.ilce, il: ilAyikla(adres), isPrimary: mevcutAdresler.length === 0, konumDurumu: "YOK",
                },
              });
              continue;
            }
            const fark = adresFarki(eslesen.adresNormalize, s.adresNormalize);
            if (fark.tur === "AYNI") {
              // Yalnızca görünen metni/ilçeyi tazele, konuma dokunma
              if (eslesen.adresMetni !== adres) {
                await tx.memberAddress.update({ where: { id: eslesen.id }, data: { adresMetni: adres, ilce: s.ilce ?? eslesen.ilce } });
              }
              continue;
            }
            // Gerçek fark → değişiklik talebi (karar admin'in). Adres satırı henüz değişmez.
            const eskiKonumVar = eslesen.konumDurumu === "DOGRULANDI";
            await tx.addressChangeRequest.create({
              data: {
                memberId, eskiAddressId: eslesen.id, eskiAdres: eslesen.adresMetni, yeniAdres: adres,
                yeniAdresTipi: s.alanlar.adresTipi ?? eslesen.adresTipi, benzerlikSkoru: fark.skor,
                eskiKonumVarMi: eskiKonumVar, kaynak: "EXCEL", importBatchId: batchId,
              },
            });
            sonuc.adresDegisen++;
            if (fark.tur === "YAZIM_FARKI") sonuc.yaziFarki++;
          }
        }
      }
    }, { timeout: 60000 });
  }

  // Listede olmayan aktif üyeleri pasife çek (silme yok)
  const pasif = await prisma.member.updateMany({
    where: { aktif: true, sicilNo: { notIn: [...gorulenSiciller] } },
    data: { aktif: false },
  });
  sonuc.pasifYapilan = pasif.count;

  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      durum: "TAMAMLANDI", bitisZamani: new Date(),
      eklenen: sonuc.eklenen, guncellenen: sonuc.guncellenen, pasifYapilan: sonuc.pasifYapilan, adresDegisen: sonuc.adresDegisen,
      hataRaporu: { hatalar: sonuc.hatalar, uyarilar: sonuc.uyarilar.slice(0, 500), yaziFarki: sonuc.yaziFarki } as unknown as Prisma.InputJsonValue,
    },
  });
  await denetimKaydi(userId, "GENEL_LISTE_YUKLENDI", "ImportBatch", batchId, { eklenen: sonuc.eklenen, guncellenen: sonuc.guncellenen, adresDegisen: sonuc.adresDegisen });
  return sonuc;
}

/**
 * Adres değişikliği kararı uygula.
 * YENI_ADRES: eski adres tarihçeye, yeni satır DOGRULANACAK.
 * AYNI_YER: adres metni güncellenir, konum ve saha notu korunur.
 * REDDEDILDI: hiçbir şey değişmez.
 */
export async function adresKarariUygula(talepId: string, karar: "YENI_ADRES" | "AYNI_YER" | "REDDEDILDI", userId: string) {
  const t = await prisma.addressChangeRequest.findUniqueOrThrow({ where: { id: talepId } });
  if (t.karar !== "BEKLIYOR") return;
  await prisma.$transaction(async (tx) => {
    const eski = t.eskiAddressId ? await tx.memberAddress.findUnique({ where: { id: t.eskiAddressId } }) : null;
    if (karar === "AYNI_YER") {
      if (eski) {
        await tx.memberAddress.update({
          where: { id: eski.id },
          data: { adresMetni: t.yeniAdres, adresNormalize: adresNormalize(t.yeniAdres), adresTipi: t.yeniAdresTipi ?? eski.adresTipi },
        });
      }
    } else if (karar === "YENI_ADRES") {
      const yeni = await tx.memberAddress.create({
        data: {
          memberId: t.memberId,
          adresTipi: t.yeniAdresTipi ?? eski?.adresTipi ?? null,
          adresMetni: t.yeniAdres,
          adresNormalize: adresNormalize(t.yeniAdres),
          ilce: ilceAyikla(t.yeniAdres),
          il: ilAyikla(t.yeniAdres),
          isPrimary: eski?.isPrimary ?? false,
          konumDurumu: "DOGRULANACAK",
        },
      });
      if (eski) {
        await tx.memberAddress.update({ where: { id: eski.id }, data: { gecerlilikBitis: new Date(), isPrimary: false } });
        // Açık kampanyadaki bekleyen gönderileri yeni adrese yönlendir
        await tx.shipment.updateMany({
          where: { memberAddressId: eski.id, durum: { in: ["BEKLIYOR", "ATANDI", "YOLDA"] } },
          data: { memberAddressId: yeni.id },
        });
      }
    }
    await tx.addressChangeRequest.update({
      where: { id: talepId },
      data: { karar, kararVerenId: userId, kararTarihi: new Date() },
    });
  });
  await denetimKaydi(userId, "ADRES_KARARI", "AddressChangeRequest", talepId, { karar });
}
