import { prisma } from "@/lib/db";
import { kampanyaOlustur } from "@/app/actions/admin";

export default async function YeniDagitim() {
  const firmalar = await prisma.courierCompany.findMany({ where: { aktif: true }, orderBy: { ad: "asc" } });
  const sablon = await prisma.setting.findUnique({ where: { key: "SMS_SABLON_VARSAYILAN" } });
  const yil = new Date().getFullYear();
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Yeni Dağıtım</h1>
      <form action={kampanyaOlustur} className="card p-5 space-y-4">
        <div><label className="label">Dağıtım adı</label><input name="ad" required className="input" defaultValue={`${yil} ${new Date().getMonth() < 6 ? "Bahar" : "Güz"} Zarf Dağıtımı`} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Tür</label><select name="tur" className="input"><option value="DONEMSEL">Dönemsel (6 aylık zarf)</option><option value="OZEL">Özel gönderi</option></select></div>
          <div><label className="label">Kurye firması</label><select name="courierCompanyId" className="input" required><option value="">Seçin…</option>{firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}</select></div>
          <div><label className="label">Planlanan başlangıç</label><input type="date" name="baslangic" className="input" /></div>
          <div><label className="label">Planlanan bitiş</label><input type="date" name="bitis" className="input" /></div>
        </div>
        <div><label className="label">SMS şablonu (2. fazda gönderim)</label><textarea name="smsSablonu" rows={2} className="input" defaultValue={sablon?.value ?? ""} /></div>
        <button className="btn-primary">Dağıtımı oluştur</button>
        <p className="text-xs text-gray-500">Sonraki adımda dağıtıma çıkacak listeyi Excel ile yükleyeceksiniz.</p>
      </form>
    </div>
  );
}
