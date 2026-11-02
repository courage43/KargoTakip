import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { kampanyaOzeti } from "@/lib/campaign";
import { kampanyaDurum, dagitimListesiYukle } from "@/app/actions/admin";
import { DurumRozeti, KonumRozeti } from "@/components/DurumRozeti";
import { GonderiFiltre } from "@/components/GonderiFiltre";
import { gonderiWhere, kampanyaIlceleri, gonderiInclude, type GonderiSp } from "@/lib/gonderi-sorgu";
import { tarih, yuzde } from "@/lib/format";
import { KAMPANYA_DURUMU_ETIKET, GONDERI_DURUMU_ETIKET, UYE_TERCIHI_ETIKET } from "@dagitim/shared";
import { KampanyaHarita } from "@/components/KampanyaHarita";
import { SmsKarti } from "@/components/SmsKarti";
import { HakedisTablosu } from "@/components/HakedisTablosu";
import { kampanyaHakedis } from "@/lib/campaign";
import { kampanyaSmsOzeti } from "@/lib/sms/kuyruk";
import { smsAyarlari, sablonDoldur, linkUret, mesajUzunluk, tarihAraligi, saglayiciAdi } from "@/lib/sms";

export default async function DagitimDetay({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<GonderiSp> }) {
  const { id } = await params;
  const sp = await searchParams;
  const k = await prisma.campaign.findUnique({ where: { id }, include: { courierCompany: true, importBatches: { orderBy: { createdAt: "desc" } } } });
  if (!k) notFound();
  const sayfa = Math.max(1, Number(sp.sayfa ?? 1));
  const where = gonderiWhere(id, sp);
  const [ozet, ilceler, kuryeler, toplamFiltre, gonderiler, kuryeOzet] = await Promise.all([
    kampanyaOzeti(id),
    kampanyaIlceleri(id),
    prisma.user.findMany({ where: { rol: "KURYE", courierCompanyId: k.courierCompanyId ?? undefined, aktif: true }, orderBy: { adSoyad: "asc" } }),
    prisma.shipment.count({ where }),
    prisma.shipment.findMany({ where, include: gonderiInclude, orderBy: [{ memberAddress: { ilce: "asc" } }, { member: { unvan: "asc" } }], skip: (sayfa - 1) * 100, take: 100 }),
    prisma.shipment.groupBy({ by: ["assignedCourierId", "durum"], where: { campaignId: id }, _count: { _all: true } }),
  ]);
  const kuryePerf = kuryeler.map((ku) => { const s = kuryeOzet.filter((x) => x.assignedCourierId === ku.id); const n = (d: string[]) => s.filter((x) => d.includes(x.durum)).reduce((a, b) => a + b._count._all, 0); return { ku, toplam: s.reduce((a, b) => a + b._count._all, 0), teslim: n(["TESLIM_EDILDI", "KOMSUYA_BIRAKILDI", "ISYERINE_BIRAKILDI"]), basarisiz: n(["ADRESTE_BULUNAMADI", "ADRES_HATALI", "TASINMIS"]) }; });
  const [smsOzet, smsAyar, tercihGrup, hakedis] = await Promise.all([kampanyaSmsOzeti(id), smsAyarlari(), prisma.shipment.groupBy({ by: ["uyeTercihi"], where: { campaignId: id, uyeTercihi: { not: null } }, _count: { _all: true } }), kampanyaHakedis(id)]);
  const ornekMesaj = sablonDoldur(k.smsSablonu || smsAyar.sablonTercih, { ODA: smsAyar.odaAdi, TARIH: tarihAraligi(k.planlananBaslangic, k.planlananBitis), LINK: linkUret("ornekTOKEN123456"), UNVAN: "Örnek Firma Ltd." });
  const uzunluk = mesajUzunluk(ornekMesaj);
  const tercihler = Object.fromEntries(tercihGrup.map((t) => [UYE_TERCIHI_ETIKET[t.uyeTercihi!], t._count._all]));
  const haritaNoktalari = await prisma.shipment.findMany({ where: { campaignId: id, memberAddress: { geoLat: { not: null } } }, select: { id: true, durum: true, member: { select: { unvan: true } }, memberAddress: { select: { geoLat: true, geoLng: true, konumDurumu: true } } }, take: 6000 });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">{k.tur === "DONEMSEL" ? "Dönemsel dağıtım" : "Özel gönderi"} · {k.courierCompany?.ad ?? "firma yok"} · {tarih(k.planlananBaslangic, false)} – {tarih(k.planlananBitis, false)}</div>
          <h1 className="text-2xl font-semibold">{k.ad} <span className="badge bg-gray-100 text-gray-700 align-middle">{KAMPANYA_DURUMU_ETIKET[k.durum]}</span></h1>
        </div>
        <div className="flex gap-2">
          {k.durum === "TASLAK" && ozet.toplam > 0 && <form action={kampanyaDurum.bind(null, k.id, "AKTIF")}><button className="btn-primary">Dağıtımı başlat (firma görür)</button></form>}
          {k.durum === "AKTIF" && <form action={kampanyaDurum.bind(null, k.id, "TAMAMLANDI")}><button className="btn-secondary">Tamamlandı olarak kapat</button></form>}
          {k.durum === "TAMAMLANDI" && <form action={kampanyaDurum.bind(null, k.id, "AKTIF")}><button className="btn-secondary">Yeniden aç</button></form>}
          <a className="btn-secondary" href={`/api/export/dagitim/${k.id}`}>Sonuç Excel</a>
          <a className="btn-secondary" href={`/api/export/etiket/${k.id}`} target="_blank" rel="noreferrer">🏷 Zarf etiketleri</a>
          <a className="btn-secondary" href={`/firma/dagitimlar/${k.id}/yazdir`} target="_blank" rel="noreferrer">🖨 Kurye listeleri</a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kutu etiket="Toplam gönderi" n={ozet.toplam} />
        <Kutu etiket="Teslim" n={ozet.teslim} renk="text-green-700" />
        <Kutu etiket="Bulunamadı / hatalı" n={ozet.basarisiz} renk="text-red-700" />
        <Kutu etiket="Atanmamış" n={ozet.ozet.BEKLIYOR ?? 0} />
        <Kutu etiket="Kalan" n={ozet.kalan} />
        <div className="card p-3"><div className="text-xs text-gray-500">İlerleme</div><div className="text-xl font-semibold">%{yuzde(ozet.kapali, ozet.toplam)}</div><div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden"><div className="h-full bg-green-600" style={{ width: `${yuzde(ozet.kapali, ozet.toplam)}%` }} /></div></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold">Dağıtım listesi yükle</h2>
          <form action={dagitimListesiYukle} className="space-y-2">
            <input type="hidden" name="campaignId" value={k.id} />
            <input name="dosya" type="file" accept=".xlsx,.xls,.csv" required className="input" />
            <button className="btn-primary btn-sm">Yükle</button>
            <p className="text-xs text-gray-500">En az "Üye Sicil No" sütunu olmalı. Zaten listede olan üyeler tekrar eklenmez.</p>
          </form>
          {k.importBatches.length > 0 && <ul className="text-xs space-y-1">{k.importBatches.map((b) => <li key={b.id}><Link className="underline" href={`/admin/yuklemeler/${b.id}`}>{b.dosyaAdi}</Link> · {b.eklenen} gönderi{b.eslesmeyen ? <span className="text-amber-700">, {b.eslesmeyen} eşleşmeyen</span> : ""} · {b.durum}</li>)}</ul>}
        </div>
        <div className="card p-4 lg:col-span-2">
          <h2 className="font-semibold mb-2">Kurye performansı</h2>
          <table className="table"><thead><tr><th>Kurye</th><th>Atanan</th><th>Teslim</th><th>Başarısız</th><th>Kalan</th><th>Oran</th></tr></thead>
            <tbody>{kuryePerf.filter((p) => p.toplam).map((p) => <tr key={p.ku.id}><td><Link className="underline" href={`?kurye=${p.ku.id}`}>{p.ku.adSoyad}</Link></td><td>{p.toplam}</td><td className="text-green-700">{p.teslim}</td><td className="text-red-700">{p.basarisiz}</td><td>{p.toplam - p.teslim - p.basarisiz}</td><td>%{yuzde(p.teslim, p.toplam)}</td></tr>)}
              {!kuryePerf.some((p) => p.toplam) && <tr><td colSpan={6} className="text-center text-gray-500 py-3">Henüz atama yapılmadı (kurye firması yöneticisi atar).</td></tr>}</tbody></table>
        </div>
      </div>

      {k.durum !== "TASLAK" && <SmsKarti campaignId={k.id} telefonlu={smsOzet.telefonlu} telefonsuz={smsOzet.telefonsuz} ozet={smsOzet.ozet} toplamParca={smsOzet.toplamParca} birimFiyat={smsAyar.birimFiyat} uygunTercih={smsOzet.uygunTercih} onizleme={ornekMesaj} parca={uzunluk.parca} turkce={uzunluk.turkce} saglayici={saglayiciAdi()} baslikVar={!!smsAyar.baslik} tercihler={tercihler} />}

      <KampanyaHarita campaignId={k.id} noktalar={haritaNoktalari.map((g) => ({ id: g.id, lat: g.memberAddress.geoLat!, lng: g.memberAddress.geoLng!, durum: g.durum, etiket: `${g.member.unvan} · ${GONDERI_DURUMU_ETIKET[g.durum]}${g.memberAddress.konumDurumu !== "DOGRULANDI" ? " · tahmini konum" : ""}`, href: `/admin/gonderiler/${g.id}`, tahmini: g.memberAddress.konumDurumu !== "DOGRULANDI" }))} />

      <HakedisTablosu satirlar={hakedis} />

      <section className="space-y-3">
        <h2 className="font-semibold">Gönderiler <span className="text-gray-500 font-normal">({toplamFiltre})</span></h2>
        <GonderiFiltre taban={`/admin/dagitimlar/${k.id}`} sp={sp as Record<string, string | undefined>} ilceler={ilceler} kuryeler={kuryeler} />
        <div className="card overflow-auto"><table className="table">
          <thead><tr><th>Üye</th><th>Adres</th><th>İlçe</th><th>Konum</th><th>Üye tercihi</th><th>Kurye</th><th>Durum</th><th>Son işlem</th></tr></thead>
          <tbody>{gonderiler.map((g) => <tr key={g.id}>
            <td><Link className="underline font-medium" href={`/admin/gonderiler/${g.id}`}>{g.member.unvan}</Link><div className="text-xs text-gray-500">{g.member.sicilNo}</div></td>
            <td className="text-xs max-w-xs">{g.memberAddress.adresMetni}</td><td>{g.memberAddress.ilce ?? "-"}</td>
            <td><KonumRozeti durum={g.memberAddress.konumDurumu} /></td>
            <td className="text-xs">{g.uyeTercihi ? UYE_TERCIHI_ETIKET[g.uyeTercihi] : "-"}</td>
            <td className="text-xs">{g.assignedCourier?.adSoyad ?? <span className="text-gray-400">—</span>}</td>
            <td><DurumRozeti durum={g.durum} /></td><td className="text-xs">{tarih(g.sonDurumAt)}</td>
          </tr>)}
          {!gonderiler.length && <tr><td colSpan={8} className="text-center text-gray-500 py-6">Gönderi yok</td></tr>}</tbody></table></div>
        {toplamFiltre > 100 && <div className="text-sm flex gap-2">{sayfa > 1 && <Link className="btn-secondary btn-sm" href={`?${new URLSearchParams({ ...(sp as Record<string, string>), sayfa: String(sayfa - 1) })}`}>← Önceki</Link>}<span className="py-1.5">Sayfa {sayfa} / {Math.ceil(toplamFiltre / 100)}</span>{sayfa * 100 < toplamFiltre && <Link className="btn-secondary btn-sm" href={`?${new URLSearchParams({ ...(sp as Record<string, string>), sayfa: String(sayfa + 1) })}`}>Sonraki →</Link>}</div>}
      </section>
    </div>
  );
}

function Kutu({ etiket, n, renk }: { etiket: string; n: number; renk?: string }) {
  return <div className="card p-3"><div className="text-xs text-gray-500">{etiket}</div><div className={`text-xl font-semibold ${renk ?? ""}`}>{n}</div></div>;
}
