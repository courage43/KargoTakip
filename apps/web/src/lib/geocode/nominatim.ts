import type { GeocodeSaglayici, GeocodeSonuc, GeoKalite } from "./types";

/** Nominatim sonucundaki type/class → kalite */
export function nominatimKalite(r: { type?: string; class?: string; addresstype?: string }): GeoKalite {
  const t = (r.addresstype ?? r.type ?? "").toLowerCase();
  const c = (r.class ?? "").toLowerCase();
  if (["house", "building", "shop", "office", "amenity", "commercial", "industrial", "retail"].includes(t) || c === "building" || c === "shop" || c === "amenity" || c === "office") return "ADRES";
  if (["road", "street", "residential", "pedestrian", "tertiary", "secondary", "primary", "living_street", "unclassified", "service"].includes(t) || c === "highway") return "SOKAK";
  if (["neighbourhood", "quarter", "suburb", "hamlet", "village", "locality", "postcode"].includes(t)) return "MAHALLE";
  return "ILCE";
}

export function nominatimYanitAyristir(json: unknown): GeocodeSonuc | null {
  if (!Array.isArray(json) || !json.length) return null;
  const r = json[0] as { lat: string; lon: string; type?: string; class?: string; addresstype?: string };
  const lat = Number(r.lat), lng = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, kalite: nominatimKalite(r) };
}

/** Adres metnini Nominatim için sadeleştir: "No:5 D:3" gibi daire bilgisi aramayı bozar */
export function nominatimSorgu(adres: string, il?: string | null): string {
  let s = adres.replace(/\b(d|daire|kat|k|blok)\s*[:.]?\s*\d+[a-z]?\b/gi, " ").replace(/\bno\s*[:.]?\s*(\d+)/gi, "$1").replace(/\s+/g, " ").trim();
  if (il && !s.toLowerCase().includes(il.toLowerCase())) s += `, ${il}`;
  return s + ", Türkiye";
}

export const nominatimSaglayici: GeocodeSaglayici = {
  ad: "nominatim",
  hizSaniye: 1,
  async bul(adres, _ilce, il) {
    const u = new URL("https://nominatim.openstreetmap.org/search");
    u.searchParams.set("q", nominatimSorgu(adres, il));
    u.searchParams.set("format", "jsonv2");
    u.searchParams.set("countrycodes", "tr");
    u.searchParams.set("limit", "1");
    const r = await fetch(u, { headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "dagitim-takip/1.0 (oda zarf dagitimi)", "Accept-Language": "tr" }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
    return nominatimYanitAyristir(await r.json());
  },
};
