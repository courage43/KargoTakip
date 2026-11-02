import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { otomatikEsle, eslemeDogrula, exceliOku, satirlariAyristir, adresNormalize, adresFarki, ilceAyikla, telefonNormalize, exceleYaz } from "../src";

const BASLIKLAR = `SIRA NO	UYE SICIL NO	UNVAN	TABELA UNVANI	UYRUK	SIRKET TIPI	TICARET SICIL NO	TSM ADI	SERMAYE	ADRES TIPI	ADRES	IS TELEFONU	BURO TELEFONU	FAKS	CEP TELEFONU (GSM) 	EV TELEFONU	YETKİLİ ADI SOYADI/UNVAN	TÜZEL FİRMA GERÇEK KİŞİ TEMSİLCİSİ	GOREVI	YETKI BAŞLANGIÇ TARİHİ	YETKI BİTİŞ TARİHİ	BABA ADI	DOGUM TARIHI	DOGUM YERI	DERECE	KIMLIK NO	VERGI NO	MERSIS NO	KURULUS TARIHI	UYE KAYIT TARIHI	UYE ODA KARAR TARIHI	VERGI DAIRESI	VERGI TERK TARIHI	E-POSTA	WEB ADRESI	ACIKLAMA	DURUM TANIMI	DURUM DEGISIM TARIHI	DURUM DEGISIM NEDENI	FAALIYET DETAYI	ODA BOLGE KODU	MESLEK GRUBU	NACE FAALIYET KODU	NACE FAALIYET ADI	ISCI SAYISI	SMMM ADI SOYADI	KAYIT KARAR NO	SUBE ADI`.split("\t");

describe("otomatik sütun eşleme", () => {
  const esleme = otomatikEsle(BASLIKLAR);
  const hedef = (b: string) => esleme.find((e) => e.baslik === b)!.hedef;
  it("48 sütunun kritik olanlarını eşler", () => {
    expect(hedef("UYE SICIL NO")).toBe("sicilNo");
    expect(hedef("UNVAN")).toBe("unvan");
    expect(hedef("TABELA UNVANI")).toBe("tabelaUnvani");
    expect(hedef("ADRES")).toBe("adres");
    expect(hedef("ADRES TIPI")).toBe("adresTipi");
    expect(hedef("CEP TELEFONU (GSM) ")).toBe("cepTelefonu");
    expect(hedef("YETKİLİ ADI SOYADI/UNVAN")).toBe("yetkiliAdSoyad");
    expect(hedef("E-POSTA")).toBe("eposta");
    expect(hedef("ODA BOLGE KODU")).toBe("odaBolgeKodu");
    expect(hedef("MESLEK GRUBU")).toBe("meslekGrubu");
    expect(hedef("SUBE ADI")).toBe("subeAdi");
  });
  it("hassas sütunları yoksayar", () => {
    for (const b of ["KIMLIK NO", "DOGUM TARIHI", "BABA ADI", "VERGI NO", "MERSIS NO"]) {
      expect(hedef(b)).toBe("YOKSAY");
      expect(esleme.find((e) => e.baslik === b)!.hassas).toBe(true);
    }
    expect(hedef("SIRA NO")).toBe("YOKSAY");
  });
  it("diğerlerini rawData'ya atar", () => {
    expect(hedef("NACE FAALIYET ADI")).toBe("RAW");
    expect(hedef("VERGI DAIRESI")).toBe("RAW");
  });
  it("doğrulama geçer", () => {
    expect(eslemeDogrula(esleme, "GENEL_LISTE")).toEqual([]);
  });
  it("sicil eksikse doğrulama hata verir", () => {
    const e2 = esleme.map((e) => (e.hedef === "sicilNo" ? { ...e, hedef: "YOKSAY" as const } : e));
    expect(eslemeDogrula(e2, "DAGITIM_LISTESI")[0]).toMatch(/Sicil/);
  });
});

describe("okuma ve ayrıştırma", () => {
  it("xlsx okur, mükerrer sicili ve geçersiz telefonu raporlar", () => {
    const rows = [
      BASLIKLAR,
      ["1", "1001", "ABC LTD", "ABC", "TC", "LTD", "", "", "", "İş", "Atatürk Mah. Çiçek Sk. No:5 D:3 Kadıköy/İSTANBUL", "2161234567", "", "", "0532 123 45 67", "", "Ali Veli", "", "", "", "", "Hasan", "1980-01-01", "", "", "11111111111", "", "", "", "", "", "", "", "ali@abc.com", "", "", "AKTİF", "", "", "", "3", "12", "", "", "5", "", "", "Merkez"],
      ["2", "1001", "ABC LTD", "ABC", "TC", "LTD", "", "", "", "Ev", "Moda Cad. No 10 Kadıköy / İstanbul", "", "", "", "123", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "AKTİF", "", "", "", "3", "12", "", "", "", "", "", ""],
      ["3", "", "BOŞ SİCİL", "", "", "", "", "", "", "", "x", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Üyeler");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const tablo = exceliOku(buf);
    expect(tablo.basliklar.length).toBe(48);
    expect(tablo.satirlar.length).toBe(3);
    const esleme = otomatikEsle(tablo.basliklar);
    const r = satirlariAyristir(tablo, esleme);
    expect(r.satirlar.length).toBe(2);
    expect(r.hatalar[0].mesaj).toMatch(/boş/);
    expect(r.mukerrerSicil).toEqual(["1001"]);
    expect(r.satirlar[0].alanlar.cepTelefonu).toBe("5321234567");
    expect(r.satirlar[0].ilce).toBe("Kadıköy");
    expect(r.satirlar[0].raw["KIMLIK NO"]).toBeUndefined();
    expect(r.satirlar[1].uyarilar[0]).toMatch(/geçersiz/);
    expect(r.satirlar[1].ilce).toBe("Kadıköy");
  });
  it("dışa aktarım buffer üretir", () => {
    const buf = exceleYaz([{ ad: "Sonuç", satirlar: [{ Sicil: "1", Durum: "Teslim" }] }]);
    const t = exceliOku(buf);
    expect(t.satirlar[0]["Durum"]).toBe("Teslim");
  });
});

describe("adres normalize ve fark", () => {
  it("yazım farklarını aynı sayar", () => {
    const a = adresNormalize("Atatürk Mahallesi Çiçek Sokak No:5 Daire:3 Kadıköy/İstanbul");
    const b = adresNormalize("ATATÜRK MAH. ÇİÇEK SK. NO 5 D 3 KADIKÖY / İSTANBUL");
    expect(a).toBe(b);
    expect(adresFarki(a, b).tur).toBe("AYNI");
  });
  it("küçük yazım farkında yüksek skor verir", () => {
    const a = adresNormalize("Bağdat Cad. Selamiçeşme Mah. No:120 K:2 Kadıköy/İstanbul");
    const b = adresNormalize("Bağdat Caddesi Selamiçeşme Mahallesi No:120 Kat:2 Kadıköy/İstanbul");
    const f = adresFarki(a, b);
    expect(f.tur).toBe("AYNI");
    const c = adresNormalize("Bagdat Cad. Selamicesme Mah. No:120 Kat 2 Kadikoy / İstanbul (Yanı)");
    expect(adresFarki(a, c).tur).toBe("YAZIM_FARKI");
  });
  it("farklı adresi DEGISTI sayar", () => {
    const a = adresNormalize("Atatürk Mah. Çiçek Sk. No:5 Kadıköy/İstanbul");
    const b = adresNormalize("Cumhuriyet Mah. Gül Cad. No:44 Üsküdar/İstanbul");
    expect(adresFarki(a, b).tur).toBe("DEGISTI");
  });
  it("ilçe ayıklar", () => {
    expect(ilceAyikla("X Mah. Y Sk. No:1 Beşiktaş/İstanbul")).toBe("Beşiktaş");
    expect(ilceAyikla("X Mah. Y Sk. No:1 Merkez / ÇORUM")).toBe("Merkez");
    expect(ilceAyikla("Adres bilgisi yok")).toBeNull();
  });
  it("telefon normalize", () => {
    expect(telefonNormalize("+90 (532) 123 45 67")).toBe("5321234567");
    expect(telefonNormalize("05321234567")).toBe("5321234567");
    expect(telefonNormalize("0216 123 45 67")).toBe("2161234567");
    expect(telefonNormalize("123")).toBeNull();
  });
});
