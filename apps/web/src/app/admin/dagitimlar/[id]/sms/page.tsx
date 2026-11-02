import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, type Prisma } from "@/lib/db";
import { hataliSmsYenidenKuyrukla } from "@/app/actions/sms";
import { tarih, telefonGoster } from "@/lib/format";

const DURUM_ETIKET: Record<string, string> = { KUYRUKTA: "Kuyrukta", GONDERILDI: "Gönderildi", ILETILDI: "İletildi", HATA: "Hata" };

export default async function SmsListesi({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ durum?: string; sablon?: string; q?: string; sayfa?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const k = await prisma.campaign.findUnique({ where: { id } });
  if (!k) notFound();
  const sayfa = Math.max(1, Number(sp.sayfa ?? 1));
  const where: Prisma.SmsLogWhereInput = { campaignId: id };
  if (sp.durum) where.durum = sp.durum as never;
  if (sp.sablon) where.sablon = sp.sablon;
  if (sp.q) where.OR = [{ telefon: { contains: sp.q.replace(/\D/g, "") } }, { shipment: { member: { unvan: { contains: sp.q, mode: "insensitive" } } } }];
  const [toplam, liste, hataSayisi] = await Promise.all([
    prisma.smsLog.count({ where }),
    prisma.smsLog.findMany({ where, include: { shipment: { include: { member: { select: { unvan: true, sicilNo: true } } } } }, orderBy: { createdAt: "desc" }, skip: (sayfa - 1) * 100, take: 100 }),
    prisma.smsLog.count({ where: { campaignId: id, durum: "HATA" } }),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div><div className="text-sm text-gray-500"><Link className="underline" href={`/admin/dagitimlar/${id}`}>{k.ad}</Link></div><h1 className="text-2xl font-semibold">SMS Kayıtları <span className="text-base text-gray-500 font-normal">({toplam})</span></h1></div>
        <div className="flex gap-2">
          {hataSayisi > 0 && <form action={async () => { "use server"; await hataliSmsYenidenKuyrukla(id); }}><button className="btn-secondary">Hatalıları yeniden gönder ({hataSayisi})</button></form>}
          <a className="btn-secondary" href={`/api/export/sms/${id}`}>Excel indir</a>
        </div>
      </div>
      <form className="card p-3 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-48"><label className="label">Ara</label><input name="q" defaultValue={sp.q ?? ""} className="input" placeholder="Telefon veya unvan" /></div>
        <div><label className="label">Durum</label><select name="durum" defaultValue={sp.durum ?? ""} className="input w-40"><option value="">Hepsi</option>{Object.entries(DURUM_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label">Tür</label><select name="sablon" defaultValue={sp.sablon ?? ""} className="input w-40"><option value="">Hepsi</option><option value="TERCIH">Tercih</option><option value="YOLDA">Kurye yolda</option></select></div>
        <button className="btn-secondary">Filtrele</button>
      </form>
      <div className="card overflow-auto"><table className="table">
        <thead><tr><th>Zaman</th><th>Üye</th><th>Telefon</th><th>Tür</th><th>Durum</th><th>Parça</th><th>Mesaj / Hata</th></tr></thead>
        <tbody>{liste.map((s) => <tr key={s.id}>
          <td className="text-xs">{tarih(s.gonderimZamani ?? s.createdAt)}</td>
          <td className="text-xs">{s.shipment ? <Link className="underline" href={`/admin/gonderiler/${s.shipmentId}`}>{s.shipment.member.unvan}</Link> : "-"}</td>
          <td className="text-xs">{telefonGoster(s.telefon)}</td>
          <td className="text-xs">{s.sablon === "TERCIH" ? "Tercih" : s.sablon === "YOLDA" ? "Kurye yolda" : s.sablon}</td>
          <td><span className={`badge ${s.durum === "ILETILDI" ? "bg-green-100 text-green-800" : s.durum === "HATA" ? "bg-red-100 text-red-800" : s.durum === "GONDERILDI" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>{DURUM_ETIKET[s.durum]}</span></td>
          <td>{s.parcaSayisi}</td>
          <td className="text-xs max-w-md">{s.hata ? <span className="text-red-700">{s.hata}</span> : <span className="text-gray-600 truncate block">{s.mesaj}</span>}</td>
        </tr>)}
        {!liste.length && <tr><td colSpan={7} className="text-center text-gray-500 py-6">SMS kaydı yok</td></tr>}</tbody></table></div>
      {toplam > 100 && <div className="text-sm flex gap-2">{sayfa > 1 && <Link className="btn-secondary btn-sm" href={`?${new URLSearchParams({ ...(sp as Record<string, string>), sayfa: String(sayfa - 1) })}`}>← Önceki</Link>}<span className="py-1.5">Sayfa {sayfa} / {Math.ceil(toplam / 100)}</span>{sayfa * 100 < toplam && <Link className="btn-secondary btn-sm" href={`?${new URLSearchParams({ ...(sp as Record<string, string>), sayfa: String(sayfa + 1) })}`}>Sonraki →</Link>}</div>}
    </div>
  );
}
