"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Harita, type Nokta } from "./Harita";

interface Konum { lat: number; lng: number; t: number }
interface Deneme { id: string; lat: number; lng: number; t: number; renk: string; etiket: string; href?: string }

/** Rota izi + zaman kaydırıcılı oynatma */
export function RotaOynatici({ kuryeAd, konumlar, denemeler }: { kuryeAd: string; konumlar: Konum[]; denemeler: Deneme[] }) {
  const t0 = konumlar[0]?.t ?? denemeler[0]?.t ?? 0;
  const t1 = Math.max(konumlar.at(-1)?.t ?? 0, denemeler.at(-1)?.t ?? 0, t0);
  const [t, setT] = useState(t1);
  const [oynuyor, setOynuyor] = useState(false);
  const [hiz, setHiz] = useState(20);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!oynuyor) { if (ref.current) cancelAnimationFrame(ref.current); return; }
    let son = performance.now();
    const adim = (simdi: number) => {
      const dt = (simdi - son) * hiz; son = simdi;
      setT((x) => { const y = x + dt; if (y >= t1) { setOynuyor(false); return t1; } return y; });
      ref.current = requestAnimationFrame(adim);
    };
    ref.current = requestAnimationFrame(adim);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [oynuyor, hiz, t1]);

  const gorunenKonumlar = useMemo(() => konumlar.filter((k) => k.t <= t), [konumlar, t]);
  const son = gorunenKonumlar.at(-1);
  const noktalar: Nokta[] = [
    ...denemeler.filter((d) => d.t <= t).map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, renk: d.renk, etiket: d.etiket, href: d.href })),
    ...(konumlar.length ? [{ id: "bas", lat: konumlar[0].lat, lng: konumlar[0].lng, renk: "#16a34a", etiket: "Başlangıç", tip: "adres" as const }] : []),
    ...(son ? [{ id: "kurye", lat: son.lat, lng: son.lng, renk: "#1d4ed8", etiket: `${kuryeAd} · ${new Date(son.t).toLocaleTimeString("tr-TR")}`, tip: "kurye" as const }] : []),
  ];
  const cizgi = gorunenKonumlar.map((k) => [k.lat, k.lng] as [number, number]);
  if (!konumlar.length && !denemeler.length) return <div className="card p-6 text-sm text-gray-500">Bu rota için konum kaydı yok (kurye konum izni vermemiş olabilir).</div>;
  const fmt = (x: number) => new Date(x).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-2">
      <Harita noktalar={noktalar.length ? noktalar : [{ id: "x", lat: konumlar[0].lat, lng: konumlar[0].lng }]} cizgi={cizgi} yukseklik={480} otomatikSinir />
      <div className="card p-3 flex flex-wrap items-center gap-3 text-sm">
        <button className="btn-primary btn-sm" onClick={() => { if (t >= t1) setT(t0); setOynuyor((o) => !o); }}>{oynuyor ? "❚❚ Durdur" : "▶ Oynat"}</button>
        <select className="input w-24" value={hiz} onChange={(e) => setHiz(Number(e.target.value))}><option value={1}>1x</option><option value={5}>5x</option><option value={20}>20x</option><option value={60}>60x</option><option value={300}>300x</option></select>
        <span className="text-xs text-gray-500 w-12">{fmt(t0)}</span>
        <input type="range" className="flex-1" min={t0} max={t1} value={t} onChange={(e) => { setOynuyor(false); setT(Number(e.target.value)); }} />
        <span className="text-xs text-gray-500 w-12">{fmt(t1)}</span>
        <span className="font-medium w-16 text-right">{fmt(t)}</span>
        <span className="text-xs text-gray-500">{gorunenKonumlar.length}/{konumlar.length} konum · {denemeler.filter((d) => d.t <= t).length}/{denemeler.length} deneme</span>
      </div>
    </div>
  );
}
