import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useUygulama } from "../lib/durum";
import { tokenKaydet, type Gonderi } from "../lib/api";
import { GONDERI_DURUMU_ETIKET, GONDERI_DURUMU_RENK, UYE_TERCIHI_ETIKET, navigasyonLinki } from "@dagitim/shared";

const ACIK = ["ATANDI", "YOLDA", "BEKLIYOR"];

export function Liste() {
  const { ben, gonderiler, cevrimici, bekleyen, sonSenkron, yukleniyor, yenile, rotaDegistir, kuyrukTetikle } = useUygulama();
  const [sekme, setSekme] = useState<"acik" | "bitti">("acik");
  const [q, setQ] = useState("");
  const [ilce, setIlce] = useState("");
  const acik = useMemo(() => gonderiler.filter((g) => ACIK.includes(g.durum)), [gonderiler]);
  const bitti = useMemo(() => gonderiler.filter((g) => !ACIK.includes(g.durum)), [gonderiler]);
  const ilceler = useMemo(() => [...new Set(acik.map((g) => g.adres.ilce).filter(Boolean))].sort() as string[], [acik]);
  const liste = (sekme === "acik" ? acik : bitti).filter((g) => (!ilce || g.adres.ilce === ilce) && (!q || g.uye.unvan.toLowerCase().includes(q.toLowerCase()) || (g.uye.tabelaUnvani ?? "").toLowerCase().includes(q.toLowerCase()) || g.adres.metin.toLowerCase().includes(q.toLowerCase())));

  return (
    <main className="min-h-screen pb-24">
      <header className="bg-blue-700 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center justify-between">
          <div><div className="font-bold">{ben?.ad ?? "Kurye"}</div><div className="text-xs opacity-80">{ben?.firma ?? ""}</div></div>
          <div className="text-right text-xs">
            <div className={cevrimici ? "text-green-200" : "text-amber-200"}>{cevrimici ? "● çevrimiçi" : "○ çevrimdışı"}</div>
            {bekleyen > 0 && <button onClick={kuyrukTetikle} className="underline">{bekleyen} kayıt gönderilmeyi bekliyor</button>}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => rotaDegistir(ben?.rotaAcik ? "bitir" : "baslat")} className={`flex-1 rounded-xl py-2 font-semibold ${ben?.rotaAcik ? "bg-amber-400 text-amber-950" : "bg-white text-blue-700"}`}>{ben?.rotaAcik ? "■ Rotayı bitir" : "▶ Rotaya başla"}</button>
          <button onClick={yenile} className="rounded-xl px-4 bg-blue-600" disabled={yukleniyor}>{yukleniyor ? "…" : "⟳"}</button>
        </div>
        {ben?.rotaAcik && <p className="text-xs mt-1 opacity-90">Rota açık: konumunuz 30 sn'de bir paylaşılıyor. Uygulamayı ön planda tutun.</p>}
      </header>

      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <button onClick={() => setSekme("acik")} className={`flex-1 py-2 rounded-xl font-medium ${sekme === "acik" ? "bg-blue-700 text-white" : "bg-white border"}`}>Bekleyen ({acik.length})</button>
          <button onClick={() => setSekme("bitti")} className={`flex-1 py-2 rounded-xl font-medium ${sekme === "bitti" ? "bg-blue-700 text-white" : "bg-white border"}`}>Bugün bitti ({bitti.length})</button>
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="Firma veya adres ara" value={q} onChange={(e) => setQ(e.target.value)} />
          {ilceler.length > 1 && <select className="input w-40" value={ilce} onChange={(e) => setIlce(e.target.value)}><option value="">Tüm ilçeler</option>{ilceler.map((i) => <option key={i}>{i}</option>)}</select>}
        </div>
        {sonSenkron && <p className="text-xs text-gray-500">Son güncelleme: {new Date(sonSenkron).toLocaleTimeString("tr-TR")}</p>}

        {liste.map((g, i) => <Kart key={g.id} g={g} sira={i + 1} nav={ben?.navigasyon ?? "google"} />)}
        {!liste.length && <div className="card p-6 text-center text-gray-500 text-sm">{sekme === "acik" ? "Size atanmış bekleyen gönderi yok." : "Bugün tamamlanan gönderi yok."}</div>}
      </div>
      <footer className="fixed bottom-0 inset-x-0 p-3 bg-white border-t text-center text-xs text-gray-500">
        <button className="underline" onClick={() => { tokenKaydet(null); window.location.href = "/giris"; }}>Çıkış yap</button>
      </footer>
    </main>
  );
}

function Kart({ g, sira, nav }: { g: Gonderi; sira: number; nav: "google" | "yandex" | "apple" }) {
  const konumOk = g.adres.konumDurumu === "DOGRULANDI" && g.adres.lat != null;
  const link = navigasyonLinki({ lat: konumOk ? g.adres.lat : null, lng: konumOk ? g.adres.lng : null, adres: g.adres.metin }, nav);
  const acik = ACIK.includes(g.durum);
  const tel = g.uye.cepTelefonu ?? g.uye.isTelefonu;
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-gray-500">#{sira}{g.adres.ilce ? ` · ${g.adres.ilce}` : ""} · {g.kampanyaAd}</div>
          <div className="font-bold leading-tight">{g.uye.unvan}</div>
          {g.uye.tabelaUnvani && g.uye.tabelaUnvani !== g.uye.unvan && <div className="text-sm text-gray-600">Tabela: {g.uye.tabelaUnvani}</div>}
        </div>
        <span className="chip text-white shrink-0" style={{ background: GONDERI_DURUMU_RENK[g.durum] }}>{GONDERI_DURUMU_ETIKET[g.durum]}</span>
      </div>
      <div className="text-sm">{g.adres.metin}</div>
      <div className="flex flex-wrap gap-1">
        {konumOk ? <span className="chip bg-green-100 text-green-800">✓ Konum doğrulanmış</span> : g.adres.konumDurumu === "DOGRULANACAK" ? <span className="chip bg-orange-100 text-orange-800">⚠ Adres değişti, konum doğrulanacak</span> : <span className="chip bg-gray-100 text-gray-700">◐ Konum tahmini / yok</span>}
        {g.tercih && <span className="chip bg-blue-100 text-blue-800">Üye: {UYE_TERCIHI_ETIKET[g.tercih]}{g.komsuBilgisi ? ` → ${g.komsuBilgisi}` : ""}</span>}
        {g.denemeSayisi > 0 && <span className="chip bg-gray-100 text-gray-700">{g.denemeSayisi}. denemeden sonra</span>}
      </div>
      {g.alternatifAdres && <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-2">📍 Üye başka adres bildirdi: <b>{g.alternatifAdres}</b></div>}
      {g.adres.kuryeNotu && <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-2">📝 Saha notu: {g.adres.kuryeNotu}</div>}
      {(g.uyeNotu || g.uygunSaat) && <div className="text-sm text-gray-700">{g.uygunSaat && <>🕒 {g.uygunSaat} </>}{g.uyeNotu && <>💬 {g.uyeNotu}</>}</div>}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <a className="btn btn-secondary py-2 text-sm" href={link} target="_blank" rel="noreferrer">🧭 Yol tarifi</a>
        {tel ? <a className="btn btn-secondary py-2 text-sm" href={`tel:0${tel}`}>📞 Ara</a> : <span className="btn btn-secondary py-2 text-sm opacity-50">📞 Tel yok</span>}
        {acik ? <Link className="btn btn-primary py-2 text-sm" to={`/teslimat/${g.id}`}>Teslimat</Link> : <Link className="btn btn-ghost py-2 text-sm" to={`/teslimat/${g.id}`}>Tekrar dene</Link>}
      </div>
    </div>
  );
}
