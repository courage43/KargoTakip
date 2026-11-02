import { describe, it, expect } from "vitest";
import { netgsmYanitAyristir, netgsmRaporAyristir, NETGSM_KODLAR } from "../src/lib/sms/netgsm";

describe("Netgsm yanıt ayrıştırma", () => {
  it("00 + jobid → gönderildi", () => {
    const r = netgsmYanitAyristir("00 1234567890");
    expect(r.durum).toBe("GONDERILDI"); expect(r.saglayiciMesajId).toBe("1234567890");
  });
  it("30 → kullanıcı hatası", () => {
    const r = netgsmYanitAyristir("30");
    expect(r.durum).toBe("HATA"); expect(r.hata).toContain(NETGSM_KODLAR["30"]);
  });
  it("40 → başlık hatası, bilinmeyen kod → bilinmeyen", () => {
    expect(netgsmYanitAyristir("40").hata).toMatch(/başlığı/);
    expect(netgsmYanitAyristir("99").hata).toMatch(/Bilinmeyen/);
  });
  it("rapor satırlarını durumlara çevirir", () => {
    const r = netgsmRaporAyristir("111 1 ...\n222 0 ...\n333 3 ...");
    expect(r).toEqual({ "111": "ILETILDI", "222": "BEKLIYOR", "333": "HATA" });
  });
});
