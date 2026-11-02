import { describe, it, expect, vi } from "vitest";
vi.mock("../src/lib/db", () => ({ prisma: {} }));
import { sablonDoldur, mesajUzunluk, tarihAraligi, linkUret } from "../src/lib/sms/index";

describe("SMS şablon", () => {
  it("değişkenleri doldurur ve fazla boşlukları temizler", () => {
    const m = sablonDoldur("{ODA}  zarfınız {TARIH} teslim edilecek. {LINK} ({UNVAN})", { ODA: "X Odası", TARIH: "1 - 5 Mart", LINK: "https://a/t/abc", UNVAN: "Y Ltd." });
    expect(m).toBe("X Odası zarfınız 1 - 5 Mart teslim edilecek. https://a/t/abc (Y Ltd.)");
  });
  it("bilinmeyen değişkeni olduğu gibi bırakır", () => {
    expect(sablonDoldur("{ODA} {BILINMEYEN}", { ODA: "O", TARIH: "", LINK: "", UNVAN: "" })).toBe("O {BILINMEYEN}");
  });
  it("parça sayısı: Türkçe 155, ASCII 160", () => {
    expect(mesajUzunluk("a".repeat(160))).toEqual({ karakter: 160, turkce: false, parca: 1 });
    expect(mesajUzunluk("ş" + "a".repeat(155))).toMatchObject({ turkce: true, parca: 2 });
    expect(mesajUzunluk("a".repeat(400)).parca).toBe(3);
  });
  it("tarih aralığı metni", () => {
    expect(tarihAraligi(new Date("2026-03-01"), new Date("2026-03-05"))).toMatch(/Mart/);
    expect(tarihAraligi(null, null)).toBe("önümüzdeki günlerde");
  });
  it("link üretir", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://dagitim.oda.tr/";
    expect(linkUret("abc")).toBe("https://dagitim.oda.tr/t/abc");
  });
});
