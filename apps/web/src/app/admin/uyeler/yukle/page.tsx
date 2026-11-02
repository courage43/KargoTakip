import { genelListeYukle } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { tarih } from "@/lib/format";
import Link from "next/link";

export default async function UyeYukle() {
  const sonlar = await prisma.importBatch.findMany({ where: { tur: "GENEL_LISTE" }, orderBy: { createdAt: "desc" }, take: 10, include: { yukleyen: true } });
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Genel Üye Listesi Yükle</h1>
      <form action={genelListeYukle} className="card p-5 space-y-4">
        <p className="text-sm text-gray-600">
          Oda üye listesini Excel (.xlsx) olarak yükleyin. Bir sonraki adımda sütunları eşleyeceksiniz. Mevcut üyeler sicil numarasına göre güncellenir, listede olmayanlar pasife alınır (silinmez).
          Doğrulanmış konumlar ve saha notları korunur; adres değişenler onayınıza sunulur.
        </p>
        <div>
          <label className="label">Excel dosyası</label>
          <input name="dosya" type="file" accept=".xlsx,.xls,.csv" required className="input" />
        </div>
        <button className="btn-primary">Yükle ve sütunları eşle</button>
      </form>
      <div className="card">
        <div className="p-4 border-b border-gray-200 font-semibold">Önceki yüklemeler</div>
        <table className="table">
          <thead><tr><th>Tarih</th><th>Dosya</th><th>Satır</th><th>Eklenen</th><th>Güncellenen</th><th>Pasif</th><th>Adres değişen</th><th>Durum</th></tr></thead>
          <tbody>
            {sonlar.map((b) => (
              <tr key={b.id}>
                <td>{tarih(b.createdAt)}</td>
                <td><Link className="underline" href={`/admin/yuklemeler/${b.id}`}>{b.dosyaAdi}</Link></td>
                <td>{b.satirSayisi}</td><td>{b.eklenen}</td><td>{b.guncellenen}</td><td>{b.pasifYapilan}</td><td>{b.adresDegisen}</td>
                <td>{b.durum}</td>
              </tr>
            ))}
            {!sonlar.length && <tr><td colSpan={8} className="text-center text-gray-500 py-4">Henüz yükleme yok</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
