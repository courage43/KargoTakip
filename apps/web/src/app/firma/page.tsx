import Link from "next/link";
import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { kampanyaOzeti } from "@/lib/campaign";
import { tarih, yuzde } from "@/lib/format";
import { KAMPANYA_DURUMU_ETIKET } from "@dagitim/shared";

export default async function FirmaAna() {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI"]);
  const liste = await prisma.campaign.findMany({ where: { courierCompanyId: o.companyId!, durum: { in: ["AKTIF", "TAMAMLANDI"] } }, orderBy: { createdAt: "desc" } });
  const ozetler = await Promise.all(liste.map((k) => kampanyaOzeti(k.id)));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dağıtımlar</h1>
      <div className="card"><table className="table">
        <thead><tr><th>Dağıtım</th><th>Tarih</th><th>Durum</th><th>Gönderi</th><th>Atanmamış</th><th>Teslim</th><th>Başarısız</th><th>İlerleme</th></tr></thead>
        <tbody>{liste.map((k, i) => <tr key={k.id}>
          <td><Link className="underline font-medium" href={`/firma/dagitimlar/${k.id}`}>{k.ad}</Link></td>
          <td className="text-xs">{tarih(k.planlananBaslangic, false)} – {tarih(k.planlananBitis, false)}</td>
          <td>{KAMPANYA_DURUMU_ETIKET[k.durum]}</td><td>{ozetler[i].toplam}</td>
          <td className={ozetler[i].ozet.BEKLIYOR ? "text-amber-700 font-medium" : ""}>{ozetler[i].ozet.BEKLIYOR ?? 0}</td>
          <td className="text-green-700">{ozetler[i].teslim}</td><td className="text-red-700">{ozetler[i].basarisiz}</td><td>%{yuzde(ozetler[i].kapali, ozetler[i].toplam)}</td>
        </tr>)}
        {!liste.length && <tr><td colSpan={8} className="text-center text-gray-500 py-6">Size atanmış aktif dağıtım yok. Oda dağıtımı başlattığında burada görünür.</td></tr>}</tbody></table></div>
    </div>
  );
}
