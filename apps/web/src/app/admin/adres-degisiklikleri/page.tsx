import { prisma } from "@/lib/db";
import { AdresDegisiklikleri } from "@/components/AdresDegisiklikleri";
import { tarih } from "@/lib/format";
import { ADRES_KARAR_ETIKET } from "@dagitim/shared";

export default async function AdresDegisiklikleriSayfasi({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const sp = await searchParams;
  const where = { karar: "BEKLIYOR" as const, ...(sp.batch ? { importBatchId: sp.batch } : {}) };
  const [talepler, sonKararlar] = await Promise.all([
    prisma.addressChangeRequest.findMany({ where, include: { member: true }, orderBy: [{ benzerlikSkoru: "desc" }, { createdAt: "asc" }], take: 500 }),
    prisma.addressChangeRequest.findMany({ where: { karar: { not: "BEKLIYOR" } }, include: { member: true, kararVeren: true }, orderBy: { kararTarihi: "desc" }, take: 30 }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Adres Değişiklikleri <span className="text-base text-gray-500 font-normal">({talepler.length} bekleyen{sp.batch ? ", bu yüklemeden" : ""})</span></h1>
      <AdresDegisiklikleri talepler={talepler.map((t) => ({ id: t.id, memberId: t.memberId, unvan: t.member.unvan, sicilNo: t.member.sicilNo, eskiAdres: t.eskiAdres, yeniAdres: t.yeniAdres, benzerlikSkoru: t.benzerlikSkoru, eskiKonumVarMi: t.eskiKonumVarMi, kaynak: t.kaynak, createdAt: t.createdAt.toISOString() }))} />
      <details className="card">
        <summary className="p-3 cursor-pointer text-sm font-medium">Son kararlar ({sonKararlar.length})</summary>
        <table className="table"><thead><tr><th>Üye</th><th>Yeni adres</th><th>Karar</th><th>Kim</th><th>Tarih</th></tr></thead>
          <tbody>{sonKararlar.map((t) => <tr key={t.id}><td>{t.member.unvan}</td><td className="text-xs">{t.yeniAdres}</td><td>{ADRES_KARAR_ETIKET[t.karar]}</td><td>{t.kararVeren?.adSoyad ?? "-"}</td><td>{tarih(t.kararTarihi)}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}
