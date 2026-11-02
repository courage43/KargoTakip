import type { PushSaglayici } from "./types";

/** Test sağlayıcısı: göndermez, loglar. "gecersiz-" ile başlayan token'ları geçersiz sayar. */
export let sahtePushSayac = 0;
export const sahtePush: PushSaglayici = {
  ad: "sahte",
  async gonder(tokenlar, mesaj) {
    const gecersiz = tokenlar.filter((t) => t.startsWith("gecersiz-"));
    const gecerli = tokenlar.filter((t) => !t.startsWith("gecersiz-"));
    sahtePushSayac += gecerli.length;
    if (gecerli.length) console.log(`[PUSH sahte] ${gecerli.length} cihaz → ${mesaj.baslik}: ${mesaj.govde}`);
    return { gonderilen: gecerli.length, gecersizTokenlar: gecersiz };
  },
};
