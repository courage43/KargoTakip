import { describe, it, expect, vi } from "vitest";
vi.mock("../src/lib/db", () => ({ prisma: {} }));
import { uyarilariHesapla } from "../src/lib/uyarilar";

const simdi = new Date("2026-03-01T12:00:00Z");
const dk = (n: number) => new Date(simdi.getTime() - n * 60000);
const kurye = { courierId: "k1", kuryeAd: "Ahmet", firmaId: "f1" };

describe("uyarilariHesapla", () => {
  it("hareketsiz kurye: 50 dk konum yok", () => {
    const u = uyarilariHesapla({ simdi, rotalar: [{ id: "r1", ...kurye, baslangic: dk(180), sonKonum: dk(50) }], denemeler: [] });
    expect(u.map((x) => x.tur)).toEqual(["HAREKETSIZ"]); expect(u[0].deger).toBe(50);
  });
  it("20 dk önce konum gelen rota uyarı vermez; hiç konum gelmeyen 20 dk'lık rota verir", () => {
    expect(uyarilariHesapla({ simdi, rotalar: [{ id: "r1", ...kurye, baslangic: dk(180), sonKonum: dk(20) }], denemeler: [] })).toEqual([]);
    const u = uyarilariHesapla({ simdi, rotalar: [{ id: "r2", ...kurye, baslangic: dk(20), sonKonum: null }], denemeler: [] });
    expect(u[0]?.tur).toBe("HAREKETSIZ"); expect(u[0].aciklama).toMatch(/hiç konum/);
  });
  it("14 saati aşan rota: uzun rota + hareketsiz", () => {
    const u = uyarilariHesapla({ simdi, rotalar: [{ id: "r1", ...kurye, baslangic: dk(15 * 60), sonKonum: dk(14 * 60) }], denemeler: [] });
    expect(u.map((x) => x.tur).sort()).toEqual(["HAREKETSIZ", "UZUN_ROTA"]);
  });
  it("uzak teslim yalnızca doğrulanmış adres ve teslim sonucunda", () => {
    const d = { id: "d1", shipmentId: "s1", ...kurye, sonuc: "TESLIM_EDILDI", lat: 41, lng: 29, adresMesafesiM: 450, konumDurumu: "DOGRULANDI", sunucuZamani: dk(10) };
    expect(uyarilariHesapla({ simdi, rotalar: [], denemeler: [d] })[0].tur).toBe("UZAK_TESLIM");
    expect(uyarilariHesapla({ simdi, rotalar: [], denemeler: [{ ...d, konumDurumu: "TAHMINI" }] })).toEqual([]);
    expect(uyarilariHesapla({ simdi, rotalar: [], denemeler: [{ ...d, konumDurumu: "CAKISMA_BEKLIYOR" }] })[0].tur).toBe("UZAK_TESLIM");
    expect(uyarilariHesapla({ simdi, rotalar: [], denemeler: [{ ...d, sonuc: "ADRESTE_BULUNAMADI" }] })).toEqual([]);
    expect(uyarilariHesapla({ simdi, rotalar: [], denemeler: [{ ...d, adresMesafesiM: 120 }] })).toEqual([]);
  });
  it("GPS'siz deneme", () => {
    const u = uyarilariHesapla({ simdi, rotalar: [], denemeler: [{ id: "d1", shipmentId: "s1", ...kurye, sonuc: "TESLIM_EDILDI", lat: null, lng: null, adresMesafesiM: null, konumDurumu: "YOK", sunucuZamani: dk(5) }] });
    expect(u[0].tur).toBe("GPSSIZ");
  });
  it("çok hızlı: 30 sn içinde 1 km uzakta ikinci teslimat", () => {
    const a = { id: "d1", shipmentId: "s1", ...kurye, sonuc: "TESLIM_EDILDI", lat: 41.0, lng: 29.0, adresMesafesiM: 10, konumDurumu: "DOGRULANDI", sunucuZamani: dk(5) };
    const b = { ...a, id: "d2", shipmentId: "s2", lat: 41.009, sunucuZamani: new Date(dk(5).getTime() + 30000) };
    const u = uyarilariHesapla({ simdi, rotalar: [], denemeler: [a, b] });
    expect(u.map((x) => x.tur)).toEqual(["HIZLI"]); expect(u[0].anahtar).toBe("d2"); expect(u[0].deger).toBeGreaterThan(900);
    // 5 dk arayla aynı mesafe → uyarı yok
    expect(uyarilariHesapla({ simdi, rotalar: [], denemeler: [a, { ...b, sunucuZamani: dk(0) }] })).toEqual([]);
  });
});
