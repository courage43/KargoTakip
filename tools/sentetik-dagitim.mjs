import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";
const n = Number(process.argv[2] ?? 300), out = process.argv[3];
const rows = [["UYE SICIL NO", "UNVAN"]];
for (let i = 1; i <= n; i++) rows.push([String(100000 + i), "x"]);
rows.push(["999999", "OLMAYAN FIRMA"]);
const ws = XLSX.utils.aoa_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Dağıtım");
writeFileSync(out, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("dağıtım listesi yazıldı", n);
