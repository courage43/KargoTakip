/** Türkçe karakterleri sadeleştir, küçük harfe çevir, boşluk ve noktalamayı tekle */
export function sadelestir(s: unknown): string {
  return String(s ?? "")
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Başlık anahtarı: boşluksuz sade metin ("CEP TELEFONU (GSM) " → "ceptelefonugsm") */
export function baslikAnahtari(s: unknown): string {
  return sadelestir(s).replace(/\s+/g, "");
}

/** Telefonu 10 haneli ulusal biçime indir (5xxxxxxxxx / 2xxxxxxxxx); geçersizse null */
export function telefonNormalize(s: unknown): string | null {
  if (s == null) return null;
  let d = String(s).replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0090")) d = d.slice(4);
  else if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  if (d.length !== 10) return null;
  return d;
}

export function cepTelefonuMu(t: string | null): boolean {
  return !!t && t.startsWith("5");
}
