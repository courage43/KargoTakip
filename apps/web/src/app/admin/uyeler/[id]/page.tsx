import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DurumRozeti, KonumRozeti } from "@/components/DurumRozeti";
import { UyeKartiIstemci } from "@/components/UyeKartiIstemci";
import { tarih, telefonGoster } from "@/lib/format";
import { GONDERI_DURUMU_RENK, GONDERI_DURUMU_ETIKET } from "@dagitim/shared";

export default async function UyeKarti({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await prisma.member.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ gecerlilikBitis: "desc" }, { isPrimary: "desc" }] },
      shipments: { orderBy: { createdAt: "desc" }, include: { campaign: true, assignedCourier: true, denemeler: { orderBy: { sunucuZamani: "desc" }, include: { courier: true } } } },
      adresTalepleri: { where: { karar: "BEKLIYOR" } },
    },
  });
  if (!u) notFound();
  const guncel = u.addresses.filter((a) => !a.gecerlilikBitis);
  const eski = u.addresses.filter((a) => a.gecerlilikBitis);
  const denemeNoktalari = u.shipments.flatMap((g) => g.denemeler.filter((d) => d.lat != null).map((d) => ({ id: d.id, lat: d.lat!, lng: d.lng!, renk: GONDERI_DURUMU_RENK[d.sonuc], etiket: `${GONDERI_DURUMU_ETIKET[d.sonuc]} · ${tarih(d.sunucuZamani)} · ${d.courier.adSoyad}` })));
  const raw = (u.rawData as Record<string, unknown> | null) ?? {};
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">Sicil {u.sicilNo} · {u.aktif ? "Aktif" : "Pasif"}</div>
          <h1 className="text-2xl font-semibold">{u.unvan}</h1>
          {u.tabelaUnvani && <div className="text-gray-600">{u.tabelaUnvani}</div>}
        </div>
        {u.adresTalepleri.length > 0 && <Link href="/admin/adres-degisiklikleri" className="badge bg-amber-100 text-amber-800">Bekleyen adres değişikliği: {u.adresTalepleri.length}</Link>}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 text-sm space-y-1">
          <div><span className="text-gray-500">Yetkili:</span> {u.yetkiliAdSoyad ?? "-"}</div>
          <div><span className="text-gray-500">Cep:</span> {telefonGoster(u.cepTelefonu)}</div>
          <div><span className="text-gray-500">İş tel:</span> {telefonGoster(u.isTelefonu)}</div>
          <div><span className="text-gray-500">E-posta:</span> {u.eposta ?? "-"}</div>
          <div><span className="text-gray-500">Meslek grubu:</span> {u.meslekGrubu ?? "-"} · <span className="text-gray-500">Bölge:</span> {u.odaBolgeKodu ?? "-"}</div>
          <div><span className="text-gray-500">Oda durumu:</span> {u.durumTanimi ?? "-"}</div>
          {Object.keys(raw).length > 0 && <details className="pt-2"><summary className="cursor-pointer text-gray-500">Ek bilgiler ({Object.keys(raw).length})</summary><dl className="mt-1 text-xs">{Object.entries(raw).map(([k, v]) => <div key={k}><span className="text-gray-500">{k}:</span> {String(v)}</div>)}</dl></details>}
        </div>
        <div className="lg:col-span-2 space-y-3">
          {guncel.map((a) => (
            <div key={a.id} className="card p-3 text-sm flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">{a.adresTipi ?? "Adres"}{a.isPrimary ? " · ana adres" : ""}{a.ilce ? ` · ${a.ilce}` : ""}</div>
                <div>{a.adresMetni}</div>
                {a.kuryeNotu && <div className="text-xs text-blue-800 mt-1">Saha notu: {a.kuryeNotu}</div>}
              </div>
              <div className="text-right space-y-1">
                <KonumRozeti durum={a.konumDurumu} />
                {a.verifiedCount > 0 && <div className="text-xs text-gray-500">{a.verifiedCount} kez doğrulandı · {tarih(a.lastVerifiedAt, false)}</div>}
              </div>
            </div>
          ))}
          {!guncel.length && <div className="card p-3 text-sm text-red-600">Güncel adres yok.</div>}
          {eski.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-gray-500">Eski adresler ({eski.length})</summary>{eski.map((a) => <div key={a.id} className="card p-2 mt-1 text-xs text-gray-600">{a.adresMetni} <span className="text-gray-400">· {tarih(a.gecerlilikBaslangic, false)} – {tarih(a.gecerlilikBitis, false)}{a.geoLat != null ? " · konum vardı" : ""}</span></div>)}</details>}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Konum ve saha notu</h2>
        <UyeKartiIstemci memberId={u.id} adresler={guncel.map((a) => ({ id: a.id, adresMetni: a.adresMetni, adresTipi: a.adresTipi, geoLat: a.geoLat, geoLng: a.geoLng, konumDurumu: a.konumDurumu, kuryeNotu: a.kuryeNotu, isPrimary: a.isPrimary, adayLat: a.adayLat, adayLng: a.adayLng }))} denemeNoktalari={denemeNoktalari} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Dağıtım geçmişi</h2>
        {!u.shipments.length && <p className="text-sm text-gray-500">Bu üyeye henüz gönderi oluşturulmadı.</p>}
        {u.shipments.map((g) => (
          <div key={g.id} className="card p-3 text-sm">
            <div className="flex items-center justify-between">
              <div><Link className="underline font-medium" href={`/admin/gonderiler/${g.id}`}>{g.campaign.ad}</Link> <span className="text-gray-500">· {tarih(g.createdAt, false)}</span>{g.assignedCourier && <span className="text-gray-500"> · {g.assignedCourier.adSoyad}</span>}</div>
              <DurumRozeti durum={g.durum} />
            </div>
            {g.denemeler.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-gray-700">
                {g.denemeler.map((d) => <li key={d.id}>• {tarih(d.sunucuZamani)} — {GONDERI_DURUMU_ETIKET[d.sonuc]} ({d.courier.adSoyad}){d.teslimAlanAdi ? ` · teslim alan: ${d.teslimAlanAdi}` : ""}{d.adresMesafesiM != null ? ` · adrese ${d.adresMesafesiM} m` : ""}{d.konumSonucu === "KAYDEDILDI" ? " · konum kaydedildi" : d.konumSonucu === "CAKISMA" ? " · konum çakışması" : ""}</li>)}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
