import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import { ROL_ETIKET } from "@dagitim/shared";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const o = await oturumGerekli(["ODA_ADMIN"]);
  const [adresBekleyen, cakisma, odaAdi] = await Promise.all([
    prisma.addressChangeRequest.count({ where: { karar: "BEKLIYOR" } }),
    prisma.memberAddress.count({ where: { konumDurumu: "CAKISMA_BEKLIYOR" } }),
    prisma.setting.findUnique({ where: { key: "ODA_ADI" } }),
  ]);
  return (
    <div className="flex">
      <Sidebar
        baslik={odaAdi?.value ?? "Dağıtım Takip"}
        ad={o.ad}
        rolEtiket={ROL_ETIKET[o.rol]}
        linkler={[
          { href: "/admin", etiket: "Pano" },
          { href: "/admin/dagitimlar", etiket: "Dağıtımlar" },
          { href: "/admin/uyeler", etiket: "Üyeler" },
          { href: "/admin/uyeler/yukle", etiket: "Üye Listesi Yükle" },
          { href: "/admin/adres-degisiklikleri", etiket: "Adres Değişiklikleri", sayi: adresBekleyen },
          { href: "/admin/konum-cakismalari", etiket: "Konum Çakışmaları", sayi: cakisma },
          { href: "/admin/canli", etiket: "Canlı Harita" },
          { href: "/admin/ayarlar", etiket: "Ayarlar" },
        ]}
      />
      <main className="flex-1 p-6 max-w-[1400px]">{children}</main>
    </div>
  );
}
