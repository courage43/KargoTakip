import { redirect } from "next/navigation";
import { oturumAl } from "@/lib/auth";

export default async function Home() {
  const o = await oturumAl();
  if (!o) redirect("/giris");
  redirect(o.rol === "KURYE_FIRMA_YONETICI" ? "/firma" : "/admin");
}
