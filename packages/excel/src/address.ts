import { sadelestir } from "./normalize";

/** Adreslerde sık görülen kısaltmaları tek biçime indir */
const KISALTMALAR: [RegExp, string][] = [
  [/\bmahallesi\b|\bmah\b|\bmh\b/g, "mah"],
  [/\bcaddesi\b|\bcad\b|\bcd\b|\bcadde\b/g, "cad"],
  [/\bsokagi\b|\bsokak\b|\bsok\b|\bsk\b/g, "sok"],
  [/\bbulvari\b|\bbulvar\b|\bblv\b|\bbul\b/g, "blv"],
  [/\bapartmani\b|\bapartman\b|\bapt\b|\bap\b/g, "apt"],
  [/\bnumara\b|\bno\b|\bn\b/g, "no"],
  [/\bdaire\b|\bd\b|\bda\b/g, "d"],
  [/\bkat\b|\bk\b/g, "kat"],
  [/\bblok\b|\bbl\b/g, "blok"],
  [/\bplaza\b|\bplz\b/g, "plaza"],
  [/\bis merkezi\b|\bis mrk\b|\bim\b/g, "ismerkezi"],
  [/\bsitesi\b|\bsit\b/g, "sit"],
  [/\bmerkez\b|\bmrk\b/g, "mrk"],
  [/\bkucuk\b|\bkck\b/g, "kucuk"],
];

/** Karşılaştırma için normalize edilmiş adres */
export function adresNormalize(adres: string): string {
  let s = sadelestir(adres);
  // "no:5" gibi yapışık yazımlar sadelestir ile "no 5" olur; "no5" → "no 5"
  s = s.replace(/\b(no|d|kat|k|blok)(\d+)/g, "$1 $2");
  for (const [re, yerine] of KISALTMALAR) s = s.replace(re, yerine);
  // "no 5 d 3" → "no5 d3" tokenlerini yapıştır (sayı-eki birleşik olsun ki karşılaştırma stabil olsun)
  s = s.replace(/\b(no|d|kat|blok) (\d+[a-z]?)\b/g, "$1$2");
  return s.replace(/\s+/g, " ").trim();
}

const ILCE_RE = /([a-zA-ZçğıöşüÇĞİÖŞÜâîû\s]+?)\s*\/\s*([a-zA-ZçğıöşüÇĞİÖŞÜâîû\s]+)\s*$/;

/** "... Kadıköy/İstanbul" veya "... Kadıköy / İSTANBUL" sonundan ilçeyi çek */
export function ilceAyikla(adres: string): string | null {
  const m = adres.trim().match(ILCE_RE);
  if (m) {
    const ilce = m[1].trim().split(/\s+/).slice(-1)[0];
    return ilce ? baslikHarf(ilce) : null;
  }
  return null;
}

export function ilAyikla(adres: string): string | null {
  const m = adres.trim().match(ILCE_RE);
  return m ? baslikHarf(m[2].trim()) : null;
}

function baslikHarf(s: string): string {
  const l = s.toLocaleLowerCase("tr-TR");
  return l.charAt(0).toLocaleUpperCase("tr-TR") + l.slice(1);
}

/** Jaro-Winkler benzerliği, 0..1 */
export function benzerlik(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aM = new Array(a.length).fill(false);
  const bM = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - matchWindow);
    const hi = Math.min(b.length - 1, i + matchWindow);
    for (let j = lo; j <= hi; j++) {
      if (!bM[j] && a[i] === b[j]) { aM[i] = bM[j] = true; matches++; break; }
    }
  }
  if (!matches) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aM[i]) continue;
    while (!bM[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  t /= 2;
  const jaro = (matches / a.length + matches / b.length + (matches - t) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) { if (a[i] === b[i]) prefix++; else break; }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/** Adres değişikliği sınıflandırması */
export type AdresFarki = "AYNI" | "YAZIM_FARKI" | "DEGISTI";

export function adresFarki(eskiNormalize: string, yeniNormalize: string): { tur: AdresFarki; skor: number } {
  if (eskiNormalize === yeniNormalize) return { tur: "AYNI", skor: 1 };
  const skor = benzerlik(eskiNormalize, yeniNormalize);
  return { tur: skor >= 0.9 ? "YAZIM_FARKI" : "DEGISTI", skor };
}
