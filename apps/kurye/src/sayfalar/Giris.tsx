import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { tokenKaydet } from "../lib/api";

export function Giris() {
  const [telefon, setTelefon] = useState(""); const [pin, setPin] = useState(""); const [hata, setHata] = useState<string | null>(null); const [bekle, setBekle] = useState(false);
  const nav = useNavigate();
  const gonder = async (e: React.FormEvent) => {
    e.preventDefault(); setBekle(true); setHata(null);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/auth/kurye-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefon, pin }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.hata ?? "Giriş başarısız");
      tokenKaydet(d.token); nav("/", { replace: true }); window.location.reload();
    } catch (err) { setHata((err as Error).message); } finally { setBekle(false); }
  };
  return (
    <main className="min-h-screen flex items-center justify-center p-5">
      <form onSubmit={gonder} className="card p-6 w-full max-w-sm space-y-4">
        <div className="text-center"><div className="text-4xl">🛵</div><h1 className="text-xl font-bold mt-2">Kurye Girişi</h1><p className="text-sm text-gray-500">Telefon numaranız ve PIN ile girin</p></div>
        <input className="input" type="tel" inputMode="numeric" placeholder="05xx xxx xx xx" value={telefon} onChange={(e) => setTelefon(e.target.value)} required autoComplete="tel" />
        <input className="input" type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} required autoComplete="current-password" />
        {hata && <p className="text-sm text-red-600">{hata}</p>}
        <button className="btn btn-primary" disabled={bekle}>{bekle ? "Giriş yapılıyor…" : "Giriş yap"}</button>
      </form>
    </main>
  );
}
