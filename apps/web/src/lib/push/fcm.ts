import type { PushSaglayici } from "./types";

/** Firebase Cloud Messaging (firebase-admin). Servis hesabı JSON'u base64 olarak FIREBASE_SERVICE_ACCOUNT_JSON env'inde. */
export function fcmSaglayici(serviceAccountBase64: string): PushSaglayici {
  let appP: Promise<typeof import("firebase-admin")> | null = null;
  const admin = () => (appP ??= (async () => {
    const fa = await import("firebase-admin");
    if (!fa.apps.length) {
      const sa = JSON.parse(Buffer.from(serviceAccountBase64, "base64").toString("utf8"));
      fa.initializeApp({ credential: fa.credential.cert(sa) });
    }
    return fa;
  })());
  return {
    ad: "fcm",
    async gonder(tokenlar, mesaj) {
      if (!tokenlar.length) return { gonderilen: 0, gecersizTokenlar: [] };
      const fa = await admin();
      const r = await fa.messaging().sendEachForMulticast({
        tokens: tokenlar,
        notification: { title: mesaj.baslik, body: mesaj.govde },
        data: mesaj.veri ?? {},
        android: { priority: "high", notification: { channelId: "dagitim", sound: "default" } },
        apns: { payload: { aps: { sound: "default" } } },
      });
      const gecersiz: string[] = [];
      r.responses.forEach((res, i) => {
        const kod = res.error?.code ?? "";
        if (!res.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(kod)) gecersiz.push(tokenlar[i]);
      });
      return { gonderilen: r.successCount, gecersizTokenlar: gecersiz };
    },
  };
}
