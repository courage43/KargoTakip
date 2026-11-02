import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SignaturePad from "signature_pad";
import { useUygulama } from "../lib/durum";
import { kuyrugaEkle } from "../lib/db";
import { konumAl, fotoKucult, type Konum } from "../lib/konum";
import { GONDERI_DURUMU_ETIKET, TESLIM_ALAN_ETIKET, KURYE_SONUCLARI, TESLIM_SONUCLARI, type KuryeSonucu } from "@dagitim/shared";

const ACIKLAMA: Record<KuryeSonucu, string> = {
  TESLIM_EDILDI: "Yetkiliye veya çalışana elden teslim",
  ISYERINE_BIRAKILDI: "İş yerine bırakıldı (resepsiyon, sekreter, posta kutusu)",
  KOMSUYA_BIRAKILDI: "Komşu / kapıcı / yan dükkâna bırakıldı",
  ADRESTE_BULUNAMADI: "Kapalı, kimse yok (fotoğraf kanıt olur)",
  ADRES_HATALI: "Adres bulunamıyor / böyle bir yer yok",
  TASINMIS: "Üye bu adresten taşınmış",
};

export function Teslimat() {
  const { id } = useParams();
  const nav = useNavigate();
  const { gonderiler, yerelGuncelle, kuyrukTetikle, cevrimici } = useUygulama();
  const g = gonderiler.find((x) => x.id === id);
  const [sonuc, setSonuc] = useState<KuryeSonucu | null>(null);
  const [konum, setKonum] = useState<Konum | null>(null);
  const [konumDurum, setKonumDurum] = useState<"aliniyor" | "ok" | "yok">("aliniyor");
  const [fotolar, setFotolar] = useState<Blob[]>([]);
  const [onizleme, setOnizleme] = useState<string[]>([]);
  const [teslimAlan, setTeslimAlan] = useState(""); const [iliski, setIliski] = useState("YETKILI"); const [not, setNot] = useState(""); const [sahaNotu, setSahaNotu] = useState("");
  const [konumKaydet, setKonumKaydet] = useState(true);
  const [imzaVar, setImzaVar] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => { konumAl().then((k) => { setKonum(k); setKonumDurum(k ? "ok" : "yok"); }); }, []);
  useEffect(() => { if (sonuc && ["ADRES_HATALI", "TASINMIS"].includes(sonuc)) setKonumKaydet(false); else if (sonuc) setKonumKaydet(true); }, [sonuc]);
  const teslim = !!sonuc && TESLIM_SONUCLARI.includes(sonuc);
  useEffect(() => {
    if (!teslim || !canvasRef.current) return;
    const c = canvasRef.current;
    const oran = Math.max(window.devicePixelRatio || 1, 1);
    c.width = c.offsetWidth * oran; c.height = c.offsetHeight * oran; c.getContext("2d")!.scale(oran, oran);
    const pad = new SignaturePad(c, { penColor: "#111827" });
    pad.addEventListener("endStroke", () => setImzaVar(!pad.isEmpty()));
    padRef.current = pad;
    return () => pad.off();
  }, [teslim]);

  if (!g) return <main className="p-5"><p>Gönderi bulunamadı.</p><button className="btn btn-secondary mt-3" onClick={() => nav("/")}>Listeye dön</button></main>;

  const fotoSec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const k = await fotoKucult(f);
    setFotolar((x) => [...x, k]); setOnizleme((x) => [...x, URL.createObjectURL(k)]);
    e.target.value = "";
  };

  const kaydet = async () => {
    setHata(null);
    if (!sonuc) return setHata("Sonuç seçin.");
    if (!fotolar.length) return setHata("En az bir fotoğraf çekin (kanıt).");
    if (teslim && !teslimAlan.trim()) return setHata("Teslim alan kişinin adını yazın.");
    if (teslim && !imzaVar) return setHata("Teslim alan kişiden imza alın.");
    setGonderiliyor(true);
    const dosyalar: { blob: Blob; tur: "foto" | "imza" }[] = fotolar.map((b) => ({ blob: b, tur: "foto" as const }));
    if (teslim && padRef.current && !padRef.current.isEmpty()) {
      const dataUrl = padRef.current.toDataURL("image/png");
      dosyalar.push({ blob: await (await fetch(dataUrl)).blob(), tur: "imza" });
    }
    const istemciId = crypto.randomUUID();
    await kuyrugaEkle({
      istemciId, shipmentId: g.id, olusturma: new Date().toISOString(), fotolar: dosyalar,
      payload: {
        sonuc, lat: konum?.lat ?? null, lng: konum?.lng ?? null, accuracyM: konum?.accuracyM ?? null,
        teslimAlanAdi: teslim ? teslimAlan.trim() : null, teslimAlanIliskisi: teslim ? iliski : null,
        not: not.trim() || null, konumKaydet: konumKaydet && !!konum, kuryeNotu: sahaNotu.trim() || null,
        offlineOlusturuldu: !navigator.onLine, cihazZamani: new Date().toISOString(),
      },
    });
    await yerelGuncelle(g.id, { durum: sonuc, denemeSayisi: g.denemeSayisi + 1, sonDeneme: { sonuc, sunucuZamani: new Date().toISOString() } });
    kuyrukTetikle();
    nav("/", { replace: true });
  };

  return (
    <main className="min-h-screen pb-28">
      <header className="bg-white border-b p-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="text-2xl leading-none">‹</button>
        <div className="min-w-0"><div className="font-bold truncate">{g.uye.unvan}</div><div className="text-xs text-gray-600 truncate">{g.adres.metin}</div></div>
      </header>
      <div className="p-4 space-y-4">
        <div className={`card p-3 text-sm flex items-center justify-between ${konumDurum === "yok" ? "border-amber-300 bg-amber-50" : ""}`}>
          <span>📡 GPS: {konumDurum === "aliniyor" ? "alınıyor…" : konumDurum === "ok" ? `alındı (±${Math.round(konum!.accuracyM ?? 0)} m)` : "alınamadı — konum izni verin"}</span>
          {konumDurum !== "aliniyor" && <button className="text-blue-700 underline" onClick={() => { setKonumDurum("aliniyor"); konumAl().then((k) => { setKonum(k); setKonumDurum(k ? "ok" : "yok"); }); }}>yenile</button>}
        </div>

        <section className="space-y-2">
          <h2 className="font-semibold">Sonuç</h2>
          {KURYE_SONUCLARI.map((s) => (
            <button key={s} onClick={() => setSonuc(s)} className={`w-full text-left card p-3 ${sonuc === s ? "border-blue-600 ring-2 ring-blue-200" : ""}`}>
              <div className="font-semibold">{GONDERI_DURUMU_ETIKET[s]}</div><div className="text-xs text-gray-600">{ACIKLAMA[s]}</div>
            </button>
          ))}
        </section>

        {sonuc && (
          <>
            <section className="space-y-2">
              <h2 className="font-semibold">Fotoğraf <span className="text-sm font-normal text-gray-500">(zorunlu, {sonuc === "ADRESTE_BULUNAMADI" ? "kapı veya tabela" : "teslim yeri"})</span></h2>
              <div className="flex gap-2 flex-wrap">
                {onizleme.map((u, i) => <div key={u} className="relative"><img src={u} className="h-24 w-24 object-cover rounded-lg border" alt="" /><button onClick={() => { setFotolar((f) => f.filter((_, j) => j !== i)); setOnizleme((o) => o.filter((_, j) => j !== i)); }} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs">✕</button></div>)}
                <label className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-sm text-gray-600 bg-white cursor-pointer">📷<span>Çek</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={fotoSec} /></label>
              </div>
            </section>

            {teslim && (
              <section className="space-y-2">
                <h2 className="font-semibold">Teslim alan</h2>
                <input className="input" placeholder="Ad Soyad" value={teslimAlan} onChange={(e) => setTeslimAlan(e.target.value)} />
                <div className="grid grid-cols-4 gap-1">{Object.entries(TESLIM_ALAN_ETIKET).map(([k, v]) => <button key={k} onClick={() => setIliski(k)} className={`py-2 rounded-lg text-xs border ${iliski === k ? "bg-blue-700 text-white border-blue-700" : "bg-white"}`}>{v}</button>)}</div>
                <div className="card overflow-hidden"><div className="text-xs text-gray-500 px-3 pt-2">İmza</div><canvas ref={canvasRef} className="w-full h-40 touch-none" /><button className="w-full text-xs py-2 text-blue-700 border-t" onClick={() => { padRef.current?.clear(); setImzaVar(false); }}>Temizle</button></div>
              </section>
            )}

            <section className="space-y-2">
              <input className="input" placeholder={sonuc === "TASINMIS" ? "Yeni adres biliniyorsa yazın" : "Not (isteğe bağlı)"} value={not} onChange={(e) => setNot(e.target.value)} />
              <input className="input" placeholder="Kalıcı saha notu (örn: arka kapı, 3. kat, zil bozuk)" value={sahaNotu} onChange={(e) => setSahaNotu(e.target.value)} />
              <label className={`card p-3 flex items-start gap-3 ${!konum ? "opacity-50" : ""}`}>
                <input type="checkbox" className="mt-1 h-5 w-5" checked={konumKaydet} disabled={!konum} onChange={(e) => setKonumKaydet(e.target.checked)} />
                <span className="text-sm"><b>Bu konumu üyenin kalıcı konumu olarak kaydet</b><br /><span className="text-gray-600">Bir sonraki dağıtımda kurye doğrudan bu noktaya yönlendirilir. Yanlış kapıdaysanız işareti kaldırın.</span></span>
              </label>
            </section>
          </>
        )}
        {hata && <p className="text-sm text-red-600 font-medium">{hata}</p>}
      </div>
      <footer className="fixed bottom-0 inset-x-0 p-3 bg-white border-t">
        <button className="btn btn-primary" disabled={!sonuc || gonderiliyor} onClick={kaydet}>{gonderiliyor ? "Kaydediliyor…" : cevrimici ? "Kaydet ve gönder" : "Kaydet (çevrimdışı, sonra gönderilir)"}</button>
      </footer>
    </main>
  );
}
