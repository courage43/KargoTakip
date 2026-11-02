export type GeoKalite = "ADRES" | "SOKAK" | "MAHALLE" | "ILCE";

export interface GeocodeSonuc {
  lat: number;
  lng: number;
  kalite: GeoKalite;
}

export interface GeocodeSaglayici {
  ad: string;
  /** Saniyedeki azami istek */
  hizSaniye: number;
  bul(adres: string, ilce?: string | null, il?: string | null): Promise<GeocodeSonuc | null>;
}
