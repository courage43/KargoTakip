export const tarih = (d: Date | string | null | undefined, saat = true) => {
  if (!d) return "-";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleString("tr-TR", saat ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" });
};
export const yuzde = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const telefonGoster = (t: string | null | undefined) => (t ? `0${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 8)} ${t.slice(8)}` : "-");
