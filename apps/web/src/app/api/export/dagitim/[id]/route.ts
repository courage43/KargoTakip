import { NextResponse } from "next/server";
import { oturumAl } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exceleYaz } from "@dagitim/excel";
import { kampanyaHakedis } from "@/lib/campaign";
import { GONDERI_DURUMU_ETIKET, UYE_TERCIHI_ETIKET, TESLIM_ALAN_ETIKET } from "@dagitim/shared";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol === "KURYE") return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const k = await prisma.campaign.findUnique({ where: { id } });
  if (!k) return NextResponse.json({ hata: "Yok" }, { status: 404 });
  if (o.rol === "KURYE_FIRMA_YONETICI" && k.courierCompanyId !== o.companyId) return NextResponse.json({ hata: "Yetkisiz" }, { status: 403 });
  const g = await prisma.shipment.findMany({ where: { campaignId: id }, include: { member: true, memberAddress: true, assignedCourier: true, denemeler: { orderBy: { sunucuZamani: "desc" }, take: 1, include: { courier: true } } }, orderBy: [{ memberAddress: { ilce: "asc" } }, { member: { unvan: "asc" } }] });
  const f = (d: Date | null | undefined) => (d ? d.toLocaleString("tr-TR") : "");
  const satirlar = g.map((x) => { const d = x.denemeler[0]; return {
    "Üye Sicil No": x.member.sicilNo, "Unvan": x.member.unvan, "Tabela Unvanı": x.member.tabelaUnvani ?? "", "Adres": x.memberAddress.adresMetni, "İlçe": x.memberAddress.ilce ?? "",
    "Durum": GONDERI_DURUMU_ETIKET[x.durum], "Kurye": x.assignedCourier?.adSoyad ?? "", "Deneme Sayısı": x.denemeSayisi,
    "Son İşlem": f(x.sonDenemeAt ?? x.sonDurumAt), "Teslim Alan": d?.teslimAlanAdi ?? "", "Teslim Alan İlişkisi": d?.teslimAlanIliskisi ? TESLIM_ALAN_ETIKET[d.teslimAlanIliskisi] : "",
    "Kurye Notu": d?.not ?? "", "Üye Tercihi": x.uyeTercihi ? UYE_TERCIHI_ETIKET[x.uyeTercihi] : "", "Üye Notu": x.uyeNotu ?? "",
    "GPS Enlem": d?.lat ?? "", "GPS Boylam": d?.lng ?? "", "Adrese Uzaklık (m)": d?.adresMesafesiM ?? "", "Konum Durumu": x.memberAddress.konumDurumu, "Fotoğraf": d?.fotoUrls.length ?? 0, "İmza": d?.imzaUrl ? "Var" : "",
  }; });
  const bulunamayan = satirlar.filter((s) => ["Adreste Bulunamadı", "Adres Hatalı", "Taşınmış"].includes(s["Durum"]));
  const kuryeOzet = Object.values(g.reduce<Record<string, { Kurye: string; Atanan: number; Teslim: number; Başarısız: number }>>((acc, x) => { const ad = x.assignedCourier?.adSoyad ?? "Atanmamış"; acc[ad] ??= { Kurye: ad, Atanan: 0, Teslim: 0, Başarısız: 0 }; acc[ad].Atanan++; if (["TESLIM_EDILDI", "KOMSUYA_BIRAKILDI", "ISYERINE_BIRAKILDI"].includes(x.durum)) acc[ad].Teslim++; if (["ADRESTE_BULUNAMADI", "ADRES_HATALI", "TASINMIS"].includes(x.durum)) acc[ad].Başarısız++; return acc; }, {}));
  const hakedis = await kampanyaHakedis(id, o.rol === "KURYE_FIRMA_YONETICI" ? o.companyId : null);
  const hakedisSatirlar = hakedis.map((h) => ({ "Kurye": h.kurye, "Gün": h.gun, "Teslim": h.teslim, "Başarısız": h.basarisiz, "Deneme": h.deneme, "İlk": h.ilk ? h.ilk.toLocaleTimeString("tr-TR") : "", "Son": h.son ? h.son.toLocaleTimeString("tr-TR") : "", "Rota km": h.rotaKm ?? "" }));
  const buf = exceleYaz([{ ad: "Sonuç", satirlar }, { ad: "Bulunamayanlar", satirlar: bulunamayan.length ? bulunamayan : [{ Bilgi: "Yok" }] }, { ad: "Kurye Özeti", satirlar: kuryeOzet }, { ad: "Hakediş", satirlar: hakedisSatirlar.length ? hakedisSatirlar : [{ Bilgi: "Henüz teslimat yok" }] }]);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${encodeURIComponent(k.ad)}-sonuc.xlsx"` } });
}
