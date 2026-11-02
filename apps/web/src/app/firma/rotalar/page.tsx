import Link from "next/link";
import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tarih } from "@/lib/format";

const sure = (b: Date, e: Date | null) => { const dk = Math.round(((e ?? new Date()).getTime() - b.getTime()) / 60000); return dk < 60 ? `${dk} dk` : `${Math.floor(dk / 60)} sa ${dk % 60} dk`; };

export default async function FirmaRotalar({ searchParams }: { searchParams: Promise<{ kurye?: string; gun?: string }> }) {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI"]);
  const sp = await searchParams;
  const where = { courier: { courierCompanyId: o.companyId! }, ...(sp.kurye ? { courierId: sp.kurye } : {}), ...(sp.gun ? { baslangic: { gte: new Date(sp.gun), lt: new Date(new Date(sp.gun).getTime() + 86400000) } } : {}) };
  const [rotalar, kuryeler] = await Promise.all([
    prisma.route.findMany({ where, include: { courier: true, campaign: { select: { ad: true } } }, orderBy: { baslangic: "desc" }, take: 100 }),
    prisma.user.findMany({ where: { rol: "KURYE", courierCompanyId: o.companyId! }, orderBy: { adSoyad: "asc" }, select: { id: true, adSoyad: true } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Kurye Rotaları</h1>
      <form className="card p-3 flex flex-wrap gap-2 items-end">
        <div><label className="label">Kurye</label><select name="kurye" defaultValue={sp.kurye ?? ""} className="input w-48"><option value="">Hepsi</option>{kuryeler.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}</select></div>
        <div><label className="label">Gün</label><input type="date" name="gun" defaultValue={sp.gun ?? ""} className="input" /></div>
        <button className="btn-secondary">Filtrele</button>
      </form>
      <div className="card overflow-auto"><table className="table">
        <thead><tr><th>Kurye</th><th>Dağıtım</th><th>Başlangıç</th><th>Bitiş</th><th>Süre</th><th>Mesafe</th><th>Deneme</th></tr></thead>
        <tbody>{rotalar.map((r) => <tr key={r.id}>
          <td><Link className="underline font-medium" href={`/admin/rotalar/${r.id}`}>{r.courier.adSoyad}</Link></td><td className="text-xs">{r.campaign?.ad ?? "-"}</td>
          <td className="text-xs">{tarih(r.baslangic)}</td><td className="text-xs">{r.bitis ? tarih(r.bitis) : <span className="badge bg-green-100 text-green-800">açık</span>}</td>
          <td>{sure(r.baslangic, r.bitis)}</td><td>{r.mesafeM != null ? `${(r.mesafeM / 1000).toFixed(1)} km` : "-"}</td><td>{r.denemeSayisi ?? "-"}</td>
        </tr>)}
        {!rotalar.length && <tr><td colSpan={7} className="text-center text-gray-500 py-6">Rota kaydı yok</td></tr>}</tbody></table></div>
    </div>
  );
}
