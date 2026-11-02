import { prisma, type Prisma } from "./db";

export interface GonderiSp { q?: string; durum?: string; ilce?: string; kurye?: string; konum?: string; sayfa?: string; tercih?: string }

export function gonderiWhere(campaignId: string, sp: GonderiSp, ekstra: Prisma.ShipmentWhereInput = {}): Prisma.ShipmentWhereInput {
  const where: Prisma.ShipmentWhereInput = { campaignId, ...ekstra };
  if (sp.q) where.OR = [{ member: { unvan: { contains: sp.q, mode: "insensitive" } } }, { member: { sicilNo: { contains: sp.q } } }, { memberAddress: { adresMetni: { contains: sp.q, mode: "insensitive" } } }];
  if (sp.durum) where.durum = sp.durum as never;
  if (sp.ilce) where.memberAddress = { ...(where.memberAddress as object), ilce: sp.ilce };
  if (sp.kurye === "YOK") where.assignedCourierId = null;
  else if (sp.kurye) where.assignedCourierId = sp.kurye;
  if (sp.konum === "DOGRULANDI") where.memberAddress = { ...(where.memberAddress as object), konumDurumu: "DOGRULANDI" };
  else if (sp.konum === "DIGER") where.memberAddress = { ...(where.memberAddress as object), konumDurumu: { not: "DOGRULANDI" } };
  if (sp.tercih) where.uyeTercihi = sp.tercih as never;
  return where;
}

export async function kampanyaIlceleri(campaignId: string): Promise<string[]> {
  const r = await prisma.$queryRaw<{ ilce: string }[]>`SELECT DISTINCT a."ilce" FROM "Shipment" s JOIN "MemberAddress" a ON a.id = s."memberAddressId" WHERE s."campaignId" = ${campaignId} AND a."ilce" IS NOT NULL ORDER BY 1`;
  return r.map((x) => x.ilce);
}

export const gonderiInclude = { member: true, memberAddress: true, assignedCourier: true } satisfies Prisma.ShipmentInclude;
