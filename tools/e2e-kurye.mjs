/**
 * Kurye PWA tarayıcı testi (mobil emülasyon). Kullanım: node tools/e2e-kurye.mjs <ekran-görüntüsü-dizini>
 * Gerekli: web :3000, kurye dev :5173, önce tools/e2e.mjs çalıştırılmış olmalı (atanmış gönderi için).
 */
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"], geolocation: { latitude: 40.99, longitude: 29.03, accuracy: 10 }, permissions: ["geolocation"] });
const p = await ctx.newPage();
const hatalar = []; p.on("pageerror", (e) => hatalar.push(e.message)); p.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });
await p.goto("http://localhost:5173/giris");
await p.fill("input[type=tel]", "05550000001"); await p.fill("input[type=password]", "1234"); await p.click("button:has-text('Giriş yap')");
await p.waitForSelector("text=Bekleyen (", { timeout: 20000 });
await p.waitForSelector(".card:has-text('Yol tarifi')", { timeout: 20000 });
await p.waitForFunction(() => !document.querySelector("header .font-bold")?.textContent?.startsWith("Kurye"));
const baslik = await p.textContent("header .font-bold");
const kartSayisi = await p.locator(".card:has-text('Yol tarifi')").count();
console.log("• PWA giriş ok, kurye:", baslik, "| kart:", kartSayisi);
const tercihChip = await p.locator("text=Üye: Komşuya bırakılabilir").count();
const sahaNotu = await p.locator("text=Saha notu: Arka kapıdan girilir").count();
const dogrulanmis = await p.locator("text=Konum doğrulanmış").count();
console.log("• kartlarda: tercih rozeti", tercihChip, "| saha notu", sahaNotu, "| doğrulanmış konum", dogrulanmis);
const yolTarifi = await p.locator("a:has-text('Yol tarifi')").first().getAttribute("href");
console.log("• ilk yol tarifi linki:", yolTarifi);
await p.screenshot({ path: process.argv[2] + "/pwa-liste.png", fullPage: false });
// Rotamı sırala
await p.click("button:has-text('Rotamı sırala')");
await p.waitForSelector("text=/adres sıralandı/", { timeout: 20000 });
console.log("• rotamı sırala:", await p.locator("text=/adres sıralandı/").textContent());
// QR okut ekranı (kamera yok → elle giriş)
await p.click("button:has-text('QR okut')");
await p.waitForSelector("text=Zarf QR kodu okut");
await p.waitForSelector("text=/Kamera (bulunamadı|açılamadı)|video/", { timeout: 15000 }).catch(() => {});
await p.fill("input[placeholder^='Zarf kodu']", "K9-9999"); await p.click("button:has-text('Bul')");
await p.waitForSelector("text=listenizde yok");
await p.goBack();
await p.waitForSelector("text=Bekleyen (");
console.log("• QR okut ekranı açıldı, bilinmeyen kod uyarısı verdi");
// Bugün bitti sekmesi
await p.click("button:has-text('Bugün bitti')");
console.log("• bugün bitti sekmesi kart:", await p.locator(".card:has-text('Yol tarifi')").count());
await p.click("button:has-text('Bekleyen')");
// Teslimat ekranı
await p.locator("a:has-text('Teslimat')").first().click();
await p.waitForSelector("text=Sonuç");
await p.waitForSelector("text=GPS: alındı", { timeout: 20000 });
console.log("• teslimat ekranı açıldı, GPS alındı");
await p.click("button:has-text('Teslim Edildi')");
await p.waitForSelector("text=Teslim alan");
await p.screenshot({ path: process.argv[2] + "/pwa-teslimat.png", fullPage: true });
// Foto olmadan kaydet → hata
await p.click("button:has-text('Kaydet ve gönder')");
await p.waitForSelector("text=En az bir fotoğraf");
console.log("• doğrulama: fotoğraf zorunlu uyarısı çıktı");
// Foto yükle (küçük png), teslim alan, imza çiz, kaydet
await p.setInputFiles("input[type=file]", { name: "kapi.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") });
await p.waitForSelector("img[alt='']");
await p.fill("input[placeholder='Ad Soyad']", "Zeynep Kaya");
const cv = p.locator("canvas"); const bb = await cv.boundingBox();
await cv.scrollIntoViewIfNeeded();
const bb2 = await cv.boundingBox();
await p.mouse.move(bb2.x + 20, bb2.y + 40); await p.mouse.down(); await p.mouse.move(bb2.x + 120, bb2.y + 80, { steps: 8 }); await p.mouse.move(bb2.x + 200, bb2.y + 30, { steps: 8 }); await p.mouse.up();
const dolu = await cv.evaluate((c) => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
console.log("• imza canvas boyalı piksel:", dolu);
await p.click("button:has-text('Kaydet ve gönder')");
await p.waitForTimeout(1500);
const hataMetni = await p.locator("p.text-red-600").allTextContents();
if (hataMetni.length) { console.log("!! doğrulama hatası:", hataMetni); await p.screenshot({ path: process.argv[2] + "/pwa-hata.png", fullPage: true }); }
await p.waitForSelector("text=Bekleyen (", { timeout: 20000 });
await p.waitForTimeout(2500);
console.log("• teslimat kaydedildi, listeye dönüldü; bekleyen kuyruk rozeti:", await p.locator("text=gönderilmeyi bekliyor").count());
// Çevrimdışı teslimat
await ctx.setOffline(true);
await p.locator("a:has-text('Teslimat')").first().click();
await p.waitForSelector("text=Sonuç");
await p.click("button:has-text('Adreste Bulunamadı')");
await p.setInputFiles("input[type=file]", { name: "kapi2.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") });
await p.waitForSelector("img[alt='']");
await p.click("button:has-text('Kaydet (çevrimdışı')");
await p.waitForSelector("text=1 kayıt gönderilmeyi bekliyor", { timeout: 15000 });
console.log("• çevrimdışı teslimat kuyruğa alındı (1 bekliyor)");
await ctx.setOffline(false);
await p.waitForSelector("text=gönderilmeyi bekliyor", { state: "detached", timeout: 40000 });
console.log("• çevrimiçi olunca kuyruk boşaldı");
console.log("• sayfa hataları:", hatalar.length ? hatalar : "yok");
await browser.close();
