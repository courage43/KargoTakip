import { NextResponse } from "next/server";
import { bearerOturum } from "@/lib/auth";
import { dosyaOku, mimeTahmin } from "@/lib/storage";

/** Fotoğraf/imza servis: yalnızca oturumu olan panel kullanıcıları ve kuryeler */
export async function GET(req: Request, { params }: { params: Promise<{ yol: string[] }> }) {
  const o = await bearerOturum(req);
  if (!o) return NextResponse.json({ hata: "Oturum gerekli" }, { status: 401 });
  const { yol } = await params;
  const d = await dosyaOku(yol.join("/"));
  if (!d) return NextResponse.json({ hata: "Bulunamadı" }, { status: 404 });
  return new NextResponse(new Uint8Array(d.veri), { headers: { "Content-Type": mimeTahmin(yol.join("/")), "Cache-Control": "private, max-age=3600" } });
}
