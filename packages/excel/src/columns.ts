import { baslikAnahtari } from "./normalize";

/** Sistemde karşılığı olan üye alanları */
export const UYE_ALANLARI = {
  sicilNo: "Üye Sicil No",
  unvan: "Unvan",
  tabelaUnvani: "Tabela Unvanı",
  yetkiliAdSoyad: "Yetkili Adı Soyadı",
  cepTelefonu: "Cep Telefonu",
  isTelefonu: "İş Telefonu",
  eposta: "E-posta",
  adres: "Adres",
  adresTipi: "Adres Tipi",
  meslekGrubu: "Meslek Grubu",
  odaBolgeKodu: "Oda Bölge Kodu",
  durumTanimi: "Durum Tanımı",
  subeAdi: "Şube Adı",
} as const;
export type UyeAlani = keyof typeof UYE_ALANLARI;

export type EslemeHedefi = UyeAlani | "RAW" | "YOKSAY";

/** Excel başlığı (sade anahtar) → alan. Kullanıcının 48 sütunlu dosyasına göre. */
const OTOMATIK_ESLEME: Record<string, UyeAlani> = {
  uyesicilno: "sicilNo",
  sicilno: "sicilNo",
  uyeno: "sicilNo",
  unvan: "unvan",
  unvani: "unvan",
  firmaunvani: "unvan",
  tabelaunvani: "tabelaUnvani",
  tabelaunvan: "tabelaUnvani",
  yetkiliadisoyadiunvan: "yetkiliAdSoyad",
  yetkiliadisoyadi: "yetkiliAdSoyad",
  yetkili: "yetkiliAdSoyad",
  ceptelefonugsm: "cepTelefonu",
  ceptelefonu: "cepTelefonu",
  gsm: "cepTelefonu",
  ceptel: "cepTelefonu",
  istelefonu: "isTelefonu",
  telefon: "isTelefonu",
  eposta: "eposta",
  email: "eposta",
  mail: "eposta",
  adres: "adres",
  adresi: "adres",
  adrestipi: "adresTipi",
  meslekgrubu: "meslekGrubu",
  odabolgekodu: "odaBolgeKodu",
  bolgekodu: "odaBolgeKodu",
  durumtanimi: "durumTanimi",
  durum: "durumTanimi",
  subeadi: "subeAdi",
  sube: "subeAdi",
};

/** KVKK: varsayılan olarak içe alınmayan hassas sütunlar */
const HASSAS_BASLIKLAR = new Set([
  "kimlikno", "tckimlikno", "tcno", "tckn",
  "dogumtarihi", "dogumyeri", "babaadi", "anaadi",
  "vergino", "mersisno", "sermaye", "derece",
]);

/** Şema uyarınca rawData'ya atılmasında sakınca olmayan, raporlamada işe yarayabilecek sütunlar */
const RAW_VARSAYILAN = new Set([
  "sirketipi", "ticaretsicilno", "tsmadi", "burotelefonu", "faks", "evtelefonu",
  "tuzelfirmagercekkisitemsilcisi", "gorevi", "yetkibaslangictarihi", "yetkibitistarihi",
  "kurulustarihi", "uyekayittarihi", "uyeodakarartarihi", "vergidairesi", "vergiterktarihi",
  "webadresi", "aciklama", "durumdegisimtarihi", "durumdegisimnedeni", "faaliyetdetayi",
  "nacefaaliyetkodu", "nacefaaliyetadi", "iscisayisi", "smmmadisoyadi", "kayitkararno", "uyruk",
]);

export interface SutunEslemesi {
  baslik: string;
  anahtar: string;
  hedef: EslemeHedefi;
  otomatik: boolean;
  hassas: boolean;
}

/** Excel başlıklarından otomatik eşleme önerisi üret */
export function otomatikEsle(basliklar: string[]): SutunEslemesi[] {
  const kullanilan = new Set<UyeAlani>();
  return basliklar.map((baslik) => {
    const anahtar = baslikAnahtari(baslik);
    const hassas = HASSAS_BASLIKLAR.has(anahtar);
    let hedef: EslemeHedefi = "YOKSAY";
    const alan = OTOMATIK_ESLEME[anahtar];
    if (alan && !kullanilan.has(alan)) {
      hedef = alan;
      kullanilan.add(alan);
    } else if (hassas) {
      hedef = "YOKSAY";
    } else if (RAW_VARSAYILAN.has(anahtar) || anahtar === "sirano") {
      hedef = anahtar === "sirano" ? "YOKSAY" : "RAW";
    } else if (!alan) {
      hedef = "RAW";
    }
    return { baslik, anahtar, hedef, otomatik: hedef !== "YOKSAY", hassas };
  });
}

export function eslemeDogrula(esleme: SutunEslemesi[], tur: "GENEL_LISTE" | "DAGITIM_LISTESI"): string[] {
  const hatalar: string[] = [];
  const hedefler = esleme.map((e) => e.hedef);
  if (!hedefler.includes("sicilNo")) hatalar.push("'Üye Sicil No' sütunu eşlenmeli.");
  if (tur === "GENEL_LISTE") {
    if (!hedefler.includes("unvan")) hatalar.push("'Unvan' sütunu eşlenmeli.");
    if (!hedefler.includes("adres")) hatalar.push("'Adres' sütunu eşlenmeli.");
  }
  const sayac = new Map<string, number>();
  for (const h of hedefler) if (h !== "RAW" && h !== "YOKSAY") sayac.set(h, (sayac.get(h) ?? 0) + 1);
  for (const [h, n] of sayac) if (n > 1) hatalar.push(`'${UYE_ALANLARI[h as UyeAlani]}' birden fazla sütuna eşlenmiş.`);
  return hatalar;
}
