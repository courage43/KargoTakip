/** İki nokta arası mesafe (metre), Haversine */
export function mesafeM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Harita uygulaması için yol tarifi linki */
export function navigasyonLinki(
  hedef: { lat?: number | null; lng?: number | null; adres: string },
  saglayici: "google" | "yandex" | "apple" = "google",
): string {
  const koordinatVar = hedef.lat != null && hedef.lng != null;
  if (saglayici === "yandex") {
    return koordinatVar
      ? `https://yandex.com.tr/maps/?rtext=~${hedef.lat},${hedef.lng}&rtt=auto`
      : `https://yandex.com.tr/maps/?text=${encodeURIComponent(hedef.adres)}`;
  }
  if (saglayici === "apple") {
    return koordinatVar
      ? `https://maps.apple.com/?daddr=${hedef.lat},${hedef.lng}`
      : `https://maps.apple.com/?q=${encodeURIComponent(hedef.adres)}`;
  }
  return koordinatVar
    ? `https://www.google.com/maps/dir/?api=1&destination=${hedef.lat},${hedef.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hedef.adres)}`;
}
