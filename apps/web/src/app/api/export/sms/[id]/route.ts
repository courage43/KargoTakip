import { NextResponse } from "next/server";
import { oturumAl } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exceleYaz } from "@dagitim/excel";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== "ODA_ADMIN") return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const liste = await prisma.smsLog.findMany({ where: { campaignId: id }, include: { shipment: { include: { member: true } } }, orderBy: { createdAt: "asc" } });
  const f = (d: Date | null | undefined) => (d ? d.toLocaleString("tr-TR") : "");
  const buf = exceleYaz([{ ad: "SMS", satirlar: liste.length ? liste.map((s) => ({ "Zaman": f(s.gonderimZamani ?? s.createdAt), "Üye Sicil No": s.shipment?.member.sicilNo ?? "", "Unvan": s.shipment?.member.unvan ?? "", "Telefon": `0${s.telefon}`, "Tür": s.sablon, "Durum": s.durum, "Parça": s.parcaSayisi, "Sağlayıcı": s.saglayici ?? "", "Sağlayıcı ID": s.saglayiciMesajId ?? "", "Hata": s.hata ?? "", "Rapor Zamanı": f(s.raporZamani), "Mesaj": s.mesaj })) : [{ Bilgi: "Kayıt yok" }] }]);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="sms-${id}.xlsx"` } });
}
