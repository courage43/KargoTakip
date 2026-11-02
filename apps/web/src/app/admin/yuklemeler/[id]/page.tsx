import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { exceliOku, type SutunEslemesi } from "@dagitim/excel";
import { dosyaOku } from "@/lib/storage";
import { EslemeFormu } from "@/components/EslemeFormu";
import { tarih } from "@/lib/format";

export default async function YuklemeSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.importBatch.findUnique({ where: { id }, include: { campaign: true, yukleyen: true } });
  if (!b) notFound();
  const esleme = (b.esleme as unknown as SutunEslemesi[]) ?? [];
  const rapor = (b.hataRaporu as Record<string, unknown> | null) ?? {};

  let ornek: Record<string, unknown>[] = [];
  if (b.durum === "ESLEME_BEKLIYOR" && b.dosyaYolu) {
    const d = await dosyaOku(b.dosyaYolu);
    if (d) ornek = exceliOku(d.veri, 3).satirlar;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-gray-500">{b.tur === "GENEL_LISTE" ? "Genel üye listesi" : <>Dağıtım listesi · <Link className="underline" href={`/admin/dagitimlar/${b.campaignId}`}>{b.campaign?.ad}</Link></>}</div>
        <h1 className="text-2xl font-semibold">{b.dosyaAdi}</h1>
        <div className="text-sm text-gray-500">{b.satirSayisi} satır · {tarih(b.createdAt)} · {b.yukleyen.adSoyad}</div>
      </div>

      {b.durum === "ESLEME_BEKLIYOR" && (
        <>
          <p className="text-sm text-gray-700">Sütunların hangi alana karşılık geldiğini kontrol edin. Otomatik eşleme çoğunu tanıdı; gerekirse düzeltin.</p>
          <EslemeFormu batchId={b.id} esleme={esleme} ornek={ornek} tur={b.tur} />
        </>
      )}

      {b.durum === "ISLENIYOR" && <p className="text-sm">İşleniyor… Sayfayı yenileyin.</p>}
      {b.durum === "HATA" && <div className="card p-4 text-red-700 text-sm">Hata: {String(rapor.mesaj ?? "bilinmiyor")}</div>}

      {b.durum === "TAMAMLANDI" && b.tur === "GENEL_LISTE" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Sayi etiket="Eklenen üye" n={b.eklenen} />
            <Sayi etiket="Güncellenen" n={b.guncellenen} />
            <Sayi etiket="Pasife alınan" n={b.pasifYapilan} />
            <Sayi etiket="Adres değişen" n={b.adresDegisen} vurgu />
            <Sayi etiket="Yazım farkı (öneri: aynı yer)" n={Number(rapor.yaziFarki ?? 0)} />
          </div>
          {b.adresDegisen > 0 && (
            <div className="card p-4 flex items-center justify-between">
              <div className="text-sm">{b.adresDegisen} üyenin adresi değişmiş görünüyor. Konum verisinin korunması veya sıfırlanması için kararınız gerekiyor.</div>
              <Link href={`/admin/adres-degisiklikleri?batch=${b.id}`} className="btn-primary">Adres değişikliklerini incele</Link>
            </div>
          )}
          <Hatalar rapor={rapor} />
        </div>
      )}

      {b.durum === "TAMAMLANDI" && b.tur === "DAGITIM_LISTESI" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Sayi etiket="Oluşturulan gönderi" n={b.eklenen} />
            <Sayi etiket="Zaten listede" n={Number(rapor.zatenVar ?? 0)} />
            <Sayi etiket="Eşleşmeyen sicil" n={b.eslesmeyen} vurgu />
            <Sayi etiket="Adresi olmayan" n={((rapor.adressiz as unknown[]) ?? []).length} vurgu />
          </div>
          {!!b.eslesmeyen && (
            <div className="card">
              <div className="p-3 border-b font-medium text-sm flex justify-between">
                <span>Üye listesinde bulunamayan siciller</span>
                <a className="underline" href={`/api/export/eslesmeyen/${b.id}`}>Excel indir</a>
              </div>
              <table className="table"><thead><tr><th>Satır</th><th>Sicil</th><th>Unvan</th></tr></thead>
                <tbody>{((rapor.eslesmeyen as { satirNo: number; sicilNo: string; unvan?: string }[]) ?? []).slice(0, 200).map((e) => <tr key={e.satirNo}><td>{e.satirNo}</td><td>{e.sicilNo}</td><td>{e.unvan ?? ""}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {!!((rapor.adressiz as unknown[]) ?? []).length && (
            <div className="card"><div className="p-3 border-b font-medium text-sm">Adresi olmayan üyeler (gönderi oluşturulmadı)</div>
              <table className="table"><thead><tr><th>Sicil</th><th>Unvan</th></tr></thead>
                <tbody>{(rapor.adressiz as { sicilNo: string; unvan: string }[]).map((e) => <tr key={e.sicilNo}><td>{e.sicilNo}</td><td>{e.unvan}</td></tr>)}</tbody></table>
            </div>
          )}
          <Link href={`/admin/dagitimlar/${b.campaignId}`} className="btn-primary">Dağıtıma git</Link>
        </div>
      )}
    </div>
  );
}

function Sayi({ etiket, n, vurgu }: { etiket: string; n: number; vurgu?: boolean }) {
  return <div className={`card p-3 ${vurgu && n ? "border-amber-300 bg-amber-50" : ""}`}><div className="text-xs text-gray-500">{etiket}</div><div className="text-xl font-semibold">{n}</div></div>;
}

function Hatalar({ rapor }: { rapor: Record<string, unknown> }) {
  const hatalar = (rapor.hatalar as { satirNo: number; mesaj: string }[]) ?? [];
  const uyarilar = (rapor.uyarilar as { satirNo: number; sicilNo: string; mesaj: string }[]) ?? [];
  if (!hatalar.length && !uyarilar.length) return null;
  return (
    <div className="card">
      <div className="p-3 border-b font-medium text-sm">Atlanan satırlar ve uyarılar</div>
      <table className="table"><thead><tr><th>Satır</th><th>Sicil</th><th>Mesaj</th></tr></thead>
        <tbody>
          {hatalar.map((h, i) => <tr key={`h${i}`} className="text-red-700"><td>{h.satirNo}</td><td>-</td><td>{h.mesaj}</td></tr>)}
          {uyarilar.map((u, i) => <tr key={`u${i}`}><td>{u.satirNo}</td><td>{u.sicilNo}</td><td>{u.mesaj}</td></tr>)}
        </tbody></table>
    </div>
  );
}
