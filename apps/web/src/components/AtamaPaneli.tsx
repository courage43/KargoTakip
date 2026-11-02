"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Harita, type Nokta } from "./Harita";
import { ata } from "@/app/actions/firma";
import { DurumRozeti, KonumRozeti } from "./DurumRozeti";
import { GONDERI_DURUMU_RENK, UYE_TERCIHI_ETIKET } from "@dagitim/shared";
import { useRealtime } from "@/lib/useRealtime";

export interface AtamaGonderi { id: string; unvan: string; sicilNo: string; adres: string; ilce: string | null; lat: number | null; lng: number | null; konumDurumu: string; durum: string; kuryeId: string | null; kuryeAd: string | null; tercih: string | null; kuryeNotu: string | null; telefon: string | null }

export function AtamaPaneli({ gonderiler: ilk, kuryeler, campaignId }: { gonderiler: AtamaGonderi[]; kuryeler: { id: string; adSoyad: string }[]; campaignId: string }) {
  const [gonderiler, setGonderiler] = useState(ilk);
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [kurye, setKurye] = useState(kuryeler[0]?.id ?? "");
  const [q, setQ] = useState(""); const [ilce, setIlce] = useState(""); const [durumF, setDurumF] = useState("ACIK"); const [kuryeF, setKuryeF] = useState("");
  const [secimModu, setSecimModu] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  useRealtime((o) => { if (o.kanal === "shipment" && o.shipmentId && o.durum) setGonderiler((g) => g.map((x) => (x.id === o.shipmentId ? { ...x, durum: o.durum as string } : x))); });

  const ilceler = useMemo(() => [...new Set(gonderiler.map((g) => g.ilce).filter(Boolean))].sort() as string[], [gonderiler]);
  const acik = (d: string) => ["BEKLIYOR", "ATANDI", "YOLDA"].includes(d);
  const filtreli = useMemo(() => gonderiler.filter((g) =>
    (!q || g.unvan.toLowerCase().includes(q.toLowerCase()) || g.sicilNo.includes(q) || g.adres.toLowerCase().includes(q.toLowerCase())) &&
    (!ilce || g.ilce === ilce) &&
    (durumF === "" || (durumF === "ACIK" ? acik(g.durum) : durumF === "ATANMAMIS" ? g.durum === "BEKLIYOR" : g.durum === durumF)) &&
    (!kuryeF || (kuryeF === "YOK" ? !g.kuryeId : g.kuryeId === kuryeF))), [gonderiler, q, ilce, durumF, kuryeF]);

  const toggle = (id: string) => setSecili((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const hepsiniSec = () => setSecili(new Set(filtreli.filter((g) => acik(g.durum)).map((g) => g.id)));
  const uygula = (courierId: string | null) => start(async () => {
    const ids = [...secili];
    const r = await ata(ids, courierId);
    if (r.hata) { setMesaj(`Hata: ${r.hata}`); return; }
    const ad = kuryeler.find((k) => k.id === courierId)?.adSoyad ?? null;
    setGonderiler((g) => g.map((x) => (ids.includes(x.id) && acik(x.durum) ? { ...x, kuryeId: courierId, kuryeAd: ad, durum: courierId ? "ATANDI" : "BEKLIYOR" } : x)));
    setSecili(new Set());
    setMesaj(courierId ? `${r.adet} gönderi ${ad} kuryesine atandı.` : `${r.adet} gönderinin ataması kaldırıldı.`);
    router.refresh();
  });

  const noktalar: Nokta[] = filtreli.filter((g) => g.lat != null).map((g) => ({ id: g.id, lat: g.lat!, lng: g.lng!, renk: g.kuryeId ? kuryeRenk(g.kuryeId, kuryeler) : GONDERI_DURUMU_RENK[g.durum], etiket: `${g.unvan}${g.kuryeAd ? ` · ${g.kuryeAd}` : ""}${g.konumDurumu !== "DOGRULANDI" ? " · tahmini konum" : ""}`, secili: secili.has(g.id), tahmini: g.konumDurumu !== "DOGRULANDI" }));
  const konumsuz = filtreli.filter((g) => g.lat == null).length;
  const kuryeSayac = (id: string) => gonderiler.filter((g) => g.kuryeId === id).length;

  return (
    <div className="space-y-3">
      <div className="card p-3 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-48"><label className="label">Ara</label><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Unvan, sicil, adres" /></div>
        <div><label className="label">İlçe</label><select className="input w-40" value={ilce} onChange={(e) => setIlce(e.target.value)}><option value="">Hepsi</option>{ilceler.map((i) => <option key={i}>{i}</option>)}</select></div>
        <div><label className="label">Durum</label><select className="input w-40" value={durumF} onChange={(e) => setDurumF(e.target.value)}><option value="ACIK">Açık (bekliyor/atandı)</option><option value="ATANMAMIS">Atanmamış</option><option value="">Hepsi</option><option value="TESLIM_EDILDI">Teslim edildi</option><option value="ADRESTE_BULUNAMADI">Bulunamadı</option></select></div>
        <div><label className="label">Kurye</label><select className="input w-44" value={kuryeF} onChange={(e) => setKuryeF(e.target.value)}><option value="">Hepsi</option><option value="YOK">Atanmamış</option>{kuryeler.map((k) => <option key={k.id} value={k.id}>{k.adSoyad} ({kuryeSayac(k.id)})</option>)}</select></div>
        <button className="btn-secondary" onClick={hepsiniSec}>Filtredekileri seç ({filtreli.filter((g) => acik(g.durum)).length})</button>
        <button className={`btn-secondary ${secimModu ? "ring-2 ring-blue-500" : ""}`} onClick={() => setSecimModu((s) => !s)}>{secimModu ? "Haritada çizim: açık" : "Haritada alan seç"}</button>
        <button className="btn-secondary" onClick={() => setSecili(new Set())}>Seçimi temizle</button>
      </div>

      <div className="card p-3 flex flex-wrap items-center gap-2 bg-blue-50/60">
        <span className="text-sm font-medium">{secili.size} gönderi seçili →</span>
        <select className="input w-56" value={kurye} onChange={(e) => setKurye(e.target.value)}>{kuryeler.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}</select>
        <button className="btn-primary" disabled={!secili.size || !kurye || pending} onClick={() => uygula(kurye)}>{pending ? "Atanıyor…" : "Kuryeye ata"}</button>
        <button className="btn-secondary" disabled={!secili.size || pending} onClick={() => uygula(null)}>Atamayı kaldır</button>
        {mesaj && <span className="text-sm text-gray-700 ml-2">{mesaj}</span>}
        {!kuryeler.length && <a className="text-sm underline ml-2" href="/firma/kuryeler">Önce kurye ekleyin</a>}
      </div>

      <div className="grid xl:grid-cols-2 gap-3">
        <div>
          {noktalar.length ? <Harita noktalar={noktalar} yukseklik={520} secimModu={secimModu} onAlanSec={(ids) => setSecili((s) => new Set([...s, ...ids.filter((id) => acik(gonderiler.find((g) => g.id === id)!.durum))]))} onNoktaTikla={(id) => { if (!secimModu) toggle(id); }} /> : <div className="card p-6 text-sm text-gray-500 h-[520px] flex items-center justify-center">Filtredeki gönderilerin bilinen konumu yok. İlk dağıtımda konumlar kurye GPS'i ile oluşur; şimdilik ilçe filtresiyle atayın.</div>}
          <p className="text-xs text-gray-500 mt-1">{noktalar.length} gönderi haritada ({noktalar.filter((n) => n.tahmini).length} tahmini, kesikli daire){konumsuz ? `, ${konumsuz} tanesinin konumu yok (listeden seçin)` : ""}. Noktaya tıklayarak seç/kaldır; "alan seç" açıkken basılı tutup sürükleyin.</p>
        </div>
        <div className="card overflow-auto max-h-[560px]">
          <table className="table">
            <thead><tr><th><input type="checkbox" checked={filtreli.length > 0 && filtreli.filter((g) => acik(g.durum)).every((g) => secili.has(g.id))} onChange={(e) => (e.target.checked ? hepsiniSec() : setSecili(new Set()))} /></th><th>Üye</th><th>Adres</th><th>Tercih</th><th>Kurye</th><th>Durum</th></tr></thead>
            <tbody>{filtreli.slice(0, 1000).map((g) => (
              <tr key={g.id} className={secili.has(g.id) ? "bg-blue-50" : ""} onClick={() => acik(g.durum) && toggle(g.id)}>
                <td><input type="checkbox" checked={secili.has(g.id)} disabled={!acik(g.durum)} onChange={() => toggle(g.id)} onClick={(e) => e.stopPropagation()} /></td>
                <td><div className="font-medium">{g.unvan}</div><div className="text-xs text-gray-500">{g.sicilNo}{g.ilce ? ` · ${g.ilce}` : ""}</div></td>
                <td className="text-xs max-w-xs">{g.adres}<div><KonumRozeti durum={g.konumDurumu} /></div>{g.kuryeNotu && <div className="text-blue-800">📝 {g.kuryeNotu}</div>}</td>
                <td className="text-xs">{g.tercih ? UYE_TERCIHI_ETIKET[g.tercih] : "-"}</td>
                <td className="text-xs">{g.kuryeAd ? <span className="badge text-white" style={{ background: kuryeRenk(g.kuryeId!, kuryeler) }}>{g.kuryeAd}</span> : <span className="text-gray-400">—</span>}</td>
                <td><DurumRozeti durum={g.durum} /></td>
              </tr>))}
              {filtreli.length > 1000 && <tr><td colSpan={6} className="text-center text-xs text-gray-500 py-2">İlk 1000 satır gösteriliyor, filtreyi daraltın.</td></tr>}
              {!filtreli.length && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Filtreye uyan gönderi yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <input type="hidden" value={campaignId} readOnly />
    </div>
  );
}

const PALET = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0d9488", "#4f46e5", "#be123c", "#65a30d", "#0891b2", "#9333ea"];
function kuryeRenk(id: string, kuryeler: { id: string }[]) {
  const i = kuryeler.findIndex((k) => k.id === id);
  return PALET[(i < 0 ? 0 : i) % PALET.length];
}
