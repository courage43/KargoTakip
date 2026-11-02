"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UYE_ALANLARI, type SutunEslemesi, type EslemeHedefi } from "@dagitim/excel";
import { yuklemeyiIsle } from "@/app/actions/admin";

export function EslemeFormu({ batchId, esleme: ilk, ornek, tur }: { batchId: string; esleme: SutunEslemesi[]; ornek: Record<string, unknown>[]; tur: string }) {
  const [esleme, setEsleme] = useState(ilk);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const degistir = (i: number, hedef: EslemeHedefi) => setEsleme((e) => e.map((x, j) => (j === i ? { ...x, hedef } : x)));

  const gonder = () =>
    start(async () => {
      setHata(null);
      const r = await yuklemeyiIsle(batchId, esleme);
      if (r.hata) setHata(r.hata);
      else router.refresh();
    });

  const renk = (h: EslemeHedefi, hassas: boolean) => (h === "YOKSAY" ? (hassas ? "bg-red-50" : "bg-gray-50") : h === "RAW" ? "bg-blue-50/40" : "bg-green-50");

  return (
    <div className="space-y-4">
      <div className="card overflow-auto max-h-[60vh]">
        <table className="table">
          <thead><tr><th>Excel sütunu</th><th>Örnek değerler</th><th>Hedef alan</th></tr></thead>
          <tbody>
            {esleme.map((e, i) => (
              <tr key={e.baslik} className={renk(e.hedef, e.hassas)}>
                <td className="font-medium">
                  {e.baslik}
                  {e.hassas && <div className="text-xs text-red-700">Hassas veri (KVKK) — varsayılan: yoksay</div>}
                </td>
                <td className="text-xs text-gray-600 max-w-xs truncate">{ornek.slice(0, 3).map((r) => String(r[e.baslik] ?? "")).filter(Boolean).join(" · ") || "—"}</td>
                <td>
                  <select className="input w-56" value={e.hedef} onChange={(ev) => degistir(i, ev.target.value as EslemeHedefi)}>
                    <optgroup label="Üye alanı">
                      {Object.entries(UYE_ALANLARI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </optgroup>
                    <option value="RAW">Ek bilgi olarak sakla</option>
                    <option value="YOKSAY">Yoksay</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hata && <p className="text-sm text-red-600">{hata}</p>}
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={gonder} disabled={pending}>{pending ? "İşleniyor… (5.000 satır ~1 dk)" : tur === "GENEL_LISTE" ? "Üye listesini işle" : "Gönderileri oluştur"}</button>
        <span className="text-xs text-gray-500">Yeşil: üye alanına eşlendi · Mavi: ek bilgi · Gri/Kırmızı: alınmaz</span>
      </div>
    </div>
  );
}
