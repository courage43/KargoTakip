import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUygulama } from "../lib/durum";

/** Zarf üzerindeki QR kodu okut → ilgili teslimat ekranına git */
export function QrOkut() {
  const nav = useNavigate();
  const { gonderiler } = useUygulama();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [okunan, setOkunan] = useState<string | null>(null);
  const [elle, setElle] = useState("");

  const kodIsle = (kod: string) => {
    const k = kod.trim().toUpperCase();
    const g = gonderiler.find((x) => (x.barkod ?? "").toUpperCase() === k);
    if (g) { nav(`/teslimat/${g.id}`, { replace: true }); return; }
    setOkunan(k);
  };

  useEffect(() => {
    let durdur: (() => void) | null = null;
    let iptal = false;
    (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const okuyucu = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 300 });
        const cihazlar = await BrowserQRCodeReader.listVideoInputDevices();
        if (!cihazlar.length) { setHata("Kamera bulunamadı. Kodu elle girebilirsiniz."); return; }
        const arka = cihazlar.find((c) => /back|arka|rear|environment/i.test(c.label)) ?? cihazlar[cihazlar.length - 1];
        if (iptal || !videoRef.current) return;
        const kontrol = await okuyucu.decodeFromVideoDevice(arka.deviceId, videoRef.current, (sonuc) => { if (sonuc) { kontrol?.stop(); kodIsle(sonuc.getText()); } });
        durdur = () => kontrol.stop();
      } catch (e) {
        setHata(`Kamera açılamadı: ${(e as Error).message}. Kodu elle girebilirsiniz.`);
      }
    })();
    return () => { iptal = true; durdur?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-white border-b p-4 flex items-center gap-3"><button onClick={() => nav(-1)} className="text-2xl leading-none">‹</button><div className="font-bold">Zarf QR kodu okut</div></header>
      <div className="p-4 space-y-3 flex-1">
        <div className="card overflow-hidden bg-black aspect-[3/4] max-h-[60vh] flex items-center justify-center">
          {hata ? <p className="text-white text-sm p-4 text-center">{hata}</p> : <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />}
        </div>
        {okunan && <div className="card p-3 text-sm border-amber-300 bg-amber-50">Okunan kod <b>{okunan}</b> sizin listenizde yok. Bu zarf başka bir kuryeye atanmış veya bu dağıtımda değil.</div>}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); kodIsle(elle); }}>
          <input className="input" placeholder="Zarf kodu (örn. K3-0421)" value={elle} onChange={(e) => setElle(e.target.value)} />
          <button className="btn btn-primary w-auto px-4">Bul</button>
        </form>
      </div>
    </main>
  );
}
