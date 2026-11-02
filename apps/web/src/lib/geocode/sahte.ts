import type { GeocodeSaglayici, GeocodeSonuc } from "./types";

/** İstanbul ilçe merkezleri (test sağlayıcısı için) */
export const ILCE_MERKEZLERI: Record<string, [number, number]> = {
  kadikoy: [40.9903, 29.0290], uskudar: [41.0260, 29.0150], besiktas: [41.0430, 29.0090], sisli: [41.0600, 28.9870],
  fatih: [41.0186, 28.9400], bakirkoy: [40.9800, 28.8730], maltepe: [40.9350, 29.1310], atasehir: [40.9920, 29.1270],
  pendik: [40.8780, 29.2340], kartal: [40.9050, 29.1850], umraniye: [41.0160, 29.1240], beyoglu: [41.0370, 28.9770],
  merkez: [39.9208, 32.8541],
};

function sade(s: string) {
  return s.toLowerCase().replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/İ/g, "i").replace(/[^a-z]/g, "");
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

/** Deterministik test sağlayıcısı: ilçe merkezine adres hash'inden ±0.01° sapma. "BULUNAMAZ" içeren adres → null */
export const sahteGeocode: GeocodeSaglayici = {
  ad: "sahte",
  hizSaniye: 1000,
  async bul(adres, ilce): Promise<GeocodeSonuc | null> {
    if (/bulunamaz/i.test(adres)) return null;
    const anahtar = sade(ilce ?? "");
    const merkez = ILCE_MERKEZLERI[anahtar] ?? ILCE_MERKEZLERI.merkez;
    const h1 = hash(adres), h2 = hash(adres + "x");
    return { lat: merkez[0] + (h1 - 0.5) * 0.02, lng: merkez[1] + (h2 - 0.5) * 0.02, kalite: ILCE_MERKEZLERI[anahtar] ? "SOKAK" : "ILCE" };
  },
};
