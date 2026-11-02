export interface PushMesaj { baslik: string; govde: string; veri?: Record<string, string> }
export interface PushSonuc { gonderilen: number; gecersizTokenlar: string[] }
export interface PushSaglayici {
  ad: string;
  gonder(tokenlar: string[], mesaj: PushMesaj): Promise<PushSonuc>;
}
