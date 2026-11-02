import Link from "next/link";
import { prisma } from "@/lib/db";
import { uyarilariGetir } from "@/lib/uyarilar";
import { uyariIncelendi, uyarilariTopluIncele, rotayiKapat } from "@/app/actions/geocode";
import { tarih } from "@/lib/format";
import { UYARI_TURU_ETIKET, HAREKETSIZ_DK, UZUN_ROTA_SAAT, UZAK_TESLIM_ESIGI_M } from "@dagitim/shared";

const RENK: Record<string, string> = { HAREKETSIZ: "bg-amber-100 text-amber-800", UZUN_ROTA: "bg-orange-100 text-orange-800", UZAK_TESLIM: "bg-red-100 text-red-800", GPSSIZ: "bg-gray-200 text-gray-800", HIZLI: "bg-purple-100 text-purple-800" };

export default async function Uyarilar({ searchParams }: { searchParams: Promise<{ gun?: string }> }) {
  const sp = await searchParams;
  const gun = Number(sp.gun ?? 7);
  const [uyarilar, adresBekleyen, cakisma, smsHata] = await Promise.all([
    uyarilariGetir({ gun }),
    prisma.addressChangeRequest.count({ where: { karar: "BEKLIYOR" } }),
    prisma.memberAddress.count({ where: { konumDurumu: "CAKISMA_BEKLIYOR" } }),
    prisma.smsLog.count({ where: { durum: "HATA" } }),
  ]);
  const gruplar = Object.entries(UYARI_TURU_ETIKET).map(([tur, etiket]) => ({ tur, etiket, liste: uyarilar.filter((u) => u.tur === tur) })).filter((g) => g.liste.length);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Uyarılar <span className="text-base text-gray-500 font-normal">({uyarilar.length})</span></h1>
        <div className="flex gap-2 items-center text-sm">
          <form><select name="gun" defaultValue={String(gun)} className="input w-36" onChange={undefined}><option value="1">Son 1 gün</option><option value="7">Son 7 gün</option><option value="30">Son 30 gün</option></select> <button className="btn-secondary btn-sm">Uygula</button></form>
          {uyarilar.length > 0 && <form action={uyarilariTopluIncele}><button className="btn-secondary btn-sm">Hepsini incelendi işaretle</button></form>}
        </div>
      </div>
      <p className="text-sm text-gray-600">Eşikler: {HAREKETSIZ_DK} dk konum gelmeyen açık rota, {UZUN_ROTA_SAAT} saatten uzun açık rota, doğrulanmış adresten {UZAK_TESLIM_ESIGI_M} m uzakta teslim, GPS'siz kayıt, 60 sn içinde 500 m uzakta ikinci teslimat.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <Link href="/admin/adres-degisiklikleri" className={`card p-3 ${adresBekleyen ? "border-amber-300" : ""}`}><div className="text-xs text-gray-500">Bekleyen adres değişikliği</div><div className="text-xl font-semibold">{adresBekleyen}</div></Link>
        <Link href="/admin/konum-cakismalari" className={`card p-3 ${cakisma ? "border-red-300" : ""}`}><div className="text-xs text-gray-500">Konum çakışması</div><div className="text-xl font-semibold">{cakisma}</div></Link>
        <div className={`card p-3 ${smsHata ? "border-red-300" : ""}`}><div className="text-xs text-gray-500">Hatalı SMS</div><div className="text-xl font-semibold">{smsHata}</div></div>
      </div>

      {!gruplar.length && <div className="card p-6 text-sm text-gray-500">Seçili dönemde dikkat gerektiren bir durum yok.</div>}
      {gruplar.map((g) => (
        <section key={g.tur} className="card">
          <div className="p-3 border-b border-gray-200 flex items-center gap-2"><span className={`badge ${RENK[g.tur]}`}>{g.etiket}</span><span className="text-sm text-gray-500">{g.liste.length}</span></div>
          <table className="table"><thead><tr><th>Zaman</th><th>Kurye</th><th>Açıklama</th><th></th></tr></thead>
            <tbody>{g.liste.map((u) => (
              <tr key={`${u.tur}-${u.anahtar}`}>
                <td className="text-xs">{tarih(u.zaman)}</td>
                <td>{u.kuryeAd}</td>
                <td className="text-sm">{u.aciklama}{u.shipmentId && <> · <Link className="underline" href={`/admin/gonderiler/${u.shipmentId}`}>gönderi</Link></>}{u.routeId && <> · <Link className="underline" href={`/admin/rotalar/${u.routeId}`}>rota</Link></>}</td>
                <td className="flex gap-1 justify-end">
                  {u.tur === "UZUN_ROTA" && u.routeId && <form action={rotayiKapat.bind(null, u.routeId)}><button className="btn-secondary btn-sm">Rotayı kapat</button></form>}
                  <form action={uyariIncelendi.bind(null, u.tur, u.anahtar)}><button className="btn-secondary btn-sm">İncelendi</button></form>
                </td>
              </tr>))}</tbody></table>
        </section>
      ))}
    </div>
  );
}
