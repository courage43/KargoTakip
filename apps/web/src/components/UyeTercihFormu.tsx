"use client";
import { useState } from "react";
import { UYE_TERCIHI_ETIKET } from "@dagitim/shared";

export function UyeTercihFormu({ token, mevcut }: { token: string; mevcut: string | null }) {
  const [tercih, setTercih] = useState(mevcut ?? "ISYERINDEYIM");
  const [komsu, setKomsu] = useState(""); const [adres, setAdres] = useState(""); const [saat, setSaat] = useState(""); const [not, setNot] = useState("");
  const [durum, setDurum] = useState<"bos" | "gonderiliyor" | "ok" | "hata">("bos");
  const gonder = async (e: React.FormEvent) => {
    e.preventDefault(); setDurum("gonderiliyor");
    const r = await fetch(`/api/t/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uyeTercihi: tercih, komsuBilgisi: komsu || undefined, alternatifAdres: adres || undefined, uygunSaat: saat || undefined, uyeNotu: not || undefined }) });
    setDurum(r.ok ? "ok" : "hata");
  };
  if (durum === "ok") return <p className="text-sm text-green-700">Tercihiniz kaydedildi, teşekkür ederiz. {tercih === "ZARF_ISTEMIYORUM" ? "Zarf gönderilmeyecek." : "Kurye bu bilgiyi görecek."}</p>;
  return (
    <form onSubmit={gonder} className="space-y-3">
      <div className="space-y-2">
        {Object.entries(UYE_TERCIHI_ETIKET).map(([k, v]) => (
          <label key={k} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${tercih === k ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}>
            <input type="radio" name="tercih" value={k} checked={tercih === k} onChange={() => setTercih(k)} /> <span className="text-sm">{v}</span>
          </label>
        ))}
      </div>
      {tercih === "KOMSUYA_BIRAK" && <div><label className="label">Komşu / kapıcı bilgisi (ad, kat, daire)</label><input className="input" value={komsu} onChange={(e) => setKomsu(e.target.value)} placeholder="Örn: Ahmet Bey, D:4 veya yanımızdaki eczane" /></div>}
      {(tercih === "BASKA_ADRESE" || tercih === "EVDEYIM") && <div><label className="label">Teslimat adresi</label><textarea className="input" rows={3} value={adres} onChange={(e) => setAdres(e.target.value)} placeholder="Mahalle, sokak, no, daire, ilçe" required /></div>}
      {tercih !== "ZARF_ISTEMIYORUM" && <div><label className="label">Uygun saat aralığı (isteğe bağlı)</label><input className="input" value={saat} onChange={(e) => setSaat(e.target.value)} placeholder="Örn: 10:00–17:00 hafta içi" /></div>}
      <div><label className="label">Not (isteğe bağlı)</label><input className="input" value={not} onChange={(e) => setNot(e.target.value)} placeholder="Kuryeye iletmek istediğiniz bilgi" /></div>
      {durum === "hata" && <p className="text-sm text-red-600">Kaydedilemedi, lütfen tekrar deneyin.</p>}
      <button className="btn-primary w-full justify-center" disabled={durum === "gonderiliyor"}>Tercihimi kaydet</button>
    </form>
  );
}
