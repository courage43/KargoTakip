import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DurumRozeti, KonumRozeti } from "@/components/DurumRozeti";
import { Harita } from "@/components/Harita";
import { gonderiDurumElle } from "@/app/actions/admin";
import { tarih, telefonGoster } from "@/lib/format";
import { GONDERI_DURUMU_ETIKET, GONDERI_DURUMU_RENK, UYE_TERCIHI_ETIKET, TESLIM_ALAN_ETIKET } from "@dagitim/shared";

export default async function GonderiDetay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await prisma.shipment.findUnique({ where: { id }, include: { campaign: true, member: true, memberAddress: true, assignedCourier: true, denemeler: { orderBy: { sunucuZamani: "asc" }, include: { courier: true } }, smsLoglari: true } });
  if (!g) notFound();
  const a = g.memberAddress;
  type Olay = { t: Date; metin: string; renk?: string; detay?: React.ReactNode };
  const olaylar: Olay[] = [{ t: g.createdAt, metin: "Gönderi oluşturuldu" }];
  for (const s of g.smsLoglari) olaylar.push({ t: s.createdAt, metin: `SMS ${s.durum.toLowerCase()} (${telefonGoster(s.telefon)})` });
  if (g.tercihTarihi && g.uyeTercihi) olaylar.push({ t: g.tercihTarihi, metin: `Üye tercihi: ${UYE_TERCIHI_ETIKET[g.uyeTercihi]}${g.komsuBilgisi ? ` · ${g.komsuBilgisi}` : ""}${g.alternatifAdres ? ` · ${g.alternatifAdres}` : ""}${g.uyeNotu ? ` · "${g.uyeNotu}"` : ""}` });
  if (g.atamaTarihi) olaylar.push({ t: g.atamaTarihi, metin: `${g.assignedCourier?.adSoyad ?? "Kurye"} kuryesine atandı` });
  for (const [i, d] of g.denemeler.entries()) olaylar.push({
    t: d.sunucuZamani, renk: GONDERI_DURUMU_RENK[d.sonuc],
    metin: `Deneme ${i + 1}: ${GONDERI_DURUMU_ETIKET[d.sonuc]} — ${d.courier.adSoyad}`,
    detay: (
      <div className="text-xs text-gray-600 space-y-1 mt-1">
        {d.teslimAlanAdi && <div>Teslim alan: {d.teslimAlanAdi}{d.teslimAlanIliskisi ? ` (${TESLIM_ALAN_ETIKET[d.teslimAlanIliskisi]})` : ""}</div>}
        {d.not && <div>Not: {d.not}</div>}
        {d.lat != null && <div>GPS: {d.lat.toFixed(5)}, {d.lng!.toFixed(5)}{d.accuracyM != null ? ` (±${Math.round(d.accuracyM)} m)` : ""}{d.adresMesafesiM != null ? ` · kayıtlı konuma ${d.adresMesafesiM} m` : ""}{d.adresMesafesiM != null && d.adresMesafesiM > 300 ? <span className="text-red-700 font-medium"> · UZAK</span> : ""}</div>}
        {d.konumSonucu === "KAYDEDILDI" && <div className="text-green-700">Konum üye adresine kaydedildi</div>}
        {d.konumSonucu === "CAKISMA" && <div className="text-red-700">Konum çakışması — <Link className="underline" href="/admin/konum-cakismalari">onay bekliyor</Link></div>}
        {d.offlineOlusturuldu && <div>Çevrimdışı kaydedildi, cihaz saati {tarih(d.cihazZamani)}</div>}
        <div className="flex gap-2 flex-wrap mt-1">
          {d.fotoUrls.map((f) => <a key={f} href={`/api/files/${f}`} target="_blank" rel="noreferrer"><img src={`/api/files/${f}`} alt="Teslimat fotoğrafı" className="h-24 rounded border" /></a>)}
          {d.imzaUrl && <a href={`/api/files/${d.imzaUrl}`} target="_blank" rel="noreferrer"><img src={`/api/files/${d.imzaUrl}`} alt="İmza" className="h-24 rounded border bg-white" /></a>}
        </div>
      </div>
    ),
  });
  olaylar.sort((x, y) => x.t.getTime() - y.t.getTime());
  const noktalar = [
    ...(a.geoLat != null ? [{ id: "adres", lat: a.geoLat, lng: a.geoLng!, renk: "#16a34a", etiket: "Kayıtlı adres konumu", tip: "adres" as const }] : []),
    ...g.denemeler.filter((d) => d.lat != null).map((d) => ({ id: d.id, lat: d.lat!, lng: d.lng!, renk: GONDERI_DURUMU_RENK[d.sonuc], etiket: `${GONDERI_DURUMU_ETIKET[d.sonuc]} · ${tarih(d.sunucuZamani)}` })),
  ];
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-gray-500"><Link className="underline" href={`/admin/dagitimlar/${g.campaignId}`}>{g.campaign.ad}</Link> · Sicil {g.member.sicilNo}</div>
        <h1 className="text-2xl font-semibold flex items-center gap-3"><Link className="underline" href={`/admin/uyeler/${g.memberId}`}>{g.member.unvan}</Link> <DurumRozeti durum={g.durum} /></h1>
        <div className="text-sm text-gray-700 mt-1">{a.adresMetni} <KonumRozeti durum={a.konumDurumu} /></div>
        {a.kuryeNotu && <div className="text-xs text-blue-800">Saha notu: {a.kuryeNotu}</div>}
        <div className="text-xs text-gray-500 mt-1">Tel: {telefonGoster(g.member.cepTelefonu)} · Kurye: {g.assignedCourier?.adSoyad ?? "atanmamış"} · Deneme: {g.denemeSayisi} · Üye linki: <code>/t/{g.token}</code></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Zaman çizelgesi</h2>
          <ol className="relative border-l border-gray-200 ml-2 space-y-4">
            {olaylar.map((o, i) => <li key={i} className="ml-4"><span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border border-white" style={{ background: o.renk ?? "#9ca3af" }} /><div className="text-xs text-gray-500">{tarih(o.t)}</div><div className="text-sm">{o.metin}</div>{o.detay}</li>)}
          </ol>
        </div>
        <div className="space-y-3">
          {noktalar.length ? <Harita noktalar={noktalar} yukseklik={320} /> : <div className="card p-4 text-sm text-gray-500">Konum bilgisi yok.</div>}
          <div className="card p-3 flex gap-2 flex-wrap text-sm">
            <span className="text-gray-500 py-1.5">Elle durum:</span>
            <form action={gonderiDurumElle.bind(null, g.id, "UYE_ISTEMEDI")}><button className="btn-secondary btn-sm">Üye istemedi</button></form>
            <form action={gonderiDurumElle.bind(null, g.id, "IADE")}><button className="btn-secondary btn-sm">İade</button></form>
            <form action={gonderiDurumElle.bind(null, g.id, "BEKLIYOR")}><button className="btn-secondary btn-sm">Tekrar dağıtıma al</button></form>
          </div>
        </div>
      </div>
    </div>
  );
}
