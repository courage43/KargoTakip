import type { SmsSaglayici } from "./types";

/** Geliştirme/test sağlayıcısı: göndermez, konsola yazar, hep başarılı. 'HATA' içeren mesaj → hata simülasyonu. */
export const sahteSaglayici: SmsSaglayici = {
  ad: "sahte",
  async gonder({ telefon, mesaj }) {
    if (mesaj.includes("[HATA]")) return { durum: "HATA", hata: "Sahte sağlayıcı: simüle edilmiş hata" };
    console.log(`[SMS sahte] → 0${telefon}: ${mesaj.slice(0, 80)}${mesaj.length > 80 ? "…" : ""}`);
    return { durum: "GONDERILDI", saglayiciMesajId: `sahte-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  },
  async raporSorgula(ids) {
    return Object.fromEntries(ids.map((id) => [id, "ILETILDI" as const]));
  },
};
