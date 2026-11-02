import type { GeocodeSaglayici } from "./types";
import { nominatimSaglayici } from "./nominatim";
import { googleSaglayici } from "./google";
import { sahteGeocode } from "./sahte";

export * from "./types";
export { nominatimYanitAyristir, nominatimKalite, nominatimSorgu } from "./nominatim";
export { googleYanitAyristir, googleKalite } from "./google";
export { sahteGeocode } from "./sahte";

export function geocodeSaglayiciAdi(): string {
  return (process.env.GEOCODE_SAGLAYICI ?? "nominatim").toLowerCase();
}

export function geocodeSaglayiciAl(): GeocodeSaglayici {
  const ad = geocodeSaglayiciAdi();
  if (ad === "sahte") return sahteGeocode;
  if (ad === "google") {
    const k = process.env.GEOCODING_API_KEY;
    if (!k) throw new Error("GEOCODING_API_KEY tanımlı değil");
    return googleSaglayici(k);
  }
  return nominatimSaglayici;
}
