"use server";
import { redirect } from "next/navigation";
import { epostaIleGiris, oturumCerezSil, oturumCerezYaz } from "@/lib/auth";

export async function girisYap(_prev: { hata?: string } | undefined, form: FormData): Promise<{ hata?: string }> {
  const eposta = String(form.get("eposta") ?? "");
  const sifre = String(form.get("sifre") ?? "");
  const o = await epostaIleGiris(eposta, sifre);
  if (!o) return { hata: "E-posta veya şifre hatalı." };
  if (o.rol === "KURYE") return { hata: "Kuryeler mobil uygulamadan giriş yapar." };
  await oturumCerezYaz(o);
  redirect(o.rol === "KURYE_FIRMA_YONETICI" ? "/firma" : "/admin");
}

export async function cikisYap() {
  await oturumCerezSil();
  redirect("/giris");
}
