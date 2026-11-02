/** Çevrimdışı depo: gönderi listesi önbelleği ve bekleyen teslimat kuyruğu */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Gonderi } from "./api";

export interface BekleyenDeneme {
  istemciId: string;
  shipmentId: string;
  payload: Record<string, unknown>;
  fotolar: { blob: Blob; tur: "foto" | "imza" }[];
  olusturma: string;
  hata?: string;
}

interface Sema extends DBSchema {
  gonderiler: { key: string; value: Gonderi };
  meta: { key: string; value: unknown };
  kuyruk: { key: string; value: BekleyenDeneme };
}

let dbP: Promise<IDBPDatabase<Sema>> | null = null;
function db() {
  dbP ??= openDB<Sema>("kurye", 1, {
    upgrade(d) { d.createObjectStore("gonderiler", { keyPath: "id" }); d.createObjectStore("meta"); d.createObjectStore("kuyruk", { keyPath: "istemciId" }); },
  });
  return dbP;
}

export async function gonderileriKaydet(liste: Gonderi[]) {
  const d = await db();
  const tx = d.transaction(["gonderiler", "meta"], "readwrite");
  await tx.objectStore("gonderiler").clear();
  for (const g of liste) await tx.objectStore("gonderiler").put(g);
  await tx.objectStore("meta").put(new Date().toISOString(), "sonSenkron");
  await tx.done;
}
export async function gonderileriOku(): Promise<{ liste: Gonderi[]; sonSenkron: string | null }> {
  const d = await db();
  return { liste: await d.getAll("gonderiler"), sonSenkron: ((await d.get("meta", "sonSenkron")) as string | undefined) ?? null };
}
export async function gonderiGuncelle(id: string, degisiklik: Partial<Gonderi>) {
  const d = await db();
  const g = await d.get("gonderiler", id);
  if (g) await d.put("gonderiler", { ...g, ...degisiklik });
}
export async function kuyrugaEkle(b: BekleyenDeneme) { (await db()).put("kuyruk", b); }
export async function kuyruguOku(): Promise<BekleyenDeneme[]> { return (await db()).getAll("kuyruk"); }
export async function kuyruktanSil(istemciId: string) { (await db()).delete("kuyruk", istemciId); }
export async function kuyrukHata(istemciId: string, hata: string) { const d = await db(); const b = await d.get("kuyruk", istemciId); if (b) await d.put("kuyruk", { ...b, hata }); }
