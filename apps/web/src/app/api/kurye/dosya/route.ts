import { dosyaKaydet } from "@/lib/storage";
import { json, options, kuryeGerekli } from "@/lib/api";

export const OPTIONS = options;

/** multipart: dosya (jpeg/png/webp), tur=foto|imza → { yol } */
export async function POST(req: Request) {
  const o = await kuryeGerekli(req); if (o instanceof Response) return o;
  const form = await req.formData().catch(() => null);
  const f = form?.get("dosya") as File | null;
  const tur = String(form?.get("tur") ?? "foto") === "imza" ? "imzalar" : "fotolar";
  if (!f || !f.size) return json({ hata: "Dosya yok" }, 400);
  if (f.size > 5 * 1024 * 1024) return json({ hata: "Dosya 5 MB'den büyük" }, 400);
  const uzanti = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
  const yol = await dosyaKaydet(tur, uzanti, Buffer.from(await f.arrayBuffer()));
  return json({ yol });
}
