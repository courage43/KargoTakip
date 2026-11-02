"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { kampanyaSmsGonder, smsRaporGuncelle } from "@/app/actions/sms";

interface Props {
  campaignId: string;
  telefonlu: number; telefonsuz: number;
  ozet: Record<string, Record<string, number>>;
  toplamParca: number; birimFiyat: number; uygunTercih: number;
  onizleme: string; parca: number; turkce: boolean;
  saglayici: string; baslikVar: boolean;
  tercihler: Record<string, number>;
}

const DURUM: [string, string, string][] = [["KUYRUKTA", "Kuyrukta", "bg-gray-100 text-gray-700"], ["GONDERILDI", "Gönderildi", "bg-blue-100 text-blue-800"], ["ILETILDI", "İletildi", "bg-green-100 text-green-800"], ["HATA", "Hata", "bg-red-100 text-red-800"]];

export function SmsKarti(p: Props) {
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const router = useRouter();
  const tercih = p.ozet.TERCIH ?? {};
  const yolda = p.ozet.YOLDA ?? {};
  const kuyrukta = (tercih.KUYRUKTA ?? 0) + (yolda.KUYRUKTA ?? 0);
  useEffect(() => { if (!kuyrukta) return; const t = setInterval(() => router.refresh(), 4000); return () => clearInterval(t); }, [kuyrukta, router]);
  const kalanAday = p.uygunTercih;
  const gonder = () => { if (!confirm(`${kalanAday} üyeye tercih SMS'i gönderilecek. Onaylıyor musunuz?`)) return; start(async () => { const r = await kampanyaSmsGonder(p.campaignId, "TERCIH"); setMesaj(r.hata ? `Hata: ${r.hata}` : `${r.kuyruklanan} SMS kuyruğa alındı, gönderiliyor…`); router.refresh(); }); };
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Üye SMS bildirimi</h2>
        <span className="text-xs text-gray-500">Sağlayıcı: {p.saglayici}{p.saglayici === "sahte" ? " (gerçek gönderim yok)" : ""}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div className="bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Cep telefonu olan</div><div className="font-semibold">{p.telefonlu}</div></div>
        <div className="bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Telefonu olmayan</div><div className="font-semibold text-amber-700">{p.telefonsuz}</div></div>
        <div className="bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Toplam SMS parçası</div><div className="font-semibold">{p.toplamParca}</div></div>
        <div className="bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Tahmini maliyet</div><div className="font-semibold">{p.birimFiyat ? `${(p.toplamParca * p.birimFiyat).toFixed(2)} ₺` : "birim fiyat girilmedi"}</div></div>
      </div>
      <div className="text-xs text-gray-600">
        <div className="font-medium mb-1">Tercih SMS'i durumu</div>
        <div className="flex gap-1 flex-wrap">{DURUM.map(([k, v, c]) => <span key={k} className={`badge ${c}`}>{v}: {tercih[k] ?? 0}</span>)}</div>
        {Object.keys(yolda).length > 0 && <><div className="font-medium mt-2 mb-1">"Kurye yolda" SMS'i</div><div className="flex gap-1 flex-wrap">{DURUM.map(([k, v, c]) => <span key={k} className={`badge ${c}`}>{v}: {yolda[k] ?? 0}</span>)}</div></>}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-600">Mesaj ön izlemesi ({p.parca} parça, {p.turkce ? "Türkçe karakterli" : "Türkçe karaktersiz"})</summary>
        <div className="mt-1 p-2 bg-gray-50 rounded font-mono whitespace-pre-wrap">{p.onizleme}</div>
      </details>
      {!p.baslikVar && p.saglayici !== "sahte" && <p className="text-xs text-red-700">Ayarlar'da SMS başlığı (gönderici adı) tanımlı değil.</p>}
      <div className="flex flex-wrap gap-2 items-center">
        <button className="btn-primary btn-sm" disabled={pending || !kalanAday} onClick={gonder}>{pending ? "Kuyruklanıyor…" : `Üyelere tercih SMS'i gönder (${kalanAday})`}</button>
        <button className="btn-secondary btn-sm" disabled={pending} onClick={() => start(async () => { const n = await smsRaporGuncelle(p.campaignId); setMesaj(`${n} rapor güncellendi`); router.refresh(); })}>Raporu güncelle</button>
        <Link className="text-sm underline" href={`/admin/dagitimlar/${p.campaignId}/sms`}>SMS listesi</Link>
        {mesaj && <span className="text-xs text-gray-700">{mesaj}</span>}
      </div>
      {Object.keys(p.tercihler).length > 0 && (
        <div className="text-xs"><span className="font-medium">Üye tercihleri:</span> {Object.entries(p.tercihler).map(([k, v]) => `${k}: ${v}`).join(" · ")}</div>
      )}
    </div>
  );
}
