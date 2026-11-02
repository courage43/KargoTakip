import { describe, it, expect } from "vitest";
import { sahtePush } from "../src/lib/push/sahte";
import { barkodUret } from "../src/lib/etiket";

describe("push sahte sağlayıcı", () => {
  it("geçersiz token'ları ayırır", async () => {
    const r = await sahtePush.gonder(["abc123456789", "gecersiz-1", "xyz987654321"], { baslik: "t", govde: "g" });
    expect(r.gonderilen).toBe(2); expect(r.gecersizTokenlar).toEqual(["gecersiz-1"]);
  });
});
describe("barkod", () => {
  it("K{no}-{4 hane}", () => { expect(barkodUret(3, 7)).toBe("K3-0007"); expect(barkodUret(12, 4321)).toBe("K12-4321"); });
});
