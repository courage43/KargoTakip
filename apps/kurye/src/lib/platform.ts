/**
 * Platform katmanı: Capacitor (Android/iOS) ile tarayıcı (PWA) arasındaki farkları gizler.
 * Native'de: Geolocation plugin'i, arka plan konum izleme, push bildirimi.
 */
import { Capacitor } from "@capacitor/core";
import { api } from "./api";
import type { Konum } from "./konum";

export const isNative = () => Capacitor.isNativePlatform();
export const platformAdi = (): "android" | "ios" | "web" => (Capacitor.getPlatform() as "android" | "ios" | "web");

/** Native'de tek konum (yüksek doğruluk) */
export async function nativeKonumAl(timeoutMs = 12000): Promise<Konum | null> {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const izin = await Geolocation.requestPermissions();
    if (izin.location === "denied") return null;
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 });
    return { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy ?? null };
  } catch {
    return null;
  }
}

let watcherId: string | null = null;

/** Rota açıkken arka planda konum paylaşımı (bildirim çubuğunda kalıcı mesajla) */
export async function arkaPlanKonumBaslat(): Promise<boolean> {
  if (!isNative() || watcherId) return !!watcherId;
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const BackgroundGeolocation = registerPlugin<import("@capacitor-community/background-geolocation").BackgroundGeolocationPlugin>("BackgroundGeolocation");
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "Rota açık: konumunuz dağıtım merkeziyle paylaşılıyor.",
        backgroundTitle: "Dağıtım Kurye",
        requestPermissions: true,
        stale: false,
        distanceFilter: 30,
      },
      (konum, hata) => {
        if (hata) { if (hata.code === "NOT_AUTHORIZED") console.warn("Arka plan konum izni yok"); return; }
        if (!konum) return;
        api("/api/kurye/konum", { method: "POST", body: JSON.stringify({ lat: konum.latitude, lng: konum.longitude, accuracyM: konum.accuracy, hiz: konum.speed ?? null }) }).catch(() => {});
      },
    );
    return true;
  } catch (e) {
    console.warn("arka plan konum başlatılamadı", e);
    return false;
  }
}

export async function arkaPlanKonumDurdur() {
  if (!isNative() || !watcherId) return;
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const BackgroundGeolocation = registerPlugin<import("@capacitor-community/background-geolocation").BackgroundGeolocationPlugin>("BackgroundGeolocation");
    await BackgroundGeolocation.removeWatcher({ id: watcherId });
  } catch { /* yok */ }
  watcherId = null;
}

/** Push kaydı: token'ı sunucuya yazar; bildirim gelince/dokunulunca callback */
export async function pushKaydet(onBildirim: (veri: Record<string, string>, dokunuldu: boolean) => void): Promise<void> {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const izin = await PushNotifications.requestPermissions();
    if (izin.receive !== "granted") return;
    await PushNotifications.addListener("registration", async (t) => {
      try { await api("/api/kurye/cihaz", { method: "POST", body: JSON.stringify({ token: t.value, platform: platformAdi() }) }); localStorage.setItem("push_token", t.value); } catch { /* yok */ }
    });
    await PushNotifications.addListener("registrationError", (e) => console.warn("push kayıt hatası", e));
    await PushNotifications.addListener("pushNotificationReceived", (n) => onBildirim((n.data ?? {}) as Record<string, string>, false));
    await PushNotifications.addListener("pushNotificationActionPerformed", (a) => onBildirim((a.notification.data ?? {}) as Record<string, string>, true));
    if (platformAdi() === "android") {
      await PushNotifications.createChannel({ id: "dagitim", name: "Dağıtım bildirimleri", description: "Yeni atama ve üye tercihleri", importance: 4, sound: "default", visibility: 1 }).catch(() => {});
    }
    await PushNotifications.register();
  } catch (e) {
    console.warn("push kullanılamıyor", e);
  }
}

export async function pushSil() {
  const t = localStorage.getItem("push_token");
  if (t) { try { await api("/api/kurye/cihaz", { method: "DELETE", body: JSON.stringify({ token: t }) }); } catch { /* yok */ } localStorage.removeItem("push_token"); }
}
