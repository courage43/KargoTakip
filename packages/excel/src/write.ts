import * as XLSX from "xlsx";

/** Satır dizisini xlsx buffer'a yaz (dışa aktarım) */
export function exceleYaz(sayfalar: { ad: string; satirlar: Record<string, unknown>[] }[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const s of sayfalar) {
    const ws = XLSX.utils.json_to_sheet(s.satirlar);
    // sütun genişlikleri
    const keys = Object.keys(s.satirlar[0] ?? {});
    ws["!cols"] = keys.map((k) => ({ wch: Math.min(60, Math.max(12, k.length + 2)) }));
    XLSX.utils.book_append_sheet(wb, ws, s.ad.slice(0, 31));
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
