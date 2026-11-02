import { prisma } from "@/lib/db";
import { json, options, kuryeGerekli } from "@/lib/api";

export const OPTIONS = options;

/** Push token kaydı: { token, platform } */
export async function POST(req: Request) {
  const o = await kuryeGerekli(req); if (o instanceof Response) return o;
  const b = await req.json().catch(() => ({}));
  const token = String(b.token ?? "").trim(); const platform = String(b.platform ?? "android");
  if (token.length < 10) return json({ hata: "token gerekli" }, 400);
  await prisma.deviceToken.upsert({ where: { token }, update: { userId: o.sub, platform, sonGorulme: new Date() }, create: { userId: o.sub, token, platform } });
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const o = await kuryeGerekli(req); if (o instanceof Response) return o;
  const b = await req.json().catch(() => ({}));
  if (b.token) await prisma.deviceToken.deleteMany({ where: { token: String(b.token), userId: o.sub } });
  return json({ ok: true });
}
