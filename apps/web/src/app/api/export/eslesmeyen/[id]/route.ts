import { NextResponse } from "next/server";
import { oturumAl } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exceleYaz } from "@dagitim/excel";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== "ODA_ADMIN") return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const b = await prisma.importBatch.findUnique({ where: { id } });
  const r = (b?.hataRaporu as { eslesmeyen?: { satirNo: number; sicilNo: string; unvan?: string }[] } | null)?.eslesmeyen ?? [];
  const buf = exceleYaz([{ ad: "Eşleşmeyen", satirlar: r.length ? r.map((x) => ({ "Satır": x.satirNo, "Üye Sicil No": x.sicilNo, "Unvan": x.unvan ?? "" })) : [{ Bilgi: "Yok" }] }]);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="eslesmeyen.xlsx"` } });
}
