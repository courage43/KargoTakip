"use client";
import { useEffect, useState, useTransition } from "react";
import { geocodeBaslat, geocodeDurum, geocodeBasarisizlariSifirla } from "@/app/actions/geocode";

interface Ozet { bekleyen: number; tahmini: number; dogrulanmis: number; basarisiz: number; calisiyor: boolean; saglayici: string }

export function GeocodeDurumu({ ilk }: { ilk: Ozet }) {
  const [o, setO] = useState(ilk);
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  useEffect(() => {
    if (!o.calisiyor) return;
    const t = setInterval(async () => setO(await geocodeDurum()), 3000);
    return () => clearInterval(t);
  }, [o.calisiyor]);
  const sure = o.saglayici === "nominatim" ? `~${Math.ceil(o.bekleyen / 60)} dk` : o.saglayici === "google" ? `~${Math.ceil(o.bekleyen / 1200)} dk` : "anında";
  return (
    <div className="card p-3 text-sm flex flex-wrap items-center gap-3">
      <div><span className="text-gray-500">Konum:</span> <b className="text-green-700">{o.dogrulanmis}</b> doğrulanmış · <b className="text-yellow-700">{o.tahmini}</b> tahmini · <b>{o.bekleyen}</b> konumsuz{o.basarisiz ? <> · <span className="text-red-700">{o.basarisiz} bulunamadı</span></> : null}</div>
      <div className="text-xs text-gray-500">Sağlayıcı: {o.saglayici}</div>
      {o.calisiyor ? <span className="text-xs text-blue-700 animate-pulse">Konumlar tahmin ediliyor… ({o.bekleyen} kaldı)</span> : (
        <button className="btn-secondary btn-sm" disabled={pending || !o.bekleyen} onClick={() => start(async () => { const r = await geocodeBaslat(); if (r.hata) setMesaj(`Hata: ${r.hata}`); else { setMesaj(`Başladı (tahmini ${sure})`); setO(await geocodeDurum()); } })}>Konumu olmayan {o.bekleyen} adresi tahmin et</button>
      )}
      {o.basarisiz > 0 && !o.calisiyor && <button className="btn-secondary btn-sm" disabled={pending} onClick={() => start(async () => { const n = await geocodeBasarisizlariSifirla(); setMesaj(`${n} adres yeniden denenecek`); setO(await geocodeDurum()); })}>Bulunamayanları yeniden dene</button>}
      {mesaj && <span className="text-xs text-gray-600">{mesaj}</span>}
    </div>
  );
}
