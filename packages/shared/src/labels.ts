export const GONDERI_DURUMU_ETIKET: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  ATANDI: "Atandı",
  YOLDA: "Yolda",
  TESLIM_EDILDI: "Teslim Edildi",
  KOMSUYA_BIRAKILDI: "Komşuya Bırakıldı",
  ISYERINE_BIRAKILDI: "İş Yerine Bırakıldı",
  ADRESTE_BULUNAMADI: "Adreste Bulunamadı",
  ADRES_HATALI: "Adres Hatalı",
  TASINMIS: "Taşınmış",
  UYE_ISTEMEDI: "Üye İstemedi",
  IADE: "İade",
};

export const GONDERI_DURUMU_RENK: Record<string, string> = {
  BEKLIYOR: "#9ca3af",
  ATANDI: "#3b82f6",
  YOLDA: "#6366f1",
  TESLIM_EDILDI: "#16a34a",
  KOMSUYA_BIRAKILDI: "#f59e0b",
  ISYERINE_BIRAKILDI: "#f59e0b",
  ADRESTE_BULUNAMADI: "#dc2626",
  ADRES_HATALI: "#b91c1c",
  TASINMIS: "#b91c1c",
  UYE_ISTEMEDI: "#6b7280",
  IADE: "#374151",
};

/** Kuryenin sahada seçebileceği sonuçlar */
export const KURYE_SONUCLARI = [
  "TESLIM_EDILDI",
  "ISYERINE_BIRAKILDI",
  "KOMSUYA_BIRAKILDI",
  "ADRESTE_BULUNAMADI",
  "ADRES_HATALI",
  "TASINMIS",
] as const;
export type KuryeSonucu = (typeof KURYE_SONUCLARI)[number];

/** Teslim sayılan sonuçlar (imza + teslim alan zorunlu) */
export const TESLIM_SONUCLARI: readonly string[] = ["TESLIM_EDILDI", "ISYERINE_BIRAKILDI", "KOMSUYA_BIRAKILDI"];
/** Kapatan (bir daha denenmeyecek) durumlar */
export const KAPALI_DURUMLAR: readonly string[] = [...TESLIM_SONUCLARI, "UYE_ISTEMEDI", "IADE"];

export const UYE_TERCIHI_ETIKET: Record<string, string> = {
  ISYERINDEYIM: "İş yerindeyim",
  EVDEYIM: "Evdeyim",
  KOMSUYA_BIRAK: "Komşuya bırakılabilir",
  BASKA_ADRESE: "Başka adrese gönderin",
  ZARF_ISTEMIYORUM: "Zarfı istemiyorum",
};

export const TESLIM_ALAN_ETIKET: Record<string, string> = {
  YETKILI: "Firma yetkilisi",
  CALISAN: "Çalışan",
  KOMSU: "Komşu",
  DIGER: "Diğer",
};

export const KONUM_DURUMU_ETIKET: Record<string, string> = {
  YOK: "Konum yok",
  TAHMINI: "Tahmini konum",
  DOGRULANDI: "Doğrulanmış konum",
  DOGRULANACAK: "Adres değişti, doğrulanacak",
  CAKISMA_BEKLIYOR: "Konum çakışması, onay bekliyor",
};

export const ROL_ETIKET: Record<string, string> = {
  ODA_ADMIN: "Oda Yöneticisi",
  KURYE_FIRMA_YONETICI: "Kurye Firması Yöneticisi",
  KURYE: "Kurye",
};

export const KAMPANYA_DURUMU_ETIKET: Record<string, string> = {
  TASLAK: "Taslak",
  AKTIF: "Aktif",
  TAMAMLANDI: "Tamamlandı",
};

export const ADRES_KARAR_ETIKET: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  YENI_ADRES: "Yeni adres, konum sıfırlandı",
  AYNI_YER: "Aynı yer, konum korundu",
  REDDEDILDI: "Reddedildi",
};

/** Konum doğrulama eşiği: mevcut doğrulanmış noktadan bu kadar uzaksa otomatik ezilmez */
export const KONUM_CAKISMA_ESIGI_M = 150;
/** Anomali: teslimat GPS'i adres konumundan bu kadar uzaksa uyarı */
export const UZAK_TESLIM_ESIGI_M = 300;
/** Rota açıkken bu kadar dakika konum gelmezse "hareketsiz" uyarısı */
export const HAREKETSIZ_DK = 45;
/** Bu kadar saatten uzun açık kalan rota otomatik kapatılır */
export const UZUN_ROTA_SAAT = 14;
/** Ham konum izleri bu kadar gün saklanır (Route özetleri kalır) */
export const KONUM_SAKLAMA_GUN = 90;
/** Ardışık iki deneme arası bu kadar saniyeden kısa ve mesafe eşiğinden uzaksa "çok hızlı" uyarısı */
export const HIZLI_DENEME_SN = 60;
export const HIZLI_DENEME_M = 500;

export const GEO_KALITE_ETIKET: Record<string, string> = {
  ADRES: "Bina düzeyinde",
  SOKAK: "Sokak düzeyinde",
  MAHALLE: "Mahalle düzeyinde",
  ILCE: "İlçe düzeyinde",
};

export const UYARI_TURU_ETIKET: Record<string, string> = {
  HAREKETSIZ: "Hareketsiz kurye",
  UZUN_ROTA: "Uzun süre açık rota",
  UZAK_TESLIM: "Adresten uzakta teslimat",
  GPSSIZ: "GPS'siz teslimat kaydı",
  HIZLI: "Şüpheli hızlı teslimat",
};
