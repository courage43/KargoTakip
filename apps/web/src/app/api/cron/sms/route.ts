import { NextResponse } from "next/server";
import { kuyruguIsle, raporlariGuncelle } from "@/lib/sms/kuyruk";

/** Zamanlanmış tetikleyici: kuyruğu işler ve teslim raporlarını günceller. Yetki: ?key=CRON_KEY veya Authorization: Bearer CRON_KEY */
export async function GET(req: Request) {
  const key = process.env.CRON_KEY;
  const url = new URL(req.url);
  const verilen = url.searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!key || verilen !== key) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  try {
    let islenen = 0;
    for (let i = 0; i < 20; i++) { const n = await kuyruguIsle(100); islenen += n; if (n === 0) break; }
    const rapor = await raporlariGuncelle();
    return NextResponse.json({ ok: true, islenen, raporGuncellenen: rapor });
  } catch (e) {
    return NextResponse.json({ ok: false, hata: (e as Error).message }, { status: 500 });
  }
}
