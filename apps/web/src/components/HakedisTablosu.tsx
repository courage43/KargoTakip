import type { HakedisSatiri } from "@/lib/campaign";

const saat = (d: Date | null) => (d ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "-");

export function HakedisTablosu({ satirlar, baslik = "Kurye hakediş (gün bazlı)" }: { satirlar: HakedisSatiri[]; baslik?: string }) {
  if (!satirlar.length) return null;
  const toplam = satirlar.reduce((a, s) => ({ teslim: a.teslim + s.teslim, basarisiz: a.basarisiz + s.basarisiz, deneme: a.deneme + s.deneme, km: a.km + (s.rotaKm ?? 0) }), { teslim: 0, basarisiz: 0, deneme: 0, km: 0 });
  return (
    <section className="card">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between"><h2 className="font-semibold">{baslik}</h2><span className="text-xs text-gray-500">Excel'deki "Hakediş" sayfasıyla aynı</span></div>
      <table className="table">
        <thead><tr><th>Kurye</th><th>Gün</th><th>Teslim</th><th>Başarısız</th><th>Deneme</th><th>İlk</th><th>Son</th><th>Rota km</th></tr></thead>
        <tbody>
          {satirlar.map((s) => <tr key={`${s.kuryeId}-${s.gun}`}><td className="font-medium">{s.kurye}</td><td>{s.gun}</td><td className="text-green-700">{s.teslim}</td><td className="text-red-700">{s.basarisiz}</td><td>{s.deneme}</td><td className="text-xs">{saat(s.ilk)}</td><td className="text-xs">{saat(s.son)}</td><td>{s.rotaKm ?? "-"}</td></tr>)}
          <tr className="font-semibold bg-gray-50"><td colSpan={2}>Toplam</td><td className="text-green-700">{toplam.teslim}</td><td className="text-red-700">{toplam.basarisiz}</td><td>{toplam.deneme}</td><td colSpan={2}></td><td>{Math.round(toplam.km * 10) / 10}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
