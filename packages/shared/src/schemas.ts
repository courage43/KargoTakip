import { z } from "zod";
import { KURYE_SONUCLARI } from "./labels";

export const teslimatDenemesiSchema = z.object({
  shipmentId: z.string().min(1),
  istemciId: z.string().min(8),
  sonuc: z.enum(KURYE_SONUCLARI),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  accuracyM: z.number().optional().nullable(),
  fotoUrls: z.array(z.string()).default([]),
  imzaUrl: z.string().optional().nullable(),
  teslimAlanAdi: z.string().max(200).optional().nullable(),
  teslimAlanIliskisi: z.enum(["YETKILI", "CALISAN", "KOMSU", "DIGER"]).optional().nullable(),
  not: z.string().max(1000).optional().nullable(),
  konumKaydet: z.boolean().default(false),
  kuryeNotu: z.string().max(500).optional().nullable(),
  offlineOlusturuldu: z.boolean().default(false),
  cihazZamani: z.string().datetime(),
});
export type TeslimatDenemesiInput = z.infer<typeof teslimatDenemesiSchema>;

export const kuryeKonumSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracyM: z.number().optional().nullable(),
  hiz: z.number().optional().nullable(),
  zaman: z.string().datetime().optional(),
});

export const uyeTercihSchema = z.object({
  uyeTercihi: z.enum(["ISYERINDEYIM", "EVDEYIM", "KOMSUYA_BIRAK", "BASKA_ADRESE", "ZARF_ISTEMIYORUM"]),
  uyeNotu: z.string().max(500).optional(),
  komsuBilgisi: z.string().max(300).optional(),
  alternatifAdres: z.string().max(500).optional(),
  uygunSaat: z.string().max(100).optional(),
});

export const kuryeGirisSchema = z.object({
  telefon: z.string().min(10),
  pin: z.string().min(4).max(8),
});

export const atamaSchema = z.object({
  shipmentIds: z.array(z.string()).min(1),
  courierId: z.string().nullable(),
});
