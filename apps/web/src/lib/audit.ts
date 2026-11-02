import { prisma } from "./db";

export async function denetimKaydi(userId: string | null, islem: string, varlik: string, varlikId?: string | null, detay?: unknown) {
  try {
    await prisma.auditLog.create({ data: { userId, islem, varlik, varlikId: varlikId ?? null, detay: detay as never } });
  } catch (e) {
    console.error("audit hatası", e);
  }
}
