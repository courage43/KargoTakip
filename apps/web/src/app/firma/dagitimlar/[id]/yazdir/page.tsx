import { notFound } from "next/navigation";
import { oturumGerekli } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UYE_TERCIHI_ETIKET } from "@dagitim/shared";

/** Kurye bazlı yazdırılabilir liste (zarf torbalama / imza listesi) */
export default async function Yazdir({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kurye?: string }> }) {
  const o = await oturumGerekli(["KURYE_FIRMA_YONETICI", "ODA_ADMIN"]);
  const { id } = await params; const sp = await searchParams;
  const k = await prisma.campaign.findUnique({ where: { id } });
  if (!k || (o.rol === "KURYE_FIRMA_YONETICI" && k.courierCompanyId !== o.companyId)) notFound();
  const kuryeler = sp.kurye ? await prisma.user.findMany({ where: { id: sp.kurye } }) : await prisma.user.findMany({ where: { rol: "KURYE", atananGonderiler: { some: { campaignId: id } }, ...(o.rol === "KURYE_FIRMA_YONETICI" ? { courierCompanyId: o.companyId } : {}) }, orderBy: { adSoyad: "asc" } });
  const listeler = await Promise.all(kuryeler.map(async (ku) => ({ ku, g: await prisma.shipment.findMany({ where: { campaignId: id, assignedCourierId: ku.id }, include: { member: true, memberAddress: true }, orderBy: [{ siraNo: "asc" }, { memberAddress: { ilce: "asc" } }, { member: { unvan: "asc" } }] }) })));
  return (
    <html lang="tr"><head><title>{k.ad} — kurye listeleri</title>
      <style>{`body{font-family:system-ui,sans-serif;font-size:11px;margin:12mm} h1{font-size:16px;margin:0 0 4px} h2{font-size:13px;margin:14px 0 4px;page-break-before:always} h2:first-of-type{page-break-before:auto} table{width:100%;border-collapse:collapse} th,td{border:1px solid #999;padding:3px 5px;text-align:left;vertical-align:top} th{background:#eee} .imza{width:70px} @media print{.noprint{display:none}}`}</style></head>
      <body>
        <div className="noprint" style={{ marginBottom: 8 }}><button onClick={undefined} id="yazdir">🖨 Yazdır</button> <span style={{ color: "#666" }}>Ctrl+P ile de yazdırabilirsiniz.</span></div>
        <h1>{k.ad}</h1>
        {listeler.map(({ ku, g }) => (
          <section key={ku.id}>
            <h2>{ku.adSoyad} — {g.length} zarf</h2>
            <table><thead><tr><th>#</th><th>Kod</th><th>Üye</th><th>Adres</th><th>İlçe</th><th>Üye tercihi</th><th>Not</th><th className="imza">İmza</th></tr></thead>
              <tbody>{g.map((x, i) => <tr key={x.id}><td>{x.siraNo ?? i + 1}</td><td>{x.barkod ?? ""}</td><td>{x.member.unvan}</td><td>{x.memberAddress.adresMetni}</td><td>{x.memberAddress.ilce ?? ""}</td><td>{x.uyeTercihi ? UYE_TERCIHI_ETIKET[x.uyeTercihi] : ""}{x.komsuBilgisi ? ` (${x.komsuBilgisi})` : ""}</td><td>{x.memberAddress.kuryeNotu ?? ""}</td><td></td></tr>)}</tbody></table>
          </section>
        ))}
        {!listeler.length && <p>Bu dağıtımda atanmış gönderi yok.</p>}
        <script dangerouslySetInnerHTML={{ __html: `document.getElementById('yazdir').onclick=()=>window.print()` }} />
      </body></html>
  );
}
