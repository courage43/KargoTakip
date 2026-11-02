import Link from "next/link";
import { prisma, type Prisma } from "@/lib/db";
import { tarih } from "@/lib/format";

const sure = (b: Date, e: Date | null) => { const dk = Math.round(((e ?? new Date()).getTime() - b.getTime()) / 60000); return dk < 60 ? `${dk} dk` : `${Math.floor(dk / 60)} sa ${dk % 60} dk`; };

export default async function Rotalar({ searchParams }: { searchParams: Promise<{ kurye?: string; firma?: string; gun?: string; sayfa?: string }> }) {
  const sp = await searchParams;
  const sayfa = Math.max(1, Number(sp.sayfa ?? 1));
  const where: Prisma.RouteWhereInput = {};
  if (sp.kurye) where.courierId = sp.kurye;
  if (sp.firma) where.courier = { courierCompanyId: sp.firma };
  if (sp.gun) { const g = new Date(sp.gun); const s = new Date(g); s.setDate(s.getDate() + 1); where.baslangic = { gte: g, lt: s }; }
  const [toplam, rotalar, kuryeler, firmalar] = await Promise.all([
    prisma.route.count({ where }),
    prisma.route.findMany({ where, include: { courier: { include: { courierCompany: true } }, campaign: { select: { ad: true } } }, orderBy: { baslangic: "desc" }, skip: (sayfa - 1) * 50, take: 50 }),
    prisma.user.findMany({ where: { rol: "KURYE" }, orderBy: { adSoyad: "asc" }, select: { id: true, adSoyad: true } }),
    prisma.courierCompany.findMany({ orderBy: { ad: "asc" } }),
  ]);
  // teslim/başarısız sayıları rota aralığında
  const ozetler = await Promise.all(rotalar.map(async (r) => {
    const d = await prisma.deliveryAttempt.groupBy({ by: ["sonuc"], where: { courierId: r.courierId, sunucuZamani: { gte: r.baslangic, lte: r.bitis ?? new Date() } }, _count: { _all: true } });
    const n = (l: string[]) => d.filter((x) => l.includes(x.sonuc)).reduce((a, b) => a + b._count._all, 0);
    return { teslim: n(["TESLIM_EDILDI", "KOMSUYA_BIRAKILDI", "ISYERINE_BIRAKILDI"]), basarisiz: n(["ADRESTE_BULUNAMADI", "ADRES_HATALI", "TASINMIS"]) };
  }));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Rotalar <span className="text-base text-gray-500 font-normal">({toplam})</span></h1>
      <p className="text-sm text-gray-600">Kuryenin "Rotaya başla" ile "Rotayı bitir" arasındaki her çalışma bir rotadır. Satıra tıklayınca gezilen yol haritada çizilir ve oynatılabilir.</p>
      <form className="card p-3 flex flex-wrap gap-2 items-end">
        <div><label className="label">Kurye</label><select name="kurye" defaultValue={sp.kurye ?? ""} className="input w-48"><option value="">Hepsi</option>{kuryeler.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}</select></div>
        <div><label className="label">Firma</label><select name="firma" defaultValue={sp.firma ?? ""} className="input w-48"><option value="">Hepsi</option>{firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}</select></div>
        <div><label className="label">Gün</label><input type="date" name="gun" defaultValue={sp.gun ?? ""} className="input" /></div>
        <button className="btn-secondary">Filtrele</button><Link href="/admin/rotalar" className="btn-secondary">Temizle</Link>
      </form>
      <div className="card overflow-auto"><table className="table">
        <thead><tr><th>Kurye</th><th>Firma</th><th>Dağıtım</th><th>Başlangıç</th><th>Bitiş</th><th>Süre</th><th>Mesafe</th><th>Konum</th><th>Deneme</th><th>Teslim</th><th>Başarısız</th></tr></thead>
        <tbody>{rotalar.map((r, i) => <tr key={r.id}>
          <td><Link className="underline font-medium" href={`/admin/rotalar/${r.id}`}>{r.courier.adSoyad}</Link></td>
          <td className="text-xs">{r.courier.courierCompany?.ad ?? "-"}</td><td className="text-xs">{r.campaign?.ad ?? "-"}</td>
          <td className="text-xs">{tarih(r.baslangic)}</td>
          <td className="text-xs">{r.bitis ? tarih(r.bitis) : <span className="badge bg-green-100 text-green-800">açık</span>}{r.otomatikKapandi && <span className="text-xs text-amber-700"> (otomatik)</span>}</td>
          <td>{sure(r.baslangic, r.bitis)}</td>
          <td>{r.mesafeM != null ? `${(r.mesafeM / 1000).toFixed(1)} km` : "-"}</td>
          <td>{r.noktaSayisi ?? "-"}</td><td>{r.denemeSayisi ?? "-"}</td>
          <td className="text-green-700">{ozetler[i].teslim}</td><td className="text-red-700">{ozetler[i].basarisiz}</td>
        </tr>)}
        {!rotalar.length && <tr><td colSpan={11} className="text-center text-gray-500 py-6">Rota kaydı yok</td></tr>}</tbody></table></div>
      {toplam > 50 && <div className="text-sm flex gap-2">{sayfa > 1 && <Link className="btn-secondary btn-sm" href={`?${new URLSearchParams({ ...(sp as Record<string, string>), sayfa: String(sayfa - 1) })}`}>← Önceki</Link>}<span className="py-1.5">Sayfa {sayfa} / {Math.ceil(toplam / 50)}</span>{sayfa * 50 < toplam && <Link className="btn-secondary btn-sm" href={`?${new URLSearchParams({ ...(sp as Record<string, string>), sayfa: String(sayfa + 1) })}`}>Sonraki →</Link>}</div>}
    </div>
  );
}
