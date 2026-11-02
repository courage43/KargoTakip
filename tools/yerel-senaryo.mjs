/**
 * BILGISAYARDA-DENE.md senaryosunu Docker yerel kurulumu üzerinde uçtan uca çalıştırır.
 * Kullanım: node tools/yerel-senaryo.mjs   (docker-compose.yerel.yml ayakta olmalı)
 */
import { createRequire } from "node:module";
import path from "node:path";
import assert from "node:assert/strict";
const req = createRequire(import.meta.url);
const { chromium, devices } = req(process.env.PLAYWRIGHT_PATH ?? "playwright");
const W = "http://localhost:3000", K = "http://localhost:5173";
const ORN = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../ornekler");
const EK = process.env.EKRAN_DIR;
const log = (...a) => console.log("•", ...a);
const b = await chromium.launch();

// 1-2: admin, üye listesi, konum tahmini
const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await a.goto(`${W}/giris`); await a.fill("#eposta", "admin@oda.local"); await a.fill("#sifre", "Admin123!"); await a.click("form button"); await a.waitForURL("**/admin");
log("admin girişi");
await a.goto(`${W}/admin/uyeler/yukle`); await a.setInputFiles("input[name=dosya]", path.join(ORN, "ornek-uye-listesi.xlsx")); await a.click("form button:has-text('Yükle')");
await a.waitForURL("**/admin/yuklemeler/**"); await a.click("button:has-text('Üye listesini işle')"); await a.waitForSelector("text=Eklenen üye");
assert.equal(await a.locator(".card:has-text('Eklenen üye') .text-xl").textContent(), "200");
log("200 üye yüklendi");
await a.goto(`${W}/admin/uyeler`); await a.click("button:has-text('adresi tahmin et')");
await a.waitForFunction(() => /0 konumsuz/.test(document.body.innerText), null, { timeout: 60000 });
log("konum tahmini tamamlandı");
// 3-5: dağıtım
await a.goto(`${W}/admin/dagitimlar/yeni`); await a.fill("input[name=ad]", "Deneme Dağıtımı"); await a.selectOption("select[name=courierCompanyId]", { index: 1 }); await a.click("button:has-text('Dağıtımı oluştur')");
await a.waitForURL(/\/admin\/dagitimlar\/(?!yeni)[^/?]+$/); const kid = a.url().split("/").pop();
await a.setInputFiles("input[name=dosya]", path.join(ORN, "ornek-dagitim-listesi.xlsx")); await a.click("button:has-text('Yükle')");
await a.waitForURL("**/admin/yuklemeler/**"); await a.click("button:has-text('Gönderileri oluştur')"); await a.waitForSelector("text=Oluşturulan gönderi");
assert.equal(await a.locator(".card:has-text('Oluşturulan gönderi') .text-xl").textContent(), "120");
assert.equal(await a.locator(".card:has-text('Eşleşmeyen sicil') .text-xl").textContent(), "1");
log("dağıtım listesi: 120 gönderi, 1 eşleşmeyen");
await a.goto(`${W}/admin/dagitimlar/${kid}`); await a.click("button:has-text('Dağıtımı başlat')"); await a.waitForSelector("text=Üye SMS bildirimi");
a.once("dialog", (d) => d.accept()); await a.click("button:has-text(\"tercih SMS'i gönder\")"); await a.waitForSelector("text=SMS kuyruğa alındı");
const pdf = await a.request.get(`${W}/api/export/etiket/${kid}`); assert.equal(pdf.status(), 200); assert.equal((await pdf.body()).subarray(0, 4).toString(), "%PDF");
log("dağıtım başladı, SMS (sahte) kuyruklandı, etiket PDF açıldı");
// 6-7: firma ataması
const f = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await f.goto(`${W}/giris`); await f.fill("#eposta", "firma@kurye.local"); await f.fill("#sifre", "Firma123!"); await f.click("form button"); await f.waitForURL("**/firma");
await f.goto(`${W}/firma/dagitimlar/${kid}`); await f.waitForSelector("text=gönderi seçili");
await f.selectOption("select.w-40 >> nth=0", "Kadıköy"); await f.click("button:has-text('Filtredekileri seç')");
await f.locator("select.w-56").selectOption({ label: "Ahmet Kurye" }); await f.click("button:has-text('Kuryeye ata')");
await f.waitForSelector("text=/\\d+ gönderi Ahmet Kurye kuryesine atandı/");
const atanan = Number((await f.locator("text=/\\d+ gönderi Ahmet Kurye kuryesine atandı/").textContent()).match(/\d+/)[0]);
await f.click("button:has-text('Kuryenin listesini sırala')"); await f.waitForSelector("text=/sıralandı, tahmini yol/");
log(`firma: ${atanan} Kadıköy gönderisi Ahmet'e atandı ve sıralandı`);
if (EK) await f.screenshot({ path: `${EK}/docker-firma.png` });
// 8-10: kurye uygulaması (5173, ayrı köken)
const kc = await b.newContext({ ...devices["Pixel 7"], geolocation: { latitude: 40.99, longitude: 29.03, accuracy: 8 }, permissions: ["geolocation"] }); const k = await kc.newPage();
const hatalar = []; k.on("pageerror", (e) => hatalar.push(e.message));
await k.goto(`${K}/giris`); await k.fill("input[type=tel]", "05550000001"); await k.fill("input[type=password]", "1234"); await k.click("button:has-text('Giriş yap')");
await k.waitForSelector(".card:has-text('Yol tarifi')", { timeout: 20000 });
assert.equal(await k.locator(".card:has-text('Yol tarifi')").count(), atanan);
log(`kurye uygulaması: ${atanan} gönderi listelendi (ayrı köken, CORS çalışıyor)`);
await k.click("button:has-text('Rotaya başla')"); await k.waitForSelector("text=Rotayı bitir");
await k.locator("a:has-text('Teslimat')").first().click(); await k.waitForSelector("text=GPS: alındı", { timeout: 20000 });
await k.click("button:has-text('Teslim Edildi')");
await k.setInputFiles("input[type=file]", { name: "kapi.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") });
await k.fill("input[placeholder='Ad Soyad']", "Deneme Kişi");
const cv = k.locator("canvas"); await cv.scrollIntoViewIfNeeded(); const bb = await cv.boundingBox();
await k.mouse.move(bb.x + 20, bb.y + 40); await k.mouse.down(); await k.mouse.move(bb.x + 150, bb.y + 70, { steps: 8 }); await k.mouse.up();
await k.click("button:has-text('Kaydet ve gönder')"); await k.waitForSelector("text=Bekleyen (");
await k.waitForFunction(() => !/gönderilmeyi bekliyor/.test(document.body.innerText), null, { timeout: 20000 });
log("kurye: rota başladı, fotoğraf + imza + GPS ile teslimat gönderildi");
// admin tarafında görünüyor mu
let teslimSayisi = 0;
for (let i = 0; i < 15 && teslimSayisi < 1; i++) {
  await a.goto(`${W}/admin/dagitimlar/${kid}`); await a.waitForSelector("text=Kurye performansı");
  const teslimKutu = a.locator("div.card.p-3").filter({ has: a.locator("div.text-xs", { hasText: /^Teslim$/ }) });
  teslimSayisi = Number(await teslimKutu.locator(".text-xl").textContent());
  if (teslimSayisi < 1) await a.waitForTimeout(1000);
}
assert.ok(teslimSayisi >= 1, "dağıtım sayfasında teslim sayısı ≥ 1");
const fotolu = await a.request.get(`${W}/admin/dagitimlar/${kid}?durum=TESLIM_EDILDI`); assert.equal(fotolu.status(), 200);
await a.goto(`${W}/admin/dagitimlar/${kid}?durum=TESLIM_EDILDI`); await a.locator("a[href^='/admin/gonderiler/']").first().click(); await a.waitForSelector("text=Zaman çizelgesi");
await a.waitForSelector("img[alt='Teslimat fotoğrafı']"); await a.waitForSelector("img[alt='İmza']"); await a.waitForSelector("text=Konum üye adresine kaydedildi");
log("admin: teslimat zaman çizelgesinde fotoğraf, imza ve kaydedilen konum görünüyor");
if (EK) await a.screenshot({ path: `${EK}/docker-gonderi.png`, fullPage: true });
// 11: üye tercih sayfası
const gonderiUrl = a.url();
const tokenMetni = await a.locator("code").first().textContent();
const u = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
await u.goto(`${W}${tokenMetni.replace(/^\/t\//, "/t/")}`); await u.waitForSelector("text=/teslim edilmiştir|Tercihimi kaydet/");
log("üye tercih sayfası açıldı");
// 12: adres değişikliği
await a.goto(`${W}/admin/uyeler/yukle`); await a.setInputFiles("input[name=dosya]", path.join(ORN, "ornek-uye-listesi-adres-degisikligi.xlsx")); await a.click("form button:has-text('Yükle')");
await a.waitForURL("**/admin/yuklemeler/**"); await a.click("button:has-text('Üye listesini işle')"); await a.waitForSelector("text=Adres değişen");
const degisen = await a.locator(".card:has-text('Adres değişen') .text-xl").textContent();
assert.ok(Number(degisen) >= 2);
await a.click("text=Adres değişikliklerini incele"); await a.click("button:has-text('Seçimleri toplu uygula')"); await a.waitForSelector("text=Bekleyen adres değişikliği yok");
log(`adres değişikliği: ${degisen} talep geldi, toplu uygulandı`);
assert.deepEqual(hatalar, []);
await b.close();
console.log(`\n✅ Docker yerel kurulumda rehber senaryosu başarılı (${gonderiUrl.split("/").pop()})`);
