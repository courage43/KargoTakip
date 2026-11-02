import { NextResponse } from "next/server";
import { oturumAl, tokenUret } from "@/lib/auth";

export async function GET() {
  const o = await oturumAl();
  if (!o) return NextResponse.json({ hata: "Oturum yok" }, { status: 401 });
  return NextResponse.json({ token: await tokenUret(o, "12h") });
}
