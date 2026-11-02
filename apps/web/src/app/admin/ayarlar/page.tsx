import { prisma } from "@/lib/db";
import { firmaEkle, kullaniciEkle, kullaniciAktiflik, ayarKaydet } from "@/app/actions/admin";
import { ROL_ETIKET } from "@dagitim/shared";
import { tarih } from "@/lib/format";

export default async function Ayarlar() {
  const [firmalar, kullanicilar, ayarlar] = await Promise.all([
    prisma.courierCompany.findMany({ orderBy: { ad: "asc" }, include: { _count: { select: { users: true } } } }),
    prisma.user.findMany({ where: { rol: { not: "KURYE" } }, orderBy: { createdAt: "asc" }, include: { courierCompany: true } }),
    prisma.setting.findMany(),
  ]);
  const ayar = Object.fromEntries(ayarlar.map((a) => [a.key, a.value]));
  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-semibold">Ayarlar</h1>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Genel</h2>
        <form action={ayarKaydet} className="grid md:grid-cols-2 gap-3">
          <div><label className="label">Oda adı</label><input name="ODA_ADI" defaultValue={ayar.ODA_ADI ?? ""} className="input" /></div>
          <div><label className="label">Kurye navigasyon uygulaması</label>
            <select name="NAVIGASYON" defaultValue={ayar.NAVIGASYON ?? "google"} className="input"><option value="google">Google Maps</option><option value="yandex">Yandex Navi</option><option value="apple">Apple Haritalar</option></select></div>
          <div className="md:col-span-2"><label className="label">Varsayılan SMS şablonu ({"{ODA}"}, {"{TARIH}"}, {"{LINK}"} değişkenleri)</label>
            <textarea name="SMS_SABLON_VARSAYILAN" rows={2} className="input" defaultValue={ayar.SMS_SABLON_VARSAYILAN ?? "{ODA} zarfınız {TARIH} tarihlerinde kurye ile teslim edilecektir. Teslimat tercihinizi bildirmek için: {LINK}"} /></div>
          <div><button className="btn-primary">Kaydet</button></div>
        </form>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Kurye firmaları</h2>
        <table className="table"><thead><tr><th>Firma</th><th>Telefon</th><th>Kullanıcı</th><th>Durum</th></tr></thead>
          <tbody>{firmalar.map((f) => <tr key={f.id}><td className="font-medium">{f.ad}</td><td>{f.telefon ?? "-"}</td><td>{f._count.users}</td><td>{f.aktif ? "Aktif" : "Pasif"}</td></tr>)}</tbody></table>
        <form action={firmaEkle} className="grid md:grid-cols-4 gap-2 items-end">
          <div><label className="label">Firma adı</label><input name="ad" required className="input" /></div>
          <div><label className="label">Telefon</label><input name="telefon" className="input" /></div>
          <div><label className="label">E-posta</label><input name="eposta" className="input" /></div>
          <button className="btn-secondary">Firma ekle</button>
        </form>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Panel kullanıcıları</h2>
        <table className="table"><thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>Firma</th><th>Son giriş</th><th></th></tr></thead>
          <tbody>{kullanicilar.map((u) => (
            <tr key={u.id} className={u.aktif ? "" : "opacity-50"}>
              <td>{u.adSoyad}</td><td>{u.eposta}</td><td>{ROL_ETIKET[u.rol]}</td><td>{u.courierCompany?.ad ?? "-"}</td><td>{tarih(u.sonGiris)}</td>
              <td><form action={kullaniciAktiflik.bind(null, u.id, !u.aktif)}><button className="btn-secondary btn-sm">{u.aktif ? "Pasife al" : "Aktifleştir"}</button></form></td>
            </tr>))}</tbody></table>
        <form action={kullaniciEkle} className="grid md:grid-cols-6 gap-2 items-end">
          <div><label className="label">Ad Soyad</label><input name="adSoyad" required className="input" /></div>
          <div><label className="label">E-posta</label><input name="eposta" type="email" required className="input" /></div>
          <div><label className="label">Şifre</label><input name="sifre" type="text" required minLength={8} className="input" /></div>
          <div><label className="label">Rol</label><select name="rol" className="input"><option value="KURYE_FIRMA_YONETICI">Kurye Firması Yöneticisi</option><option value="ODA_ADMIN">Oda Yöneticisi</option></select></div>
          <div><label className="label">Firma (firma yöneticisi için)</label><select name="courierCompanyId" className="input"><option value="">—</option>{firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}</select></div>
          <button className="btn-secondary">Kullanıcı ekle</button>
        </form>
        <p className="text-xs text-gray-500">Kuryeler, kurye firması yöneticisi tarafından kendi panelinden (telefon + PIN) eklenir.</p>
      </section>
    </div>
  );
}
