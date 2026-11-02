import { prisma } from "./db";

export type BildirimKanali = "shipment" | "courier_location" | "campaign" | "route";

/** Postgres NOTIFY üzerinden realtime servisine olay yayınla */
export async function yayinla(kanal: BildirimKanali, payload: Record<string, unknown>) {
  try {
    const p = JSON.stringify({ kanal, ...payload, at: Date.now() });
    await prisma.$executeRawUnsafe(`SELECT pg_notify('dagitim_events', $1)`, p);
  } catch (e) {
    console.error("pg_notify hatası", e);
  }
}
