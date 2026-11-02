import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, type Rol } from "./db";

const COOKIE = "dagitim_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "gelistirme-gizli-anahtar-degistir-32+");

export interface Oturum {
  sub: string;
  rol: Rol;
  ad: string;
  companyId: string | null;
}

export async function tokenUret(o: Oturum, sure = "7d"): Promise<string> {
  return new SignJWT({ rol: o.rol, ad: o.ad, companyId: o.companyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(o.sub)
    .setIssuedAt()
    .setExpirationTime(sure)
    .sign(secret());
}

export async function tokenDogrula(token: string): Promise<Oturum | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: payload.sub!,
      rol: payload.rol as Rol,
      ad: String(payload.ad ?? ""),
      companyId: (payload.companyId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/** Panel (cookie) oturumu */
export async function oturumAl(): Promise<Oturum | null> {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (!t) return null;
  return tokenDogrula(t);
}

export async function oturumGerekli(roller?: Rol[]): Promise<Oturum> {
  const o = await oturumAl();
  if (!o) redirect("/giris");
  if (roller && !roller.includes(o.rol)) redirect(o.rol === "KURYE_FIRMA_YONETICI" ? "/firma" : "/admin");
  return o;
}

export async function oturumCerezYaz(o: Oturum) {
  const c = await cookies();
  c.set(COOKIE, await tokenUret(o), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
}

export async function oturumCerezSil() {
  const c = await cookies();
  c.delete(COOKIE);
}

/** API (Bearer) oturumu — kurye uygulaması */
export async function bearerOturum(req?: Request): Promise<Oturum | null> {
  let auth: string | null | undefined;
  if (req) auth = req.headers.get("authorization");
  else auth = (await headers()).get("authorization");
  if (auth?.startsWith("Bearer ")) return tokenDogrula(auth.slice(7));
  // cookie ile de kabul et (panel içi çağrılar)
  return oturumAl();
}

export async function epostaIleGiris(eposta: string, sifre: string): Promise<Oturum | null> {
  const u = await prisma.user.findUnique({ where: { eposta: eposta.trim().toLowerCase() } });
  if (!u || !u.sifreHash || !u.aktif) return null;
  if (!(await bcrypt.compare(sifre, u.sifreHash))) return null;
  await prisma.user.update({ where: { id: u.id }, data: { sonGiris: new Date() } });
  return { sub: u.id, rol: u.rol, ad: u.adSoyad, companyId: u.courierCompanyId };
}

export async function kuryeGiris(telefon: string, pin: string): Promise<Oturum | null> {
  const t = telefon.replace(/\D/g, "").replace(/^(90|0)/, "");
  const u = await prisma.user.findUnique({ where: { telefon: t } });
  if (!u || u.rol !== "KURYE" || !u.pinHash || !u.aktif) return null;
  if (!(await bcrypt.compare(pin, u.pinHash))) return null;
  await prisma.user.update({ where: { id: u.id }, data: { sonGiris: new Date() } });
  return { sub: u.id, rol: u.rol, ad: u.adSoyad, companyId: u.courierCompanyId };
}

export const sifreHashle = (s: string) => bcrypt.hash(s, 10);
