"use client";
import { useState } from "react";
import { Harita, type Nokta } from "./Harita";
import { useRealtime } from "@/lib/useRealtime";
import { GONDERI_DURUMU_RENK } from "@dagitim/shared";

interface G { id: string; lat: number; lng: number; durum: string; etiket: string; href: string; tahmini?: boolean }

/** Kampanya haritası: gönderi durum renkleri + canlı kurye konumları */
export function KampanyaHarita({ campaignId, noktalar: ilk }: { campaignId: string; noktalar: G[] }) {
  const [gonderiler, setGonderiler] = useState<Record<string, G>>(() => Object.fromEntries(ilk.map((g) => [g.id, g])));
  const [kuryeler, setKuryeler] = useState<Record<string, { lat: number; lng: number; ad: string; at: number }>>({});
  const [acik, setAcik] = useState(true);
  const bagli = useRealtime((o) => {
    if (o.kanal === "shipment" && o.shipmentId && o.durum && (!o.campaignId || o.campaignId === campaignId)) {
      setGonderiler((s) => (s[o.shipmentId as string] ? { ...s, [o.shipmentId as string]: { ...s[o.shipmentId as string], durum: o.durum as string } } : s));
    }
    if (o.kanal === "courier_location" && (!o.campaignId || o.campaignId === campaignId)) {
      setKuryeler((k) => ({ ...k, [o.courierId as string]: { lat: o.lat as number, lng: o.lng as number, ad: (o.ad as string) ?? "Kurye", at: Date.now() } }));
    }
  });
  const liste: Nokta[] = [
    ...Object.values(gonderiler).map((g) => ({ id: g.id, lat: g.lat, lng: g.lng, renk: GONDERI_DURUMU_RENK[g.durum], etiket: g.etiket, href: g.href, tahmini: g.tahmini })),
    ...Object.entries(kuryeler).map(([id, k]) => ({ id: `k-${id}`, lat: k.lat, lng: k.lng, renk: "#1d4ed8", etiket: `${k.ad} (canlı)`, tip: "kurye" as const })),
  ];
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Harita</h2>
        <span className={`text-xs ${bagli ? "text-green-700" : "text-gray-400"}`}>{bagli ? "● canlı" : "○ bağlantı yok"}</span>
        <span className="text-xs text-gray-500">{Object.keys(gonderiler).length} konumlu gönderi · {Object.keys(kuryeler).length} kurye sahada</span>
        <button className="btn-secondary btn-sm ml-auto" onClick={() => setAcik((a) => !a)}>{acik ? "Gizle" : "Göster"}</button>
      </div>
      {acik && (liste.length ? <Harita noktalar={liste} yukseklik={440} /> : <p className="text-sm text-gray-500 card p-4">Henüz konumu bilinen gönderi yok. İlk teslimatlardan sonra harita dolacaktır.</p>)}
    </section>
  );
}
