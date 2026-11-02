import { prisma } from "@/lib/db";
import { KonumCakismalari } from "@/components/KonumCakismalari";
import { mesafeM } from "@dagitim/shared";
import { tarih } from "@/lib/format";

export default async function KonumCakismalariSayfasi() {
  const liste = await prisma.memberAddress.findMany({ where: { konumDurumu: "CAKISMA_BEKLIYOR" }, include: { member: true }, orderBy: { updatedAt: "desc" } });
  const denemeler = await prisma.deliveryAttempt.findMany({ where: { id: { in: liste.map((l) => l.adayAttemptId!).filter(Boolean) } }, include: { courier: true } });
  const dMap = new Map(denemeler.map((d) => [d.id, d]));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Konum Çakışmaları <span className="text-base text-gray-500 font-normal">({liste.length})</span></h1>
      <p className="text-sm text-gray-600">Doğrulanmış konumu olan bir adrese 150 m'den uzak yeni bir GPS kaydı geldi. Kurye yanlış kapıda kaydetmiş olabilir ya da önceki konum hatalıydı. Hangisinin doğru olduğunu seçin.</p>
      <KonumCakismalari liste={liste.filter((l) => l.geoLat != null && l.adayLat != null).map((l) => { const d = l.adayAttemptId ? dMap.get(l.adayAttemptId) : null; return {
        id: l.id, memberId: l.memberId, unvan: l.member.unvan, adresMetni: l.adresMetni, geoLat: l.geoLat!, geoLng: l.geoLng!, adayLat: l.adayLat!, adayLng: l.adayLng!, verifiedCount: l.verifiedCount,
        mesafeM: Math.round(mesafeM(l.geoLat!, l.geoLng!, l.adayLat!, l.adayLng!)), denemeBilgi: d ? `${d.courier.adSoyad}, ${tarih(d.sunucuZamani)}` : "",
      }; })} />
    </div>
  );
}
