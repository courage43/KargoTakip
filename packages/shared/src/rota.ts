import { mesafeM } from "./geo";

export interface RotaNoktasi { id: string; lat: number | null; lng: number | null; ilce?: string | null }
export interface Konum { lat: number; lng: number }

function kumeMerkezi(n: RotaNoktasi[]): Konum | null {
  const k = n.filter((x) => x.lat != null && x.lng != null);
  if (!k.length) return null;
  return { lat: k.reduce((a, x) => a + x.lat!, 0) / k.length, lng: k.reduce((a, x) => a + x.lng!, 0) / k.length };
}

function enYakinKomsu(baslangic: Konum | null, noktalar: RotaNoktasi[]): RotaNoktasi[] {
  const kalan = [...noktalar];
  const sira: RotaNoktasi[] = [];
  let simdi = baslangic;
  while (kalan.length) {
    let enIyi = 0;
    if (simdi) {
      let enKisa = Infinity;
      for (let i = 0; i < kalan.length; i++) {
        const d = mesafeM(simdi.lat, simdi.lng, kalan[i].lat!, kalan[i].lng!);
        if (d < enKisa) { enKisa = d; enIyi = i; }
      }
    }
    const [n] = kalan.splice(enIyi, 1);
    sira.push(n);
    simdi = { lat: n.lat!, lng: n.lng! };
  }
  return sira;
}

/** 2-opt iyileştirme: kesişen kenarları açar (≤ 200 nokta için yeterince hızlı) */
function ikiOpt(sira: RotaNoktasi[], baslangic: Konum | null): RotaNoktasi[] {
  if (sira.length < 4 || sira.length > 200) return sira;
  const yol = [...sira];
  const d = (a: Konum | RotaNoktasi, b: RotaNoktasi) => mesafeM(a.lat!, a.lng!, b.lat!, b.lng!);
  let iyilesti = true, tur = 0;
  while (iyilesti && tur++ < 20) {
    iyilesti = false;
    for (let i = 0; i < yol.length - 2; i++) {
      const onceki = i === 0 ? baslangic : yol[i - 1];
      for (let j = i + 1; j < yol.length - 1; j++) {
        const mevcut = (onceki ? d(onceki, yol[i]) : 0) + d(yol[j], yol[j + 1]);
        const yeni = (onceki ? d(onceki, yol[j]) : 0) + d(yol[i], yol[j + 1]);
        if (yeni + 1 < mevcut) { yol.splice(i, j - i + 1, ...yol.slice(i, j + 1).reverse()); iyilesti = true; }
      }
    }
  }
  return yol;
}

export function toplamMesafe(baslangic: Konum | null, sira: RotaNoktasi[]): number {
  let t = 0; let onceki: Konum | null = baslangic;
  for (const n of sira) { if (n.lat == null) continue; if (onceki) t += mesafeM(onceki.lat, onceki.lng, n.lat, n.lng!); onceki = { lat: n.lat, lng: n.lng! }; }
  return t;
}

/**
 * Kurye listesini sırala: ilçe kümeleri başlangıca yakınlığa göre, küme içinde en yakın komşu + 2-opt.
 * Koordinatı olmayanlar kendi ilçelerinin sonuna eklenir. Dönüş: id dizisi.
 */
export function enYakinKomsuSirala(baslangic: Konum | null, noktalar: RotaNoktasi[]): string[] {
  const kumeler = new Map<string, RotaNoktasi[]>();
  for (const n of noktalar) { const k = n.ilce ?? "_"; (kumeler.get(k) ?? kumeler.set(k, []).get(k)!).push(n); }
  const kumeListesi = [...kumeler.entries()].map(([ilce, liste]) => ({ ilce, liste, merkez: kumeMerkezi(liste) }));
  // Kümeleri sırala: başlangıçtan itibaren en yakın küme merkezi zinciri
  const siraliKumeler: typeof kumeListesi = [];
  const kalan = [...kumeListesi];
  let simdi = baslangic;
  while (kalan.length) {
    let idx = 0;
    if (simdi) { let enKisa = Infinity; kalan.forEach((k, i) => { if (!k.merkez) return; const d = mesafeM(simdi!.lat, simdi!.lng, k.merkez.lat, k.merkez.lng); if (d < enKisa) { enKisa = d; idx = i; } }); }
    const [k] = kalan.splice(idx, 1);
    siraliKumeler.push(k);
    if (k.merkez) simdi = k.merkez;
  }
  const sonuc: string[] = [];
  let kumeBaslangic = baslangic;
  for (const k of siraliKumeler) {
    const koordinatli = k.liste.filter((n) => n.lat != null && n.lng != null);
    const koordinatsiz = k.liste.filter((n) => n.lat == null || n.lng == null);
    const sira = ikiOpt(enYakinKomsu(kumeBaslangic, koordinatli), kumeBaslangic);
    sonuc.push(...sira.map((n) => n.id), ...koordinatsiz.map((n) => n.id));
    const son = sira.at(-1);
    if (son) kumeBaslangic = { lat: son.lat!, lng: son.lng! };
  }
  return sonuc;
}
