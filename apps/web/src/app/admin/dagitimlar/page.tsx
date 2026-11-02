import Link from "next/link";
import { prisma } from "@/lib/db";
import { kampanyaOzeti } from "@/lib/campaign";
import { tarih, yuzde } from "@/lib/format";
import { KAMPANYA_DURUMU_ETIKET } from "@dagitim/shared";

export default async function Dagitimlar() {
  const liste = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, include: { courierCompany: true } });
  const ozetler = await Promise.all(liste.map((k) => kampanyaOzeti(k.id)));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Dağıtımlar</h1><Link href="/admin/dagitimlar/yeni" className="btn-primary">Yeni dağıtım</Link></div>
      <div className="card"><table className="table">
        <thead><tr><th>Dağıtım</th><th>Tür</th><th>Tarih</th><th>Kurye firması</th><th>Durum</th><th>Gönderi</th><th>Teslim</th><th>İlerleme</th></tr></thead>
        <tbody>{liste.map((k, i) => <tr key={k.id}>
          <td><Link className="underline font-medium" href={`/admin/dagitimlar/${k.id}`}>{k.ad}</Link></td>
          <td>{k.tur === "DONEMSEL" ? "Dönemsel" : "Özel"}</td>
          <td className="text-xs">{tarih(k.planlananBaslangic, false)} – {tarih(k.planlananBitis, false)}</td>
          <td>{k.courierCompany?.ad ?? "-"}</td><td>{KAMPANYA_DURUMU_ETIKET[k.durum]}</td>
          <td>{ozetler[i].toplam}</td><td className="text-green-700">{ozetler[i].teslim}</td><td>%{yuzde(ozetler[i].kapali, ozetler[i].toplam)}</td>
        </tr>)}
        {!liste.length && <tr><td colSpan={8} className="text-center text-gray-500 py-6">Henüz dağıtım yok</td></tr>}</tbody></table></div>
    </div>
  );
}
