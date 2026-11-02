import { describe, it, expect } from "vitest";
import { enYakinKomsuSirala, toplamMesafe, type RotaNoktasi } from "../src/rota";

let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const merkezler: Record<string, [number, number]> = { Kadıköy: [40.99, 29.03], Üsküdar: [41.03, 29.02], Pendik: [40.88, 29.23] };
const noktalar: RotaNoktasi[] = [];
for (const [ilce, [lat, lng]] of Object.entries(merkezler)) for (let i = 0; i < 5; i++) noktalar.push({ id: `${ilce}-${i}`, lat: lat + (rnd() - 0.5) * 0.02, lng: lng + (rnd() - 0.5) * 0.02, ilce });
noktalar.push({ id: "Kadıköy-x", lat: null, lng: null, ilce: "Kadıköy" });

describe("enYakinKomsuSirala", () => {
  const baslangic = { lat: 40.99, lng: 29.03 }; // Kadıköy'den başla
  const sira = enYakinKomsuSirala(baslangic, noktalar);
  it("tüm noktaları bir kez içerir", () => { expect(sira.length).toBe(noktalar.length); expect(new Set(sira).size).toBe(noktalar.length); });
  it("ilçe kümeleri bölünmez ve en yakın ilçe önce gelir", () => {
    const ilceler = sira.map((id) => id.split("-")[0]);
    const sikistir = ilceler.filter((x, i) => i === 0 || ilceler[i - 1] !== x);
    expect(sikistir).toEqual(["Kadıköy", "Üsküdar", "Pendik"]);
  });
  it("koordinatsız nokta kendi ilçesinin sonunda", () => {
    const kadikoy = sira.filter((id) => id.startsWith("Kadıköy"));
    expect(kadikoy.at(-1)).toBe("Kadıköy-x");
  });
  it("toplam mesafe rastgele sıradan kısa", () => {
    const byId = new Map(noktalar.map((n) => [n.id, n]));
    const siraliNoktalar = sira.map((id) => byId.get(id)!);
    const rastgele = [...noktalar].sort(() => rnd() - 0.5);
    expect(toplamMesafe(baslangic, siraliNoktalar)).toBeLessThan(toplamMesafe(baslangic, rastgele) * 0.7);
  });
  it("başlangıç yoksa da çalışır", () => { expect(enYakinKomsuSirala(null, noktalar).length).toBe(noktalar.length); expect(enYakinKomsuSirala(null, [])).toEqual([]); });
});
