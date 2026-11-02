import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";
const BASLIKLAR = "SIRA NO\tUYE SICIL NO\tUNVAN\tTABELA UNVANI\tUYRUK\tSIRKET TIPI\tTICARET SICIL NO\tTSM ADI\tSERMAYE\tADRES TIPI\tADRES\tIS TELEFONU\tBURO TELEFONU\tFAKS\tCEP TELEFONU (GSM) \tEV TELEFONU\tYETKİLİ ADI SOYADI/UNVAN\tTÜZEL FİRMA GERÇEK KİŞİ TEMSİLCİSİ\tGOREVI\tYETKI BAŞLANGIÇ TARİHİ\tYETKI BİTİŞ TARİHİ\tBABA ADI\tDOGUM TARIHI\tDOGUM YERI\tDERECE\tKIMLIK NO\tVERGI NO\tMERSIS NO\tKURULUS TARIHI\tUYE KAYIT TARIHI\tUYE ODA KARAR TARIHI\tVERGI DAIRESI\tVERGI TERK TARIHI\tE-POSTA\tWEB ADRESI\tACIKLAMA\tDURUM TANIMI\tDURUM DEGISIM TARIHI\tDURUM DEGISIM NEDENI\tFAALIYET DETAYI\tODA BOLGE KODU\tMESLEK GRUBU\tNACE FAALIYET KODU\tNACE FAALIYET ADI\tISCI SAYISI\tSMMM ADI SOYADI\tKAYIT KARAR NO\tSUBE ADI".split("\t");
const ILCELER = ["Kadıköy","Üsküdar","Beşiktaş","Şişli","Fatih","Bakırköy","Maltepe","Ataşehir","Pendik","Kartal"];
const MAH = ["Atatürk","Cumhuriyet","Yeni","Fatih","İnönü","Bahçelievler","Merkez","Çamlık","Gülbahar","Esentepe"];
const SOK = ["Çiçek Sk.","Gül Cad.","Lale Sk.","Menekşe Cad.","Zambak Sk.","Papatya Cad.","Orkide Sk.","Sümbül Cad."];
const TUR = ["LTD. ŞTİ.","A.Ş.","TİC. LTD. ŞTİ.","SAN. VE TİC. A.Ş."];
const AD = ["AKSOY","DEMİR","YILMAZ","KAYA","ÇELİK","ŞAHİN","ARSLAN","DOĞAN","KURT","ÖZTÜRK","AYDIN","POLAT","KOÇ","ERDOĞAN","GÜNEŞ"];
const n = Number(process.argv[2] ?? 5000), out = process.argv[3], degistir = process.argv[4] === "degistir";
const rows = [BASLIKLAR];
let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
for (let i = 1; i <= n; i++) {
  const ilce = ILCELER[i % ILCELER.length];
  let adres = `${MAH[i % MAH.length]} Mah. ${SOK[i % SOK.length]} No:${(i % 120) + 1}${i % 3 === 0 ? ` D:${(i % 9) + 1}` : ""} ${ilce}/İSTANBUL`;
  if (degistir) {
    if (i % 100 === 1) adres = `${MAH[(i + 3) % MAH.length]} Mahallesi ${SOK[(i + 5) % SOK.length]} No:${(i % 50) + 200} ${ILCELER[(i + 1) % ILCELER.length]}/İSTANBUL`; // gerçek değişiklik (%1)
    else if (i % 100 === 2) adres = adres.replace("Mah.", "Mahallesi").replace("Sk.", "Sokak").replace("Cad.", "Caddesi"); // yazım farkı → AYNI
    else if (i % 100 === 3) adres = adres + " (Giriş katı)"; // küçük ek → YAZIM_FARKI (>0.9)
  }
  const r = new Array(BASLIKLAR.length).fill("");
  r[0] = i; r[1] = String(100000 + i); r[2] = `${AD[i % AD.length]} ${AD[(i * 7) % AD.length]} ${TUR[i % TUR.length]}`; r[3] = `${AD[i % AD.length]} ${i % 2 ? "Market" : "Ticaret"}`;
  r[4] = "TC"; r[5] = TUR[i % TUR.length]; r[9] = "İş Adresi"; r[10] = adres; r[11] = `0216${String(1000000 + i).slice(-7)}`;
  r[14] = `05${String(300000000 + i * 13).slice(-9)}`; r[16] = `${AD[(i * 3) % AD.length]} ${AD[(i * 5) % AD.length]}`; r[21] = "BABA"; r[22] = "1980-01-01"; r[25] = String(10000000000 + i);
  r[33] = `firma${i}@ornek.com`; r[36] = i % 50 === 0 ? "ASKIDA" : "AKTİF"; r[40] = String((i % 12) + 1); r[41] = String((i % 30) + 1); r[43] = "Perakende ticaret"; r[44] = String(i % 20); r[47] = "Merkez";
  rows.push(r);
}
const ws = XLSX.utils.aoa_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Üyeler");
writeFileSync(out, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("yazıldı", out, n);
