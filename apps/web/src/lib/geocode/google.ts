import type { GeocodeSaglayici, GeocodeSonuc, GeoKalite } from "./types";

export function googleKalite(locationType: string | undefined): GeoKalite {
  switch (locationType) {
    case "ROOFTOP": return "ADRES";
    case "RANGE_INTERPOLATED": return "SOKAK";
    case "GEOMETRIC_CENTER": return "MAHALLE";
    default: return "ILCE";
  }
}

export function googleYanitAyristir(json: unknown): GeocodeSonuc | null {
  const j = json as { status?: string; results?: { geometry?: { location?: { lat: number; lng: number }; location_type?: string } }[] };
  if (j.status === "ZERO_RESULTS") return null;
  if (j.status && j.status !== "OK") throw new Error(`Google Geocoding: ${j.status}`);
  const r = j.results?.[0];
  const loc = r?.geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng, kalite: googleKalite(r?.geometry?.location_type) };
}

export function googleSaglayici(apiKey: string): GeocodeSaglayici {
  return {
    ad: "google",
    hizSaniye: 20,
    async bul(adres, _ilce, _il) {
      const u = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      u.searchParams.set("address", adres);
      u.searchParams.set("components", "country:TR");
      u.searchParams.set("language", "tr");
      u.searchParams.set("key", apiKey);
      const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`Google HTTP ${r.status}`);
      return googleYanitAyristir(await r.json());
    },
  };
}
