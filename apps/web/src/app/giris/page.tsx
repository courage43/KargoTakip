"use client";
import { useActionState } from "react";
import { girisYap } from "@/app/actions/auth";

export default function GirisSayfasi() {
  const [state, action, pending] = useActionState(girisYap, undefined);
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Dağıtım Takip</h1>
          <p className="text-sm text-gray-500">Oda ve kurye firması yöneticisi girişi</p>
        </div>
        <div>
          <label className="label" htmlFor="eposta">E-posta</label>
          <input id="eposta" name="eposta" type="email" required className="input" autoComplete="username" />
        </div>
        <div>
          <label className="label" htmlFor="sifre">Şifre</label>
          <input id="sifre" name="sifre" type="password" required className="input" autoComplete="current-password" />
        </div>
        {state?.hata && <p className="text-sm text-red-600">{state.hata}</p>}
        <button className="btn-primary w-full justify-center" disabled={pending}>{pending ? "Giriş yapılıyor…" : "Giriş yap"}</button>
        <p className="text-xs text-gray-500 text-center">Kurye misiniz? <a className="underline" href={process.env.NEXT_PUBLIC_KURYE_URL ?? "/kurye"}>Kurye uygulamasına gidin</a></p>
      </form>
    </main>
  );
}
