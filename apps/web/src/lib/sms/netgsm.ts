import type { SmsSaglayici, RaporDurumu } from "./types";

/** Netgsm hata kodları (SMS gönderim) */
export const NETGSM_KODLAR: Record<string, string> = {
  "20": "Mesaj metni hatalı veya karakter sınırı aşıldı",
  "30": "Geçersiz kullanıcı adı/şifre veya API erişim izni yok",
  "40": "Mesaj başlığı (gönderici adı) sistemde tanımlı değil",
  "50": "Abone hesabı ile İYS kontrollü gönderim yapılamaz",
  "51": "Aboneliğe tanımlı İYS markası bulunamadı",
  "70": "Hatalı veya eksik parametre",
  "80": "Gönderim sınır aşımı",
  "85": "Mükerrer gönderim sınırı aşıldı",
};

/** Yanıt metnini ayrıştır: "00 1234567" → GONDERILDI jobid; "30" → HATA */
export function netgsmYanitAyristir(metin: string): { durum: "GONDERILDI" | "HATA"; saglayiciMesajId?: string; hata?: string } {
  const [kod, jobid] = metin.trim().split(/\s+/);
  if (["00", "01", "02"].includes(kod)) return { durum: "GONDERILDI", saglayiciMesajId: jobid ?? undefined, ...(kod !== "00" ? { hata: kod === "01" ? "Gönderim tarihi düzeltildi" : "Bitiş tarihi düzeltildi" } : {}) };
  return { durum: "HATA", hata: `Netgsm ${kod}: ${NETGSM_KODLAR[kod] ?? "Bilinmeyen hata"}` };
}

/** Rapor satırı: "jobid durumkodu ..." — 0 bekliyor, 1 iletildi, 2 zaman aşımı, 3 hatalı numara, 4 operatöre iletilemedi … */
export function netgsmRaporAyristir(metin: string): Record<string, RaporDurumu> {
  const r: Record<string, RaporDurumu> = {};
  for (const satir of metin.split(/\r?\n/)) {
    const p = satir.trim().split(/\s+/);
    if (p.length < 2) continue;
    const kod = p[1];
    r[p[0]] = kod === "1" ? "ILETILDI" : kod === "0" ? "BEKLIYOR" : "HATA";
  }
  return r;
}

export function netgsmSaglayici(usercode: string, password: string): SmsSaglayici {
  const auth = { usercode, password };
  return {
    ad: "netgsm",
    async gonder({ telefon, mesaj, baslik }) {
      const u = new URL("https://api.netgsm.com.tr/sms/send/get");
      Object.entries({ ...auth, gsmno: telefon, message: mesaj, msgheader: baslik, dil: "TR", filter: "0" }).forEach(([k, v]) => u.searchParams.set(k, v));
      try {
        const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
        return netgsmYanitAyristir(await r.text());
      } catch (e) {
        return { durum: "HATA", hata: `Ağ hatası: ${(e as Error).message}` };
      }
    },
    async raporSorgula(ids) {
      const sonuc: Record<string, RaporDurumu> = {};
      for (const id of ids) {
        const u = new URL("https://api.netgsm.com.tr/sms/report");
        Object.entries({ ...auth, bulkid: id, type: "1", version: "2" }).forEach(([k, v]) => u.searchParams.set(k, v));
        try {
          const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
          const metin = await r.text();
          // tek bulkid sorgusunda satırlar "numara durum ..." döner; toplu özet için ilk duruma bak
          const satirlar = metin.trim().split(/\r?\n/).map((s) => s.trim().split(/\s+/)).filter((p) => p.length >= 2 && /^\d+$/.test(p[0]));
          if (!satirlar.length) { if (/^(30|40|60|70|100|101)$/.test(metin.trim())) sonuc[id] = "HATA"; continue; }
          const kodlar = satirlar.map((p) => p[1]);
          sonuc[id] = kodlar.every((k) => k === "1") ? "ILETILDI" : kodlar.some((k) => k === "0") ? "BEKLIYOR" : "HATA";
        } catch { /* sonraki turda tekrar */ }
      }
      return sonuc;
    },
  };
}
