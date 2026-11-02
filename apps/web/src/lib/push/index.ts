import { prisma } from "../db";
import type { PushMesaj, PushSaglayici } from "./types";
import { sahtePush } from "./sahte";
import { fcmSaglayici } from "./fcm";

export * from "./types";

export function pushSaglayiciAdi(): string {
  return process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? "fcm" : "sahte";
}
export function pushSaglayiciAl(): PushSaglayici {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return sa ? fcmSaglayici(sa) : sahtePush;
}

/** Bir kuryenin tüm cihazlarına bildirim; geçersiz token'ları siler. Hata fırlatmaz. */
export async function kuryeyeBildir(userId: string, mesaj: PushMesaj): Promise<number> {
  try {
    const cihazlar = await prisma.deviceToken.findMany({ where: { userId } });
    if (!cihazlar.length) return 0;
    const r = await pushSaglayiciAl().gonder(cihazlar.map((c) => c.token), mesaj);
    if (r.gecersizTokenlar.length) await prisma.deviceToken.deleteMany({ where: { token: { in: r.gecersizTokenlar } } });
    return r.gonderilen;
  } catch (e) {
    console.error("push hatası", e);
    return 0;
  }
}

export async function kuryelereBildir(userIds: string[], mesaj: PushMesaj) {
  let n = 0;
  for (const id of [...new Set(userIds)]) n += await kuryeyeBildir(id, mesaj);
  return n;
}
