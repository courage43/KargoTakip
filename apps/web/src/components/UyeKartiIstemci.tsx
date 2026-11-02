"use client";
import { useState, useTransition } from "react";
import { Harita, type Nokta } from "./Harita";
import { konumuDuzelt, kuryeNotuKaydet, adresElleDegistir } from "@/app/actions/admin";

interface Adres { id: string; adresMetni: string; adresTipi: string | null; geoLat: number | null; geoLng: number | null; konumDurumu: string; kuryeNotu: string | null; isPrimary: boolean; adayLat: number | null; adayLng: number | null }

export function UyeKartiIstemci({ memberId, adresler, denemeNoktalari }: { memberId: string; adresler: Adres[]; denemeNoktalari: Nokta[] }) {
  const [secili, setSecili] = useState(adresler.find((a) => a.isPrimary)?.id ?? adresler[0]?.id);
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const a = adresler.find((x) => x.id === secili);
  const [not, setNot] = useState(a?.kuryeNotu ?? "");
  const [yeniAdres, setYeniAdres] = useState("");
  const [duzenle, setDuzenle] = useState(false);

  const noktalar: Nokta[] = [];
  if (a?.geoLat != null && a.geoLng != null) noktalar.push({ id: a.id, lat: a.geoLat, lng: a.geoLng, renk: a.konumDurumu === "DOGRULANDI" ? "#16a34a" : "#f59e0b", etiket: "Kayıtlı konum (sürükleyerek düzeltin)", tip: "adres" });
  if (a?.adayLat != null && a.adayLng != null) noktalar.push({ id: a.id + "-aday", lat: a.adayLat, lng: a.adayLng, renk: "#dc2626", etiket: "Aday konum (çakışma)", tip: "aday" });
  noktalar.push(...denemeNoktalari);

  return (
    <div className="space-y-3">
      {adresler.length > 1 && (
        <div className="flex gap-2 flex-wrap">{adresler.map((x) => <button key={x.id} onClick={() => { setSecili(x.id); setNot(x.kuryeNotu ?? ""); }} className={`btn-sm ${x.id === secili ? "btn-primary" : "btn-secondary"}`}>{x.adresTipi ?? "Adres"}{x.isPrimary ? " (ana)" : ""}</button>)}</div>
      )}
      <Harita key={secili} noktalar={noktalar} yukseklik={360} suruklenebilirId={a?.id} onSurukle={(id, lat, lng) => start(async () => { await konumuDuzelt(id, lat, lng); setMesaj("Konum güncellendi (ADMIN_DUZELTME)."); })} />
      {a && a.geoLat == null && <p className="text-xs text-gray-500">Bu adres için konum yok. İlk teslimatta kuryenin GPS'i ile kaydedilecek.</p>}
      {a && (
        <div className="grid md:grid-cols-2 gap-3">
          <div className="card p-3 space-y-2">
            <label className="label">Kalıcı saha notu (kurye ekranında görünür)</label>
            <textarea className="input" rows={2} value={not} onChange={(e) => setNot(e.target.value)} placeholder="Örn: Arka sokaktan girilir, 3. kat, zil çalışmıyor" />
            <button className="btn-secondary btn-sm" disabled={pending} onClick={() => start(async () => { await kuryeNotuKaydet(a.id, not); setMesaj("Not kaydedildi."); })}>Notu kaydet</button>
          </div>
          <div className="card p-3 space-y-2">
            <label className="label">Adres değiştir (eski adres tarihçeye alınır, konum sıfırlanır)</label>
            {!duzenle ? <button className="btn-secondary btn-sm" onClick={() => { setDuzenle(true); setYeniAdres(a.adresMetni); }}>Adresi değiştir</button> : (
              <>
                <textarea className="input" rows={2} value={yeniAdres} onChange={(e) => setYeniAdres(e.target.value)} />
                <div className="flex gap-2">
                  <button className="btn-primary btn-sm" disabled={pending || yeniAdres.trim().length < 5} onClick={() => start(async () => { await adresElleDegistir(memberId, a.id, yeniAdres.trim()); setDuzenle(false); setMesaj("Adres değiştirildi."); })}>Kaydet</button>
                  <button className="btn-secondary btn-sm" onClick={() => setDuzenle(false)}>Vazgeç</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {mesaj && <p className="text-xs text-green-700">{mesaj}</p>}
    </div>
  );
}
