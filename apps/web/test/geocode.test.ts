import { describe, it, expect } from "vitest";
import { nominatimYanitAyristir, nominatimKalite, nominatimSorgu } from "../src/lib/geocode/nominatim";
import { googleYanitAyristir, googleKalite } from "../src/lib/geocode/google";
import { sahteGeocode } from "../src/lib/geocode/sahte";

describe("Nominatim", () => {
  it("ilk sonucu ve kaliteyi ayrıştırır", () => {
    const r = nominatimYanitAyristir([{ lat: "40.99", lon: "29.03", class: "building", type: "yes", addresstype: "building" }]);
    expect(r).toEqual({ lat: 40.99, lng: 29.03, kalite: "ADRES" });
    expect(nominatimYanitAyristir([])).toBeNull();
    expect(nominatimKalite({ class: "highway", type: "residential" })).toBe("SOKAK");
    expect(nominatimKalite({ addresstype: "neighbourhood" })).toBe("MAHALLE");
    expect(nominatimKalite({ type: "administrative" })).toBe("ILCE");
  });
  it("daire/kat bilgisini sorgudan çıkarır, il ekler", () => {
    expect(nominatimSorgu("Atatürk Mah. Çiçek Sk. No:5 D:3 Kat:2 Kadıköy", "İstanbul")).toBe("Atatürk Mah. Çiçek Sk. 5 Kadıköy, İstanbul, Türkiye");
    expect(nominatimSorgu("X Sk. No:1 Kadıköy/İstanbul", "İstanbul")).toBe("X Sk. 1 Kadıköy/İstanbul, Türkiye");
  });
});

describe("Google", () => {
  it("location_type → kalite", () => {
    expect(googleKalite("ROOFTOP")).toBe("ADRES"); expect(googleKalite("RANGE_INTERPOLATED")).toBe("SOKAK");
    expect(googleKalite("GEOMETRIC_CENTER")).toBe("MAHALLE"); expect(googleKalite("APPROXIMATE")).toBe("ILCE");
  });
  it("yanıtı ayrıştırır, ZERO_RESULTS null, hata fırlatır", () => {
    expect(googleYanitAyristir({ status: "OK", results: [{ geometry: { location: { lat: 41, lng: 29 }, location_type: "ROOFTOP" } }] })).toEqual({ lat: 41, lng: 29, kalite: "ADRES" });
    expect(googleYanitAyristir({ status: "ZERO_RESULTS", results: [] })).toBeNull();
    expect(() => googleYanitAyristir({ status: "OVER_QUERY_LIMIT" })).toThrow(/OVER_QUERY_LIMIT/);
  });
});

describe("Sahte geocode", () => {
  it("deterministik ve ilçe merkezine yakın", async () => {
    const a = await sahteGeocode.bul("Atatürk Mah. No:5 Kadıköy/İSTANBUL", "Kadıköy");
    const b = await sahteGeocode.bul("Atatürk Mah. No:5 Kadıköy/İSTANBUL", "Kadıköy");
    expect(a).toEqual(b);
    expect(Math.abs(a!.lat - 40.9903)).toBeLessThan(0.02); expect(a!.kalite).toBe("SOKAK");
    expect(await sahteGeocode.bul("BULUNAMAZ adres", "Kadıköy")).toBeNull();
    expect((await sahteGeocode.bul("x", "Bilinmeyenİlçe"))!.kalite).toBe("ILCE");
  });
});
