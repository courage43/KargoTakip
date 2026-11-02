import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import { ROL_ETIKET } from "@dagitim/shared";

export default async function FirmaLayout({ children }: { children: React.ReactNode }) {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI"]);
  const firma = o.companyId ? await prisma.courierCompany.findUnique({ where: { id: o.companyId } }) : null;
  return (
    <div className="flex">
      <Sidebar baslik={firma?.ad ?? "Kurye Firması"} ad={o.ad} rolEtiket={ROL_ETIKET[o.rol]} linkler={[
        { href: "/firma", etiket: "Dağıtımlar" },
        { href: "/firma/kuryeler", etiket: "Kuryeler" },
      ]} />
      <main className="flex-1 p-6 max-w-[1500px]">{children}</main>
    </div>
  );
}
