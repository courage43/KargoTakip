import { GONDERI_DURUMU_ETIKET, GONDERI_DURUMU_RENK, KONUM_DURUMU_ETIKET } from "@dagitim/shared";

export function DurumRozeti({ durum }: { durum: string }) {
  const renk = GONDERI_DURUMU_RENK[durum] ?? "#9ca3af";
  return (
    <span className="badge text-white" style={{ background: renk }}>{GONDERI_DURUMU_ETIKET[durum] ?? durum}</span>
  );
}

export function KonumRozeti({ durum }: { durum: string }) {
  const sinif: Record<string, string> = {
    YOK: "bg-gray-100 text-gray-600",
    TAHMINI: "bg-yellow-100 text-yellow-800",
    DOGRULANDI: "bg-green-100 text-green-800",
    DOGRULANACAK: "bg-orange-100 text-orange-800",
    CAKISMA_BEKLIYOR: "bg-red-100 text-red-800",
  };
  const ikon: Record<string, string> = { YOK: "○", TAHMINI: "◐", DOGRULANDI: "✓", DOGRULANACAK: "!", CAKISMA_BEKLIYOR: "⚠" };
  return <span className={`badge ${sinif[durum] ?? ""}`}>{ikon[durum]} {KONUM_DURUMU_ETIKET[durum] ?? durum}</span>;
}
