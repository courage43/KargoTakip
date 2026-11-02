import Link from "next/link";
import { notFound } from "next/navigation";
import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RotaOynatici } from "@/components/RotaOynatici";
import { tarih } from "@/lib/format";
import { GONDERI_DURUMU_ETIKET, GONDERI_DURUMU_RENK } from "@dagitim/shared";

export default async function RotaDetay({ params }: { params: Promise<{ id: string }> }) {
  const o = await oturumGerekli(["ODA_ADMIN", "KURYE_FIRMA_YONETICI"]);
  const { id } = await params;
  const r = await prisma.route.findUnique({ where: { id }, include: { courier: { include: { courierCompany: true } }, campaign: true } });
  if (!r) notFound();
  if (o.rol === "KURYE_FIRMA_YONETICI" && r.courier.courierCompanyId !== o.companyId) notFound();
  const bitis = r.bitis ?? new Date();
  const [konumlar, denemeler] = await Promise.all([
    prisma.courierLocation.findMany({ where: { courierId: r.courierId, zaman: { gte: r.baslangic, lte: bitis } }, orderBy: { zaman: "asc" }, select: { lat: true, lng: true, zaman: true, accuracyM: true } }),
    prisma.deliveryAttempt.findMany({ where: { courierId: r.courierId, sunucuZamani: { gte: r.baslangic, lte: bitis } }, include: { shipment: { include: { member: { select: { unvan: true } } } } }, orderBy: { sunucuZamani: "asc" } }),
  ]);
  const geri = o.rol === "ODA_ADMIN" ? "/admin/rotalar" : "/firma/rotalar";
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-500"><Link className="underline" href={geri}>Rotalar</Link> · {r.courier.courierCompany?.ad ?? ""}{r.campaign ? ` · ${r.campaign.ad}` : ""}</div>
        <h1 className="text-2xl font-semibold">{r.courier.adSoyad} — {tarih(r.baslangic, false)}</h1>
        <div className="text-sm text-gray-600">{tarih(r.baslangic)} → {r.bitis ? tarih(r.bitis) : "açık"} · {r.mesafeM != null ? `${(r.mesafeM / 1000).toFixed(1)} km` : "mesafe hesaplanmadı"} · {konumlar.length} konum · {denemeler.length} deneme</div>
      </div>
      <RotaOynatici
        kuryeAd={r.courier.adSoyad}
        konumlar={konumlar.map((k) => ({ lat: k.lat, lng: k.lng, t: k.zaman.getTime() }))}
        denemeler={denemeler.filter((d) => d.lat != null).map((d) => ({ id: d.id, lat: d.lat!, lng: d.lng!, t: d.sunucuZamani.getTime(), renk: GONDERI_DURUMU_RENK[d.sonuc], etiket: `${d.shipment.member.unvan} · ${GONDERI_DURUMU_ETIKET[d.sonuc]} · ${tarih(d.sunucuZamani)}`, href: o.rol === "ODA_ADMIN" ? `/admin/gonderiler/${d.shipmentId}` : undefined }))}
      />
      <div className="card"><table className="table">
        <thead><tr><th>Saat</th><th>Üye</th><th>Sonuç</th><th>Adrese uzaklık</th><th>Konum</th></tr></thead>
        <tbody>{denemeler.map((d) => <tr key={d.id}><td className="text-xs">{tarih(d.sunucuZamani)}</td><td>{o.rol === "ODA_ADMIN" ? <Link className="underline" href={`/admin/gonderiler/${d.shipmentId}`}>{d.shipment.member.unvan}</Link> : d.shipment.member.unvan}</td><td><span className="badge text-white" style={{ background: GONDERI_DURUMU_RENK[d.sonuc] }}>{GONDERI_DURUMU_ETIKET[d.sonuc]}</span></td><td>{d.adresMesafesiM != null ? `${d.adresMesafesiM} m` : "-"}</td><td className="text-xs">{d.lat != null ? `${d.lat.toFixed(5)}, ${d.lng!.toFixed(5)}` : <span className="text-red-700">GPS yok</span>}</td></tr>)}
        {!denemeler.length && <tr><td colSpan={5} className="text-center text-gray-500 py-4">Bu rotada teslimat denemesi yok</td></tr>}</tbody></table></div>
    </div>
  );
}
