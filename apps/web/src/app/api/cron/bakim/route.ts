import { NextResponse } from "next/server";
import { kuyruguIsle, raporlariGuncelle } from "@/lib/sms/kuyruk";
import { geocodeKuyruguIsle } from "@/lib/geocode/kuyruk";
import { bakimCalistir } from "@/lib/bakim";

/**
 * Tek zamanlanmış uç (dakikada bir çağrılır): SMS kuyruğu + rapor, geocode kuyruğu, uzun rota kapatma, eski konum temizliği.
 * Yetki: ?key=CRON_KEY veya Authorization: Bearer CRON_KEY
 */
export async function GET(req: Request) {
  const key = process.env.CRON_KEY;
  const url = new URL(req.url);
  const verilen = url.searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!key || verilen !== key) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const sonuc: Record<string, unknown> = { ok: true };
  try {
    let sms = 0;
    for (let i = 0; i < 20; i++) { const n = await kuyruguIsle(100); sms += n; if (n === 0) break; }
    sonuc.sms = sms;
    sonuc.smsRapor = await raporlariGuncelle();
  } catch (e) { sonuc.smsHata = (e as Error).message; }
  try { sonuc.geocode = await geocodeKuyruguIsle(60, 40000); } catch (e) { sonuc.geocodeHata = (e as Error).message; }
  try { sonuc.bakim = await bakimCalistir(); } catch (e) { sonuc.bakimHata = (e as Error).message; }
  return NextResponse.json(sonuc);
}
