import { prisma } from "@/lib/db";
import { UyeTercihFormu } from "@/components/UyeTercihFormu";
import { tarih } from "@/lib/format";

export default async function UyeSayfasi({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const g = await prisma.shipment.findUnique({ where: { token }, include: { campaign: true, member: true, memberAddress: true } });
  const oda = await prisma.setting.findUnique({ where: { key: "ODA_ADI" } });
  if (!g || g.campaign.durum === "TAMAMLANDI") return <main className="min-h-screen flex items-center justify-center p-4"><div className="card p-6 max-w-md text-center text-sm">Bu bağlantı geçersiz veya dağıtım tamamlanmış.</div></main>;
  const teslimEdildi = ["TESLIM_EDILDI", "KOMSUYA_BIRAKILDI", "ISYERINE_BIRAKILDI"].includes(g.durum);
  return (
    <main className="min-h-screen flex items-start justify-center p-4 pt-10">
      <div className="card p-6 max-w-md w-full space-y-4">
        <div>
          <div className="text-xs text-gray-500">{oda?.value ?? "Oda"}</div>
          <h1 className="text-lg font-semibold">{g.campaign.ad}</h1>
        </div>
        <div className="text-sm bg-gray-50 rounded-lg p-3">
          <div className="font-medium">{g.member.unvan}</div>
          <div className="text-gray-600">{g.memberAddress.adresMetni}</div>
          {g.campaign.planlananBaslangic && <div className="text-gray-600 mt-1">Planlanan teslimat: {tarih(g.campaign.planlananBaslangic, false)} – {tarih(g.campaign.planlananBitis, false)}</div>}
        </div>
        {teslimEdildi ? <p className="text-sm text-green-700">Zarfınız teslim edilmiştir. Teşekkür ederiz.</p> : (
          <>
            <p className="text-sm text-gray-700">Zarfınız kurye ile yukarıdaki adrese teslim edilecektir. Kuryenin size kolay ulaşması için teslimat tercihinizi bildirin.</p>
            <p className="text-xs text-gray-500">Bu bağlantı size {oda?.value ?? "Oda"} tarafından SMS ile gönderilmiştir; yalnızca sizin gönderinize aittir.</p>
            <UyeTercihFormu token={token} mevcut={g.uyeTercihi} />
          </>
        )}
      </div>
    </main>
  );
}
