import { kuryeGiris, tokenUret } from "@/lib/auth";
import { kuryeGirisSchema } from "@dagitim/shared";
import { json, options } from "@/lib/api";

export const OPTIONS = options;

export async function POST(req: Request) {
  const body = kuryeGirisSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ hata: "Telefon ve PIN gerekli" }, 400);
  const o = await kuryeGiris(body.data.telefon, body.data.pin);
  if (!o) return json({ hata: "Telefon veya PIN hatalı" }, 401);
  return json({ token: await tokenUret(o, "30d"), kurye: { id: o.sub, ad: o.ad } });
}
