const BASE = import.meta.env.VITE_API_URL ?? "";

export function tokenAl(): string | null { return localStorage.getItem("kurye_token"); }
export function tokenKaydet(t: string | null) { if (t) localStorage.setItem("kurye_token", t); else localStorage.removeItem("kurye_token"); }

export class ApiHata extends Error { constructor(public status: number, mesaj: string) { super(mesaj); } }

export async function api<T>(yol: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const t = tokenAl();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const r = await fetch(`${BASE}${yol}`, { ...init, headers });
  if (r.status === 401) { tokenKaydet(null); window.location.href = "/giris"; throw new ApiHata(401, "Oturum süresi doldu"); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiHata(r.status, (data as { hata?: string }).hata ?? "Hata");
  return data as T;
}

export interface Gonderi {
  id: string; kampanyaId: string; kampanyaAd: string; durum: string; siraNo: number | null; barkod?: string | null; denemeSayisi: number;
  uye: { unvan: string; tabelaUnvani: string | null; sicilNo: string; cepTelefonu: string | null; isTelefonu: string | null; yetkili: string | null };
  adres: { id: string; metin: string; ilce: string | null; lat: number | null; lng: number | null; konumDurumu: string; kuryeNotu: string | null };
  tercih: string | null; uyeNotu: string | null; komsuBilgisi: string | null; alternatifAdres: string | null; uygunSaat: string | null;
  sonDeneme: { sonuc: string; sunucuZamani: string } | null;
}

export interface Ben { id: string; ad: string; firma: string | null; rotaAcik: boolean; navigasyon: "google" | "yandex" | "apple" }
