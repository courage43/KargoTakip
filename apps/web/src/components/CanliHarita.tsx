"use client";
import { useEffect, useState } from "react";
import { Harita, type Nokta } from "./Harita";
import { useRealtime } from "@/lib/useRealtime";
import { GONDERI_DURUMU_RENK } from "@dagitim/shared";

interface K { id: string; ad: string; lat: number | null; lng: number | null; zaman: string | null; rotaBaslangic: string }
interface G { id: string; lat: number; lng: number; durum: string; kurye: string; etiket: string; href: string; tahmini?: boolean }

export function CanliHarita({ kuryeler: ilkK, gonderiler: ilkG }: { kuryeler: K[]; gonderiler: G[] }) {
  const [kuryeler, setKuryeler] = useState<Record<string, K>>(() => Object.fromEntries(ilkK.map((k) => [k.id, k])));
  const [gonderiler, setGonderiler] = useState<Record<string, G>>(() => Object.fromEntries(ilkG.map((g) => [g.id, g])));
  const [sadece, setSadece] = useState<string | null>(null);
  const [iz, setIz] = useState<[number, number][]>([]);
  const [, setTik] = useState(0);
  // Seçili kuryenin bugünkü izi
  useEffect(() => {
    if (!sadece) { setIz([]); return; }
    let iptal = false;
    const yukle = async () => { try { const r = await fetch(`/api/admin/rota-izi?courierId=${sadece}`); if (r.ok && !iptal) { const d = await r.json(); setIz((d.konumlar as [number, number, number][]).map((k) => [k[0], k[1]])); } } catch { /* yok */ } };
    yukle();
    const t = setInterval(yukle, 30000);
    return () => { iptal = true; clearInterval(t); };
  }, [sadece]);
  const bagli = useRealtime((o) => {
    if (o.kanal === "courier_location") setKuryeler((k) => ({ ...k, [o.courierId as string]: { id: o.courierId as string, ad: (o.ad as string) ?? k[o.courierId as string]?.ad ?? "Kurye", lat: o.lat as number, lng: o.lng as number, zaman: new Date().toISOString(), rotaBaslangic: k[o.courierId as string]?.rotaBaslangic ?? new Date().toISOString() } }));
    if (o.kanal === "route" && o.tip === "bitis") setKuryeler((k) => { const c = { ...k }; delete c[o.courierId as string]; return c; });
    if (o.kanal === "route" && o.tip === "baslangic") setKuryeler((k) => ({ ...k, [o.courierId as string]: k[o.courierId as string] ?? { id: o.courierId as string, ad: (o.ad as string) ?? "Kurye", lat: null, lng: null, zaman: null, rotaBaslangic: new Date().toISOString() } }));
    if (o.kanal === "shipment" && o.shipmentId && o.durum) setGonderiler((g) => (g[o.shipmentId as string] ? { ...g, [o.shipmentId as string]: { ...g[o.shipmentId as string], durum: o.durum as string } } : g));
    setTik((t) => t + 1);
  });
  const kList = Object.values(kuryeler);
  const noktalar: Nokta[] = [
    ...Object.values(gonderiler).filter((g) => !sadece || g.kurye === sadece).map((g) => ({ id: g.id, lat: g.lat, lng: g.lng, renk: GONDERI_DURUMU_RENK[g.durum], etiket: g.etiket, href: g.href, tahmini: g.tahmini })),
    ...kList.filter((k) => k.lat != null && (!sadece || k.id === sadece)).map((k) => ({ id: `k-${k.id}`, lat: k.lat!, lng: k.lng!, renk: "#1d4ed8", etiket: `${k.ad} · ${k.zaman ? new Date(k.zaman).toLocaleTimeString("tr-TR") : ""}`, tip: "kurye" as const })),
  ];
  const sayac = (kuryeId: string) => { const g = Object.values(gonderiler).filter((x) => x.kurye === kuryeId); const bitti = g.filter((x) => !["BEKLIYOR", "ATANDI", "YOLDA"].includes(x.durum)).length; return `${bitti}/${g.length}`; };
  return (
    <div className="grid lg:grid-cols-4 gap-4">
      <div className="card p-3 space-y-2 text-sm">
        <div className="flex items-center justify-between"><span className="font-medium">Sahadaki kuryeler ({kList.length})</span><span className={`text-xs ${bagli ? "text-green-700" : "text-gray-400"}`}>{bagli ? "● canlı" : "○ bağlı değil"}</span></div>
        <button onClick={() => setSadece(null)} className={`w-full text-left px-2 py-1 rounded ${!sadece ? "bg-blue-50" : "hover:bg-gray-50"}`}>Tümü</button>
        {kList.map((k) => { const eski = k.zaman ? (Date.now() - new Date(k.zaman).getTime()) / 60000 : null; return (
          <button key={k.id} onClick={() => setSadece(k.id)} className={`w-full text-left px-2 py-1 rounded ${sadece === k.id ? "bg-blue-50" : "hover:bg-gray-50"}`}>
            <div className="flex justify-between"><span>🛵 {k.ad}</span><span className="text-xs text-gray-500">{sayac(k.id)}</span></div>
            <div className={`text-xs ${eski != null && eski > 45 ? "text-red-600" : "text-gray-500"}`}>{k.zaman ? `${Math.round(eski!)} dk önce` : "konum bekleniyor"}{eski != null && eski > 45 ? " · hareketsiz!" : ""}</div>
          </button>); })}
        {!kList.length && <p className="text-xs text-gray-500">Şu an rotası açık kurye yok.</p>}
      </div>
      <div className="lg:col-span-3 space-y-1">{noktalar.length ? <Harita noktalar={noktalar} yukseklik={560} cizgi={iz} /> : <div className="card p-6 text-sm text-gray-500">Gösterilecek konum yok.</div>}
        {sadece && <p className="text-xs text-gray-500">Mor çizgi: seçili kuryenin bugünkü izi ({iz.length} nokta). Kesikli daireler tahmini konum.</p>}</div>
    </div>
  );
}
