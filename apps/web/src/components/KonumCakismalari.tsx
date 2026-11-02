"use client";
import { useState, useTransition } from "react";
import { Harita } from "./Harita";
import { cakismaCoz } from "@/app/actions/admin";

export interface Cakisma { id: string; memberId: string; unvan: string; adresMetni: string; geoLat: number; geoLng: number; adayLat: number; adayLng: number; verifiedCount: number; mesafeM: number; denemeBilgi: string }

export function KonumCakismalari({ liste }: { liste: Cakisma[] }) {
  const [secili, setSecili] = useState(liste[0]?.id);
  const [pending, start] = useTransition();
  const [bitti, setBitti] = useState<Set<string>>(new Set());
  const kalan = liste.filter((c) => !bitti.has(c.id));
  const c = kalan.find((x) => x.id === secili) ?? kalan[0];
  const coz = (secim: "MEVCUT" | "ADAY") => c && start(async () => { await cakismaCoz(c.id, secim); setBitti((s) => new Set(s).add(c.id)); });
  if (!kalan.length) return <p className="text-sm text-gray-500 card p-4">Bekleyen konum çakışması yok.</p>;
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card overflow-auto max-h-[70vh]">
        {kalan.map((x) => (
          <button key={x.id} onClick={() => setSecili(x.id)} className={`w-full text-left p-3 border-b border-gray-100 text-sm hover:bg-gray-50 ${c?.id === x.id ? "bg-blue-50" : ""}`}>
            <div className="font-medium">{x.unvan}</div>
            <div className="text-xs text-gray-500">{x.adresMetni}</div>
            <div className="text-xs text-red-700">{x.mesafeM} m fark · mevcut {x.verifiedCount} kez doğrulanmış</div>
          </button>
        ))}
      </div>
      {c && (
        <div className="lg:col-span-2 space-y-3">
          <Harita key={c.id} yukseklik={380} noktalar={[
            { id: "mevcut", lat: c.geoLat, lng: c.geoLng, renk: "#16a34a", etiket: `Mevcut doğrulanmış konum (${c.verifiedCount} kez)`, tip: "adres" },
            { id: "aday", lat: c.adayLat, lng: c.adayLng, renk: "#dc2626", etiket: `Yeni kurye GPS'i · ${c.denemeBilgi}`, tip: "aday" },
          ]} />
          <div className="flex gap-2 items-center">
            <button className="btn-secondary" disabled={pending} onClick={() => coz("MEVCUT")}>Mevcut konumu koru (yeşil)</button>
            <button className="btn-primary" disabled={pending} onClick={() => coz("ADAY")}>Yeni konumu kabul et (kırmızı)</button>
            <a className="text-sm underline ml-auto" href={`/admin/uyeler/${c.memberId}`}>Üye kartında düzelt</a>
          </div>
        </div>
      )}
    </div>
  );
}
