import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { kuryeEkle, kuryeAktiflik, kuryePinSifirla } from "@/app/actions/firma";
import { tarih, telefonGoster } from "@/lib/format";

export default async function Kuryeler() {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI"]);
  const kuryeler = await prisma.user.findMany({ where: { rol: "KURYE", courierCompanyId: o.companyId! }, orderBy: { adSoyad: "asc" }, include: { _count: { select: { atananGonderiler: { where: { durum: { in: ["ATANDI", "YOLDA"] } } } } } } });
  const kuryeUrl = process.env.NEXT_PUBLIC_KURYE_URL ?? "/kurye";
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Kuryeler</h1>
      <div className="card p-4 text-sm">
        Kuryeler mobil uygulamaya <a className="underline font-medium" href={kuryeUrl}>{kuryeUrl}</a> adresinden telefon numarası ve PIN ile girer. Telefona "Ana ekrana ekle" ile kurulur.
      </div>
      <div className="card"><table className="table">
        <thead><tr><th>Ad</th><th>Telefon</th><th>Açık gönderi</th><th>Son giriş</th><th>Durum</th><th></th></tr></thead>
        <tbody>{kuryeler.map((k) => <tr key={k.id} className={k.aktif ? "" : "opacity-50"}>
          <td className="font-medium">{k.adSoyad}</td><td>{telefonGoster(k.telefon)}</td><td>{k._count.atananGonderiler}</td><td className="text-xs">{tarih(k.sonGiris)}</td>
          <td>{k.aktif ? "Aktif" : "Pasif"}</td>
          <td className="flex gap-2">
            <form action={async (f: FormData) => { "use server"; await kuryePinSifirla(k.id, String(f.get("pin"))); }} className="flex gap-1"><input name="pin" placeholder="Yeni PIN" className="input w-24" minLength={4} maxLength={8} required /><button className="btn-secondary btn-sm">PIN</button></form>
            <form action={kuryeAktiflik.bind(null, k.id, !k.aktif)}><button className="btn-secondary btn-sm">{k.aktif ? "Pasife al" : "Aktifleştir"}</button></form>
          </td>
        </tr>)}
        {!kuryeler.length && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Henüz kurye yok</td></tr>}</tbody></table></div>
      <form action={kuryeEkle} className="card p-4 grid md:grid-cols-4 gap-2 items-end">
        <div><label className="label">Ad Soyad</label><input name="adSoyad" required className="input" /></div>
        <div><label className="label">Cep telefonu</label><input name="telefon" required className="input" placeholder="05xx xxx xx xx" /></div>
        <div><label className="label">PIN (4-8 hane)</label><input name="pin" required minLength={4} maxLength={8} className="input" /></div>
        <button className="btn-primary">Kurye ekle</button>
      </form>
    </div>
  );
}
