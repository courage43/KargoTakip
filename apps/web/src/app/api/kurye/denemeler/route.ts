import { teslimatDenemesiSchema } from "@dagitim/shared";
import { denemeKaydet } from "@/lib/delivery";
import { json, options, kuryeGerekli } from "@/lib/api";

export const OPTIONS = options;

export async function POST(req: Request) {
  const o = await kuryeGerekli(req); if (o instanceof Response) return o;
  const p = teslimatDenemesiSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ hata: "Geçersiz veri", detay: p.error.flatten() }, 400);
  try {
    const r = await denemeKaydet(p.data, o.sub);
    return json({ ok: true, tekrar: r.tekrar, attemptId: r.attempt.id, konumSonucu: "konumSonucu" in r ? r.konumSonucu : null });
  } catch (e) {
    return json({ hata: (e as Error).message }, 400);
  }
}
