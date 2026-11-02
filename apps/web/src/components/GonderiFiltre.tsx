import Link from "next/link";
import { GONDERI_DURUMU_ETIKET } from "@dagitim/shared";

export function GonderiFiltre({ taban, sp, ilceler, kuryeler }: { taban: string; sp: Record<string, string | undefined>; ilceler: string[]; kuryeler: { id: string; adSoyad: string }[] }) {
  return (
    <form className="card p-3 flex flex-wrap gap-2 items-end" action={taban}>
      <div className="min-w-56 flex-1"><label className="label">Ara</label><input name="q" defaultValue={sp.q ?? ""} className="input" placeholder="Unvan, sicil, adres" /></div>
      <div><label className="label">Durum</label><select name="durum" defaultValue={sp.durum ?? ""} className="input w-48"><option value="">Hepsi</option>{Object.entries(GONDERI_DURUMU_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div><label className="label">İlçe</label><select name="ilce" defaultValue={sp.ilce ?? ""} className="input w-40"><option value="">Hepsi</option>{ilceler.map((i) => <option key={i} value={i}>{i}</option>)}</select></div>
      <div><label className="label">Kurye</label><select name="kurye" defaultValue={sp.kurye ?? ""} className="input w-44"><option value="">Hepsi</option><option value="YOK">Atanmamış</option>{kuryeler.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}</select></div>
      <div><label className="label">Konum</label><select name="konum" defaultValue={sp.konum ?? ""} className="input w-40"><option value="">Hepsi</option><option value="DOGRULANDI">Doğrulanmış</option><option value="DIGER">Doğrulanmamış</option></select></div>
      <button className="btn-secondary">Filtrele</button>
      <Link href={taban} className="btn-secondary">Temizle</Link>
    </form>
  );
}
