"use client";
import { useState, useTransition } from "react";
import { testSmsGonder } from "@/app/actions/sms";

export function SmsTest() {
  const [tel, setTel] = useState(""); const [sonuc, setSonuc] = useState<{ ok: boolean; mesaj: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="border-t pt-3 flex flex-wrap items-end gap-2">
      <div><label className="label">Test SMS gönder</label><input className="input w-56" placeholder="05xx xxx xx xx" value={tel} onChange={(e) => setTel(e.target.value)} /></div>
      <button className="btn-secondary" disabled={pending || tel.length < 10} onClick={() => start(async () => setSonuc(await testSmsGonder(tel)))}>{pending ? "Gönderiliyor…" : "Gönder"}</button>
      {sonuc && <span className={`text-sm ${sonuc.ok ? "text-green-700" : "text-red-700"}`}>{sonuc.mesaj}</span>}
    </div>
  );
}
