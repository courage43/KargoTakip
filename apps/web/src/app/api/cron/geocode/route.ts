import { NextResponse } from "next/server";
import { geocodeKuyruguIsle, geocodeOzeti } from "@/lib/geocode/kuyruk";

export async function GET(req: Request) {
  const key = process.env.CRON_KEY;
  const url = new URL(req.url);
  const verilen = url.searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!key || verilen !== key) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  try {
    const r = await geocodeKuyruguIsle(Number(url.searchParams.get("limit") ?? 60), 50000);
    return NextResponse.json({ ok: true, ...r, ozet: await geocodeOzeti() });
  } catch (e) {
    return NextResponse.json({ ok: false, hata: (e as Error).message }, { status: 500 });
  }
}
