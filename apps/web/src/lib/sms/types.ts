export interface SmsIstek { telefon: string; mesaj: string; baslik: string }
export interface SmsSonuc { durum: "GONDERILDI" | "HATA"; saglayiciMesajId?: string; hata?: string }
export type RaporDurumu = "ILETILDI" | "HATA" | "BEKLIYOR";

export interface SmsSaglayici {
  ad: string;
  gonder(istek: SmsIstek): Promise<SmsSonuc>;
  /** saglayiciMesajId → teslim durumu */
  raporSorgula?(ids: string[]): Promise<Record<string, RaporDurumu>>;
}
