import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Dosya depolama: yerel disk (Docker volume). Arayüz S3/MinIO'ya taşınabilir şekilde dar tutuldu.
 */
const KOK = path.resolve(process.env.STORAGE_DIR ?? "./storage");

export async function dosyaKaydet(klasor: string, uzanti: string, veri: Buffer): Promise<string> {
  const gun = new Date().toISOString().slice(0, 10);
  const dizin = path.join(KOK, klasor, gun);
  await mkdir(dizin, { recursive: true });
  const ad = `${randomUUID()}.${uzanti.replace(/[^a-z0-9]/gi, "")}`;
  await writeFile(path.join(dizin, ad), veri);
  return `${klasor}/${gun}/${ad}`;
}

export async function dosyaOku(yol: string): Promise<{ veri: Buffer; boyut: number } | null> {
  const tam = path.join(KOK, yol);
  if (!tam.startsWith(KOK) || yol.includes("..")) return null;
  try {
    const s = await stat(tam);
    return { veri: await readFile(tam), boyut: s.size };
  } catch {
    return null;
  }
}

export function mimeTahmin(yol: string): string {
  const u = yol.split(".").pop()?.toLowerCase();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } as Record<string, string>)[u ?? ""] ?? "application/octet-stream";
}
