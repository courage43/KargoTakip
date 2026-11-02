import Link from "next/link";
import { prisma } from "@/lib/db";
import { kampanyaOzeti } from "@/lib/campaign";
import { yuzde, tarih } from "@/lib/format";
import { KAMPANYA_DURUMU_ETIKET } from "@dagitim/shared";
import { uyarilariGetir } from "@/lib/uyarilar";

export default async function Pano() {
  const [uyeSayisi, aktifUye, dogrulanmis, kampanyalar, sonYukleme] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { aktif: true } }),
    prisma.memberAddress.count({ where: { gecerlilikBitis: null, konumDurumu: "DOGRULANDI" } }),
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { courierCompany: true } }),
    prisma.importBatch.findFirst({ where: { tur: "GENEL_LISTE", durum: "TAMAMLANDI" }, orderBy: { createdAt: "desc" } }),
  ]);
  const [ozetler, uyarilar, adresBekleyen, cakisma, tahmini] = await Promise.all([
    Promise.all(kampanyalar.map((k) => kampanyaOzeti(k.id))),
    uyarilariGetir({ gun: 1 }).catch(() => []),
    prisma.addressChangeRequest.count({ where: { karar: "BEKLIYOR" } }),
    prisma.memberAddress.count({ where: { konumDurumu: "CAKISMA_BEKLIYOR" } }),
    prisma.memberAddress.count({ where: { gecerlilikBitis: null, konumDurumu: "TAHMINI" } }),
  ]);
  const dikkat = uyarilar.length + adresBekleyen + cakisma;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pano</h1>
      {dikkat > 0 && (
        <div className="card p-4 border-amber-300 bg-amber-50 text-sm flex flex-wrap gap-4 items-center">
          <span className="font-semibold">Dikkat gerektiren:</span>
          {uyarilar.length > 0 && <Link className="underline" href="/admin/uyarilar">{uyarilar.length} saha uyarısı (son 24 saat)</Link>}
          {adresBekleyen > 0 && <Link className="underline" href="/admin/adres-degisiklikleri">{adresBekleyen} adres değişikliği</Link>}
          {cakisma > 0 && <Link className="underline" href="/admin/konum-cakismalari">{cakisma} konum çakışması</Link>}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kart etiket="Toplam üye" deger={uyeSayisi} alt={`${aktifUye} aktif`} />
        <Kart etiket="Doğrulanmış konum" deger={dogrulanmis} alt={`%${yuzde(dogrulanmis, aktifUye)} · ${tahmini} tahmini`} />
        <Kart etiket="Son üye listesi" deger={sonYukleme ? tarih(sonYukleme.createdAt, false) : "-"} alt={sonYukleme ? `${sonYukleme.satirSayisi} satır` : "henüz yüklenmedi"} />
        <Kart etiket="Dağıtım sayısı" deger={kampanyalar.length} alt={<Link className="underline" href="/admin/dagitimlar/yeni">yeni dağıtım</Link>} />
      </div>
      <div className="card">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">Son dağıtımlar</h2>
          <Link href="/admin/dagitimlar" className="text-sm underline">Tümü</Link>
        </div>
        <table className="table">
          <thead><tr><th>Dağıtım</th><th>Durum</th><th>Kurye firması</th><th>Toplam</th><th>Teslim</th><th>Başarısız</th><th>Kalan</th><th>İlerleme</th></tr></thead>
          <tbody>
            {kampanyalar.map((k, i) => {
              const o = ozetler[i];
              return (
                <tr key={k.id}>
                  <td><Link className="font-medium underline" href={`/admin/dagitimlar/${k.id}`}>{k.ad}</Link></td>
                  <td>{KAMPANYA_DURUMU_ETIKET[k.durum]}</td>
                  <td>{k.courierCompany?.ad ?? "-"}</td>
                  <td>{o.toplam}</td>
                  <td className="text-green-700">{o.teslim}</td>
                  <td className="text-red-700">{o.basarisiz}</td>
                  <td>{o.kalan}</td>
                  <td className="w-40">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-600" style={{ width: `${yuzde(o.kapali, o.toplam)}%` }} /></div>
                    <div className="text-xs text-gray-500 mt-0.5">%{yuzde(o.kapali, o.toplam)}</div>
                  </td>
                </tr>
              );
            })}
            {!kampanyalar.length && <tr><td colSpan={8} className="text-center text-gray-500 py-6">Henüz dağıtım yok. Önce üye listesini yükleyin, sonra yeni dağıtım açın.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kart({ etiket, deger, alt }: { etiket: string; deger: React.ReactNode; alt?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500">{etiket}</div>
      <div className="text-2xl font-semibold mt-1">{deger}</div>
      {alt && <div className="text-xs text-gray-500 mt-1">{alt}</div>}
    </div>
  );
}
