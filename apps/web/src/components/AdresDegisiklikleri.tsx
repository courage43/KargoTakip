"use client";
import { useState, useTransition } from "react";
import { adresKarari, topluAdresKarari } from "@/app/actions/admin";

export interface Talep { id: string; memberId: string; unvan: string; sicilNo: string; eskiAdres: string | null; yeniAdres: string; benzerlikSkoru: number | null; eskiKonumVarMi: boolean; kaynak: string; createdAt: string }

type Karar = "YENI_ADRES" | "AYNI_YER" | "REDDEDILDI";

export function AdresDegisiklikleri({ talepler }: { talepler: Talep[] }) {
  const oneri = (t: Talep): Karar => (t.benzerlikSkoru != null && t.benzerlikSkoru >= 0.9 ? "AYNI_YER" : "YENI_ADRES");
  const [secimler, setSecimler] = useState<Record<string, Karar>>(() => Object.fromEntries(talepler.map((t) => [t.id, oneri(t)])));
  const [pending, start] = useTransition();
  const [bitti, setBitti] = useState<Set<string>>(new Set());

  const uygula = (id: string) => start(async () => { await adresKarari(id, secimler[id]); setBitti((s) => new Set(s).add(id)); });
  const topluUygula = () => start(async () => {
    const kalan = talepler.filter((t) => !bitti.has(t.id));
    for (const k of ["AYNI_YER", "YENI_ADRES", "REDDEDILDI"] as Karar[]) {
      const ids = kalan.filter((t) => secimler[t.id] === k).map((t) => t.id);
      if (ids.length) await topluAdresKarari(ids, k);
    }
    setBitti(new Set(talepler.map((t) => t.id)));
  });
  const kalan = talepler.filter((t) => !bitti.has(t.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Her satır için öneri seçili geldi (benzerlik ≥ %90 → aynı yer). Kontrol edip toplu onaylayabilirsiniz.</p>
        <button className="btn-primary" disabled={pending || !kalan.length} onClick={topluUygula}>{pending ? "Uygulanıyor…" : `Seçimleri toplu uygula (${kalan.length})`}</button>
      </div>
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th>Üye</th><th>Eski adres</th><th>Yeni adres</th><th>Benzerlik</th><th>Eski konum</th><th>Kaynak</th><th>Karar</th><th></th></tr></thead>
          <tbody>
            {kalan.map((t) => (
              <tr key={t.id}>
                <td><a className="underline font-medium" href={`/admin/uyeler/${t.memberId}`}>{t.unvan}</a><div className="text-xs text-gray-500">{t.sicilNo}</div></td>
                <td className="text-xs max-w-xs">{t.eskiAdres ?? "—"}</td>
                <td className="text-xs max-w-xs">{t.yeniAdres}</td>
                <td>{t.benzerlikSkoru != null ? <span className={`badge ${t.benzerlikSkoru >= 0.9 ? "bg-green-100 text-green-800" : t.benzerlikSkoru >= 0.7 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>%{Math.round(t.benzerlikSkoru * 100)}</span> : "-"}</td>
                <td>{t.eskiKonumVarMi ? <span className="badge bg-green-100 text-green-800">✓ doğrulanmış</span> : <span className="text-xs text-gray-400">yok</span>}</td>
                <td className="text-xs">{{ EXCEL: "Excel", UYE_SAYFASI: "Üye sayfası", KURYE_TASINMIS: "Kurye: taşınmış", ADMIN: "Yönetici" }[t.kaynak] ?? t.kaynak}</td>
                <td>
                  <select className="input w-56" value={secimler[t.id]} onChange={(e) => setSecimler((s) => ({ ...s, [t.id]: e.target.value as Karar }))}>
                    <option value="YENI_ADRES">Yeni adres, konum sıfırlansın</option>
                    <option value="AYNI_YER">Sadece yazım farkı, aynı yer</option>
                    <option value="REDDEDILDI">Değişikliği reddet</option>
                  </select>
                </td>
                <td><button className="btn-secondary btn-sm" disabled={pending} onClick={() => uygula(t.id)}>Uygula</button></td>
              </tr>
            ))}
            {!kalan.length && <tr><td colSpan={8} className="text-center text-gray-500 py-6">Bekleyen adres değişikliği yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
