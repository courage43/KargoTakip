import Link from "next/link";
import { prisma, type Prisma } from "@/lib/db";
import { KonumRozeti } from "@/components/DurumRozeti";
import { telefonGoster } from "@/lib/format";

export default async function Uyeler({ searchParams }: { searchParams: Promise<{ q?: string; sayfa?: string; konum?: string; aktif?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const sayfa = Math.max(1, Number(sp.sayfa ?? 1));
  const where: Prisma.MemberWhereInput = {};
  if (q) where.OR = [{ sicilNo: { contains: q } }, { unvan: { contains: q, mode: "insensitive" } }, { tabelaUnvani: { contains: q, mode: "insensitive" } }, { addresses: { some: { adresMetni: { contains: q, mode: "insensitive" } } } }];
  if (sp.aktif === "1") where.aktif = true;
  if (sp.konum) where.addresses = { some: { gecerlilikBitis: null, konumDurumu: sp.konum as never } };
  const [toplam, uyeler] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({ where, orderBy: { unvan: "asc" }, skip: (sayfa - 1) * 50, take: 50, include: { addresses: { where: { gecerlilikBitis: null } } } }),
  ]);
  const sayfaSayisi = Math.ceil(toplam / 50);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Üyeler <span className="text-base text-gray-500 font-normal">({toplam})</span></h1>
        <Link href="/admin/uyeler/yukle" className="btn-primary">Üye listesi yükle</Link>
      </div>
      <form className="card p-3 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-60"><label className="label">Ara</label><input name="q" defaultValue={q} className="input" placeholder="Sicil, unvan, adres…" /></div>
        <div><label className="label">Konum</label>
          <select name="konum" defaultValue={sp.konum ?? ""} className="input w-52">
            <option value="">Hepsi</option><option value="DOGRULANDI">Doğrulanmış</option><option value="TAHMINI">Tahmini</option><option value="DOGRULANACAK">Doğrulanacak</option><option value="CAKISMA_BEKLIYOR">Çakışma</option><option value="YOK">Konum yok</option>
          </select></div>
        <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" name="aktif" value="1" defaultChecked={sp.aktif === "1"} /> Sadece aktif</label>
        <button className="btn-secondary">Filtrele</button>
      </form>
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th>Sicil</th><th>Unvan</th><th>Adres</th><th>İlçe</th><th>Telefon</th><th>Konum</th><th>Durum</th></tr></thead>
          <tbody>
            {uyeler.map((u) => { const a = u.addresses.find((x) => x.isPrimary) ?? u.addresses[0]; return (
              <tr key={u.id}>
                <td className="font-mono text-xs">{u.sicilNo}</td>
                <td><Link className="underline font-medium" href={`/admin/uyeler/${u.id}`}>{u.unvan}</Link>{u.tabelaUnvani && <div className="text-xs text-gray-500">{u.tabelaUnvani}</div>}</td>
                <td className="max-w-md text-xs">{a?.adresMetni ?? <span className="text-red-600">Adres yok</span>}{u.addresses.length > 1 && <span className="text-gray-400"> (+{u.addresses.length - 1})</span>}</td>
                <td>{a?.ilce ?? "-"}</td>
                <td className="text-xs">{telefonGoster(u.cepTelefonu)}</td>
                <td>{a && <KonumRozeti durum={a.konumDurumu} />}</td>
                <td>{u.aktif ? <span className="badge bg-green-100 text-green-800">Aktif</span> : <span className="badge bg-gray-100 text-gray-600">Pasif</span>}</td>
              </tr>); })}
            {!uyeler.length && <tr><td colSpan={7} className="text-center text-gray-500 py-6">Kayıt bulunamadı</td></tr>}
          </tbody>
        </table>
      </div>
      {sayfaSayisi > 1 && (
        <div className="flex gap-2 text-sm">
          {sayfa > 1 && <Link className="btn-secondary btn-sm" href={`?q=${q}&konum=${sp.konum ?? ""}&aktif=${sp.aktif ?? ""}&sayfa=${sayfa - 1}`}>← Önceki</Link>}
          <span className="py-1.5">Sayfa {sayfa} / {sayfaSayisi}</span>
          {sayfa < sayfaSayisi && <Link className="btn-secondary btn-sm" href={`?q=${q}&konum=${sp.konum ?? ""}&aktif=${sp.aktif ?? ""}&sayfa=${sayfa + 1}`}>Sonraki →</Link>}
        </div>
      )}
    </div>
  );
}
