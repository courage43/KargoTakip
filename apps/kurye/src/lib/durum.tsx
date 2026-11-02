import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api, tokenAl, type Ben, type Gonderi } from "./api";
import { gonderileriKaydet, gonderileriOku, kuyruguOku, gonderiGuncelle } from "./db";
import { kuyruguGonder } from "./sync";

interface Durum {
  ben: Ben | null;
  gonderiler: Gonderi[];
  sonSenkron: string | null;
  cevrimici: boolean;
  bekleyen: number;
  yukleniyor: boolean;
  yenile: () => Promise<void>;
  yerelGuncelle: (id: string, d: Partial<Gonderi>) => Promise<void>;
  rotaDegistir: (islem: "baslat" | "bitir") => Promise<void>;
  kuyrukTetikle: () => Promise<void>;
}

const Ctx = createContext<Durum | null>(null);
export const useUygulama = () => { const c = useContext(Ctx); if (!c) throw new Error("UygulamaSaglayici yok"); return c; };

export function UygulamaSaglayici({ children }: { children: React.ReactNode }) {
  const [ben, setBen] = useState<Ben | null>(null);
  const [gonderiler, setGonderiler] = useState<Gonderi[]>([]);
  const [sonSenkron, setSonSenkron] = useState<string | null>(null);
  const [cevrimici, setCevrimici] = useState(navigator.onLine);
  const [bekleyen, setBekleyen] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(false);
  const konumTimer = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const kuyrukTetikle = useCallback(async () => { setBekleyen(await kuyruguGonder(setBekleyen)); }, []);

  const yenile = useCallback(async () => {
    if (!tokenAl()) return;
    setYukleniyor(true);
    try {
      await kuyrukTetikle();
      const [me, r] = await Promise.all([api<Ben>("/api/kurye/me"), api<{ gonderiler: Gonderi[]; sunucuZamani: string }>("/api/kurye/gonderiler")]);
      setBen(me); setGonderiler(r.gonderiler); setSonSenkron(r.sunucuZamani);
      await gonderileriKaydet(r.gonderiler);
    } catch {
      const yerel = await gonderileriOku();
      setGonderiler(yerel.liste); setSonSenkron(yerel.sonSenkron);
    } finally { setYukleniyor(false); }
  }, [kuyrukTetikle]);

  const yerelGuncelle = useCallback(async (id: string, d: Partial<Gonderi>) => {
    setGonderiler((g) => g.map((x) => (x.id === id ? { ...x, ...d } : x)));
    await gonderiGuncelle(id, d);
  }, []);

  const rotaDegistir = useCallback(async (islem: "baslat" | "bitir") => {
    const r = await api<{ rotaAcik: boolean }>("/api/kurye/rota", { method: "POST", body: JSON.stringify({ islem }) });
    setBen((b) => (b ? { ...b, rotaAcik: r.rotaAcik } : b));
    await yenile();
  }, [yenile]);

  // İlk yükleme: önce yerel, sonra ağ
  useEffect(() => {
    (async () => { const yerel = await gonderileriOku(); if (yerel.liste.length) { setGonderiler(yerel.liste); setSonSenkron(yerel.sonSenkron); } setBekleyen((await kuyruguOku()).length); await yenile(); })();
    const on = () => { setCevrimici(true); kuyrukTetikle().then(yenile); };
    const off = () => setCevrimici(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    const t = window.setInterval(() => { if (navigator.onLine) kuyrukTetikle(); }, 30000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.clearInterval(t); };
  }, [yenile, kuyrukTetikle]);

  // Rota açıkken konum gönder (30 sn)
  useEffect(() => {
    if (konumTimer.current) { window.clearInterval(konumTimer.current); konumTimer.current = null; }
    if (!ben?.rotaAcik) return;
    const gonder = () => navigator.geolocation?.getCurrentPosition(
      (p) => api("/api/kurye/konum", { method: "POST", body: JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy, hiz: p.coords.speed ?? null }) }).catch(() => {}),
      () => {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
    gonder();
    konumTimer.current = window.setInterval(gonder, 30000);
    return () => { if (konumTimer.current) window.clearInterval(konumTimer.current); };
  }, [ben?.rotaAcik]);

  // Realtime: atama değişince yenile
  useEffect(() => {
    const t = tokenAl(); const url = import.meta.env.VITE_REALTIME_URL;
    if (!t || !url) return;
    const s = io(url, { auth: { token: t }, transports: ["websocket", "polling"] });
    s.on("olay", (o: { kanal: string; tip?: string }) => { if (o.kanal === "shipment" && (o.tip === "atama" || o.tip === "yenile" || o.tip === "tercih" || o.tip === "elle")) yenile(); if (o.kanal === "campaign") yenile(); });
    socketRef.current = s;
    return () => { s.disconnect(); };
  }, [yenile]);

  return <Ctx.Provider value={{ ben, gonderiler, sonSenkron, cevrimici, bekleyen, yukleniyor, yenile, yerelGuncelle, rotaDegistir, kuyrukTetikle }}>{children}</Ctx.Provider>;
}
