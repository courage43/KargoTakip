import { NextResponse } from "next/server";
import { bearerOturum, type Oturum } from "./auth";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: cors });
}

export function options() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/** Kurye API'leri: Bearer JWT zorunlu, rol KURYE */
export async function kuryeGerekli(req: Request): Promise<Oturum | NextResponse> {
  const o = await bearerOturum(req);
  if (!o) return json({ hata: "Oturum gerekli" }, 401);
  if (o.rol !== "KURYE") return json({ hata: "Yalnızca kurye" }, 403);
  return o;
}
