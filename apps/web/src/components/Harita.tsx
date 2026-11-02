"use client";
import { useEffect, useRef } from "react";
import type * as LType from "leaflet";

export interface Nokta {
  id: string;
  lat: number;
  lng: number;
  renk?: string;
  etiket?: string;
  href?: string;
  secili?: boolean;
  tip?: "gonderi" | "kurye" | "adres" | "aday";
}

export interface HaritaProps {
  noktalar: Nokta[];
  yukseklik?: number;
  merkez?: [number, number];
  zoom?: number;
  suruklenebilirId?: string;
  onSurukle?: (id: string, lat: number, lng: number) => void;
  onNoktaTikla?: (id: string) => void;
  secimModu?: boolean;
  onAlanSec?: (ids: string[]) => void;
  cizgi?: [number, number][];
  otomatikSinir?: boolean;
}

const VARSAYILAN_MERKEZ: [number, number] = [39.0, 35.0]; // Türkiye

export function Harita({ noktalar, yukseklik = 420, merkez, zoom, suruklenebilirId, onSurukle, onNoktaTikla, secimModu, onAlanSec, cizgi, otomatikSinir = true }: HaritaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const LRef = useRef<typeof LType | null>(null);
  const katmanRef = useRef<LType.LayerGroup | null>(null);
  const cizgiRef = useRef<LType.Polyline | null>(null);
  const secimRef = useRef<{ baslangic: LType.LatLng | null; rect: LType.Rectangle | null }>({ baslangic: null, rect: null });
  const ilkSinir = useRef(false);
  const cb = useRef({ onSurukle, onNoktaTikla, onAlanSec });
  cb.current = { onSurukle, onNoktaTikla, onAlanSec };
  const noktalarRef = useRef(noktalar);
  noktalarRef.current = noktalar;

  // Harita oluştur
  useEffect(() => {
    let iptal = false;
    (async () => {
      const L = (await import("leaflet")).default ?? (await import("leaflet"));
      if (iptal || !ref.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(ref.current, { center: merkez ?? VARSAYILAN_MERKEZ, zoom: zoom ?? (merkez ? 15 : 6), zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      katmanRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      ciz();
    })();
    return () => { iptal = true; mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alan seçimi (dikdörtgen: basılı tut ve sürükle)
  useEffect(() => {
    const map = mapRef.current, L = LRef.current;
    if (!map || !L) return;
    if (!secimModu) { map.dragging.enable(); map.getContainer().style.cursor = ""; return; }
    map.dragging.disable();
    map.getContainer().style.cursor = "crosshair";
    const down = (e: LType.LeafletMouseEvent) => { secimRef.current.baslangic = e.latlng; };
    const move = (e: LType.LeafletMouseEvent) => {
      const b = secimRef.current.baslangic; if (!b) return;
      const bounds = L.latLngBounds(b, e.latlng);
      if (!secimRef.current.rect) secimRef.current.rect = L.rectangle(bounds, { color: "#1d4ed8", weight: 1, fillOpacity: 0.1 }).addTo(map);
      else secimRef.current.rect.setBounds(bounds);
    };
    const up = (e: LType.LeafletMouseEvent) => {
      const b = secimRef.current.baslangic; if (!b) return;
      const bounds = L.latLngBounds(b, e.latlng);
      const ids = noktalarRef.current.filter((n) => bounds.contains([n.lat, n.lng])).map((n) => n.id);
      secimRef.current.rect?.remove(); secimRef.current = { baslangic: null, rect: null };
      cb.current.onAlanSec?.(ids);
    };
    map.on("mousedown", down); map.on("mousemove", move); map.on("mouseup", up);
    return () => { map.off("mousedown", down); map.off("mousemove", move); map.off("mouseup", up); };
  }, [secimModu]);

  function ciz() {
    const map = mapRef.current, L = LRef.current, katman = katmanRef.current;
    if (!map || !L || !katman) return;
    katman.clearLayers();
    for (const n of noktalar) {
      const renk = n.renk ?? "#3b82f6";
      let layer: LType.Layer;
      if (n.tip === "kurye") {
        const icon = L.divIcon({ className: "", html: `<div style="background:${renk};color:#fff;border:2px solid #fff;border-radius:9999px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,.4)">🛵</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
        layer = L.marker([n.lat, n.lng], { icon });
      } else if (n.id === suruklenebilirId || n.tip === "adres" || n.tip === "aday") {
        const icon = L.divIcon({ className: "", html: `<div style="background:${renk};border:3px solid #fff;border-radius:9999px 9999px 9999px 0;width:22px;height:22px;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`, iconSize: [22, 22], iconAnchor: [11, 22] });
        const m = L.marker([n.lat, n.lng], { icon, draggable: n.id === suruklenebilirId });
        if (n.id === suruklenebilirId) m.on("dragend", () => { const p = m.getLatLng(); cb.current.onSurukle?.(n.id, p.lat, p.lng); });
        layer = m;
      } else {
        layer = L.circleMarker([n.lat, n.lng], { radius: n.secili ? 9 : 6, color: n.secili ? "#111827" : "#fff", weight: n.secili ? 3 : 1, fillColor: renk, fillOpacity: 0.95 });
      }
      if (n.etiket) layer.bindTooltip(n.etiket, { direction: "top", offset: [0, -8] });
      if (n.href) layer.bindPopup(`<a href="${n.href}" style="text-decoration:underline">${n.etiket ?? "Detay"}</a>`);
      layer.on("click", () => cb.current.onNoktaTikla?.(n.id));
      katman.addLayer(layer);
    }
    if (cizgiRef.current) { cizgiRef.current.remove(); cizgiRef.current = null; }
    if (cizgi && cizgi.length > 1) cizgiRef.current = L.polyline(cizgi, { color: "#6366f1", weight: 3, opacity: 0.8 }).addTo(map);
    if (otomatikSinir && !ilkSinir.current && noktalar.length) {
      ilkSinir.current = true;
      const b = L.latLngBounds(noktalar.map((n) => [n.lat, n.lng] as [number, number]));
      if (noktalar.length === 1) map.setView([noktalar[0].lat, noktalar[0].lng], zoom ?? 16);
      else map.fitBounds(b.pad(0.1));
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { ciz(); }, [noktalar, suruklenebilirId, cizgi]);

  return <div ref={ref} style={{ height: yukseklik }} className="w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100" />;
}
