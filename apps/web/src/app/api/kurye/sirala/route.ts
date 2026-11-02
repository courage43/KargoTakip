import { prisma } from "@/lib/db";
import { json, options, kuryeGerekli } from "@/lib/api";
import { kuryeListesiniSirala } from "@/lib/siralama";

export const OPTIONS = options;

/** Kuryenin açık gönderilerini mevcut konumdan başlayarak sırala: { lat?, lng? } */
export async function POST(req: Request) {
  const o = await kuryeGerekli(req); if (o instanceof Response) return o;
  const b = await req.json().catch(() => ({}));
  const baslangic = typeof b.lat === "number" && typeof b.lng === "number" ? { lat: b.lat, lng: b.lng } : null;
  const r = await kuryeListesiniSirala(o.sub, baslangic);
  return json({ ok: true, ...r });
}
