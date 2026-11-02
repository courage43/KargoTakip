export interface Konum { lat: number; lng: number; accuracyM: number | null }

/** Yüksek doğruluklu tek konum; zaman aşımında en iyi bilinen */
export function konumAl(timeoutMs = 12000): Promise<Konum | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    let enIyi: Konum | null = null;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const k = { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy ?? null };
        if (!enIyi || (k.accuracyM ?? 1e9) < (enIyi.accuracyM ?? 1e9)) enIyi = k;
        if ((k.accuracyM ?? 1e9) <= 25) { navigator.geolocation.clearWatch(id); resolve(k); }
      },
      () => { navigator.geolocation.clearWatch(id); resolve(enIyi); },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
    setTimeout(() => { navigator.geolocation.clearWatch(id); resolve(enIyi); }, timeoutMs + 500);
  });
}

/** Görüntüyü küçült (uzun kenar maks 1280, jpeg ~0.7) → ≤ ~300 KB */
export async function fotoKucult(dosya: File | Blob, maxKenar = 1280, kalite = 0.72): Promise<Blob> {
  const bmp = await createImageBitmap(dosya).catch(() => null);
  if (!bmp) return dosya;
  const oran = Math.min(1, maxKenar / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * oran); c.height = Math.round(bmp.height * oran);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? dosya), "image/jpeg", kalite));
}
