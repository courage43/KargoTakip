/**
 * Uçtan uca duman testi. Kullanım: node tools/e2e.mjs <excel-dizini>
 * Gerekli: web :3000, realtime :3001, seed yapılmış DB.
 */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright");
import pg from "pg";
import path from "node:path";
import assert from "node:assert/strict";

const D = process.argv[2];
const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://dagitim:dagitim@localhost:5432/dagitim" });
await db.connect();
const q = async (s, p = []) => (await db.query(s, p)).rows;
const log = (...a) => console.log("•", ...a);
const sure = (t0) => `${((Date.now() - t0) / 1000).toFixed(1)} sn`;

// Önceki test verisini temizle (kullanıcılar, firmalar ve ayarlar kalır)
await db.query(`TRUNCATE "DeliveryAttempt","CourierLocation","Route","SmsLog","AddressChangeRequest","Shipment","MemberAddress","Member","ImportBatch","Campaign","AuditLog" CASCADE`);
log("test verisi sıfırlandı");
const browser = await chromium.launch();
const admin = await browser.newContext();
const ap = await admin.newPage();

// --- 1. Admin giriş + genel liste yükleme ---
await ap.goto(`${WEB}/giris`);
await ap.fill("#eposta", "admin@oda.local"); await ap.fill("#sifre", "Admin123!"); await ap.click("button[type=submit], form button");
await ap.waitForURL("**/admin");
log("admin giriş ok");

async function genelListeYukle(dosya) {
  await ap.goto(`${WEB}/admin/uyeler/yukle`);
  await ap.setInputFiles("input[name=dosya]", dosya);
  await ap.click("form button:has-text('Yükle')");
  await ap.waitForURL("**/admin/yuklemeler/**");
  const batchId = ap.url().split("/").pop();
  // eşleme kontrolü
  const sicilSel = ap.locator("tr", { hasText: "UYE SICIL NO" }).locator("select");
  assert.equal(await sicilSel.inputValue(), "sicilNo");
  assert.equal(await ap.locator("tr", { hasText: "KIMLIK NO" }).locator("select").inputValue(), "YOKSAY");
  const t0 = Date.now();
  await ap.click("button:has-text('Üye listesini işle')");
  await ap.waitForSelector("text=Eklenen üye", { timeout: 180000 });
  log(`genel liste işlendi: ${sure(t0)}`);
  const b = (await q(`select * from "ImportBatch" where id=$1`, [batchId]))[0];
  return b;
}
let b1 = await genelListeYukle(path.join(D, "uyeler-5000.xlsx"));
assert.equal(b1.eklenen, 5000); assert.equal(b1.guncellenen, 0); assert.equal(b1.adresDegisen, 0);
assert.equal((await q(`select count(*)::int c from "Member"`))[0].c, 5000);
assert.equal((await q(`select count(*)::int c from "MemberAddress" where ilce='Kadıköy'`))[0].c, 500);
const kimlik = await q(`select count(*)::int c from "Member" where "rawData"::text like '%KIMLIK%'`);
assert.equal(kimlik[0].c, 0, "KIMLIK NO rawData'ya girmemeli");
log("5000 üye eklendi, hassas sütun yok, ilçe ayrıştı");

// Aynı dosya tekrar: sıfır yeni, sıfır adres değişikliği
let b1b = await genelListeYukle(path.join(D, "uyeler-5000.xlsx"));
assert.equal(b1b.eklenen, 0); assert.equal(b1b.guncellenen, 5000); assert.equal(b1b.adresDegisen, 0);
log("tekrar yükleme: 0 yeni, 0 adres değişikliği");

// --- 2. Kampanya + dağıtım listesi ---
await ap.goto(`${WEB}/admin/dagitimlar/yeni`);
await ap.fill("input[name=ad]", "Test Dağıtımı");
await ap.selectOption("select[name=courierCompanyId]", { index: 1 });
await ap.click("button:has-text('Dağıtımı oluştur')");
await ap.waitForURL(/\/admin\/dagitimlar\/(?!yeni)[^/?]+$/);
const campaignId = ap.url().split("/").pop();
await ap.setInputFiles("input[name=dosya]", path.join(D, "dagitim-300.xlsx"));
await ap.click("button:has-text('Yükle')");
await ap.waitForURL("**/admin/yuklemeler/**");
await ap.click("button:has-text('Gönderileri oluştur')");
await ap.waitForSelector("text=Oluşturulan gönderi");
const b2 = (await q(`select * from "ImportBatch" where "campaignId"=$1 order by "createdAt" desc limit 1`, [campaignId]))[0];
assert.equal(b2.eklenen, 300); assert.equal(b2.eslesmeyen, 1);
log("dağıtım listesi: 300 gönderi, 1 eşleşmeyen");
await ap.goto(`${WEB}/admin/dagitimlar/${campaignId}`);
await ap.click("button:has-text('Dağıtımı başlat')");
await ap.waitForSelector("text=Aktif");
log("kampanya aktif");

// --- 2b. SMS ayarları, test SMS, tercih SMS'i (sahte sağlayıcı) ---
await ap.goto(`${WEB}/admin/ayarlar`);
await ap.fill("input[name=SMS_BASLIK]", "TESTODA");
await ap.fill("input[name=SMS_BIRIM_FIYAT]", "0.35");
await ap.check("input[name=SMS_KURYE_YOLDA]");
await ap.click("button:has-text('SMS ayarlarını kaydet')");
await ap.waitForLoadState("networkidle");
assert.equal((await q(`select value from "Setting" where key='SMS_KURYE_YOLDA'`))[0].value, "1");
await ap.fill("input[placeholder='05xx xxx xx xx']", "0532 111 22 33");
await ap.click("button:has-text('Gönder')");
await ap.waitForSelector("text=Gönderildi (sahte");
assert.equal((await q(`select count(*)::int c from "SmsLog" where sablon='TEST'`))[0].c, 1);
log("SMS ayarları kaydedildi, test SMS gönderildi");
// bir gönderiyi 'üye istemedi' yap → SMS gitmemeli
const istemeyen = (await q(`select id from "Shipment" where "campaignId"=$1 order by id limit 1`, [campaignId]))[0].id;
await db.query(`update "Shipment" set durum='UYE_ISTEMEDI' where id=$1`, [istemeyen]);
await ap.goto(`${WEB}/admin/dagitimlar/${campaignId}`);
await ap.waitForSelector("text=Üye SMS bildirimi");
ap.once("dialog", (d) => d.accept());
await ap.click("button:has-text(\"tercih SMS'i gönder (299)\")");
await ap.waitForSelector("text=SMS kuyruğa alındı");
for (let i = 0; i < 40; i++) { const k = (await q(`select count(*)::int c from "SmsLog" where "campaignId"=$1 and durum='KUYRUKTA'`, [campaignId]))[0].c; if (!k) break; await new Promise((r) => setTimeout(r, 500)); }
const smsDurum = await q(`select durum, count(*)::int c from "SmsLog" where "campaignId"=$1 and sablon='TERCIH' group by durum`, [campaignId]);
assert.deepEqual(Object.fromEntries(smsDurum.map((x) => [x.durum, x.c])), { GONDERILDI: 299 }, "299 tercih SMS'i gönderilmeli (üye istemedi hariç)");
assert.equal((await q(`select count(*)::int c from "SmsLog" where "shipmentId"=$1`, [istemeyen]))[0].c, 0);
await ap.reload(); await ap.waitForSelector("text=Üye SMS bildirimi");
assert.ok(await ap.locator("button:has-text(\"tercih SMS'i gönder (0)\")").isDisabled(), "ikinci gönderim mümkün olmamalı");
// cron: yanlış anahtar 401, doğru anahtar raporları ILETILDI yapar
assert.equal((await fetch(`${WEB}/api/cron/sms?key=yanlis`)).status, 401);
const cron = await (await fetch(`${WEB}/api/cron/sms?key=test-cron-key`)).json();
assert.equal(cron.ok, true); assert.ok(cron.raporGuncellenen >= 200, `rapor güncellenen: ${cron.raporGuncellenen}`);
await fetch(`${WEB}/api/cron/sms?key=test-cron-key`);
assert.equal((await q(`select count(*)::int c from "SmsLog" where "campaignId"=$1 and sablon='TERCIH' and durum='ILETILDI'`, [campaignId]))[0].c, 299);
// SMS içindeki link çalışıyor
const smsMesaj = (await q(`select mesaj from "SmsLog" where "campaignId"=$1 and sablon='TERCIH' limit 1`, [campaignId]))[0].mesaj;
const link = smsMesaj.match(/https?:\/\/\S+/)[0];
assert.ok(smsMesaj.includes("TESTODA") || smsMesaj.includes("Ticaret Odası"), smsMesaj);
const lp = await admin.newPage(); await lp.goto(link); await lp.waitForSelector("text=Tercihimi kaydet"); await lp.close();
// hatalı yeniden kuyrukla
await db.query(`update "SmsLog" set durum='HATA', hata='test hatası' where id = (select id from "SmsLog" where "campaignId"=$1 limit 1)`, [campaignId]);
await ap.goto(`${WEB}/admin/dagitimlar/${campaignId}/sms`);
await ap.click("button:has-text('Hatalıları yeniden gönder (1)')");
await ap.waitForLoadState("networkidle");
for (let i = 0; i < 20; i++) { const k = (await q(`select count(*)::int c from "SmsLog" where "campaignId"=$1 and durum in ('KUYRUKTA','HATA')`, [campaignId]))[0].c; if (!k) break; await new Promise((r) => setTimeout(r, 500)); }
assert.equal((await q(`select count(*)::int c from "SmsLog" where "campaignId"=$1 and durum='HATA'`, [campaignId]))[0].c, 0);
assert.equal((await ap.request.get(`${WEB}/api/export/sms/${campaignId}`)).status(), 200);
log("tercih SMS'i: 299 gönderildi → iletildi, link açıldı, hatalı yeniden gönderildi, Excel indi");

// --- 3. Firma yöneticisi atama ---
const firma = await browser.newContext(); const fp = await firma.newPage();
await fp.goto(`${WEB}/giris`); await fp.fill("#eposta", "firma@kurye.local"); await fp.fill("#sifre", "Firma123!"); await fp.click("form button");
await fp.waitForURL("**/firma");
await fp.click(`a[href="/firma/dagitimlar/${campaignId}"]`);
await fp.waitForSelector("text=gönderi seçili");
await fp.selectOption("select.w-40 >> nth=0", "Kadıköy"); // ilçe
await fp.click("button:has-text('Filtredekileri seç')");
await fp.waitForSelector("text=/(29|30) gönderi seçili/");
const kuryeSel = fp.locator("select.w-56");
const ahmet = (await q(`select id from "User" where telefon='5550000001'`))[0].id;
await kuryeSel.selectOption(ahmet);
await fp.click("button:has-text('Kuryeye ata')");
await fp.waitForSelector("text=/(29|30) gönderi Ahmet Kurye kuryesine atandı/");
// haritasız (konum yok) olduğu için listeden; ikinci parti: Üsküdar → Mehmet
await fp.selectOption("select.w-40 >> nth=0", "Üsküdar");
await fp.click("button:has-text('Filtredekileri seç')");
const mehmet = (await q(`select id from "User" where telefon='5550000002'`))[0].id;
await kuryeSel.selectOption(mehmet);
await fp.click("button:has-text('Kuryeye ata')");
await fp.waitForSelector("text=/(29|30) gönderi Mehmet Kurye kuryesine atandı/");
const ahmetAdet = (await q(`select count(*)::int c from "Shipment" where "assignedCourierId"=$1 and durum='ATANDI'`, [ahmet]))[0].c;
assert.ok(ahmetAdet >= 29 && ahmetAdet <= 30);
log(`firma: ${ahmetAdet} Kadıköy → Ahmet, Üsküdar → Mehmet`);

// --- 4. Kurye API ---
const api = async (yol, body, token) => {
  const r = await fetch(`${WEB}${yol}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const giris = await api("/api/auth/kurye-login", { telefon: "05550000001", pin: "1234" });
assert.equal(giris.status, 200); const tok = giris.data.token;
assert.equal((await api("/api/auth/kurye-login", { telefon: "05550000001", pin: "0000" })).status, 401);
let liste = await api("/api/kurye/gonderiler", null, tok);
assert.equal(liste.data.gonderiler.length, ahmetAdet);
assert.ok(liste.data.gonderiler.every((g) => g.adres.ilce === "Kadıköy"));
log(`kurye API: giriş, ${ahmetAdet} gönderi listelendi`);
const rota = await api("/api/kurye/rota", { islem: "baslat" }, tok); assert.equal(rota.data.rotaAcik, true);
const konum = await api("/api/kurye/konum", { lat: 40.99, lng: 29.03, accuracyM: 12 }, tok); assert.equal(konum.data.ok, true);
assert.equal((await q(`select count(*)::int c from "CourierLocation"`))[0].c, 1);
for (let i = 0; i < 40; i++) { const k = (await q(`select count(*)::int c from "SmsLog" where sablon='YOLDA' and durum='KUYRUKTA'`))[0].c; if (!k) break; await new Promise((r) => setTimeout(r, 500)); }
const yoldaAdet = (await q(`select count(*)::int c from "SmsLog" s join "Shipment" g on g.id=s."shipmentId" where s.sablon='YOLDA' and g."assignedCourierId"=$1`, [ahmet]))[0].c;
assert.ok(yoldaAdet >= 29 && yoldaAdet <= 30, `yolda SMS: ${yoldaAdet}`);
log(`"kurye yolda" SMS'i kuyruklandı ve gönderildi: ${yoldaAdet}`);
assert.equal((await q(`select count(*)::int c from "Shipment" where "assignedCourierId"=$1 and durum='YOLDA'`, [ahmet]))[0].c, ahmetAdet);
log("rota başladı, konum yazıldı, gönderiler YOLDA");

const g1 = liste.data.gonderiler[0], g2 = liste.data.gonderiler[1], g3 = liste.data.gonderiler[2];
const deneme = (shipmentId, ekstra) => api("/api/kurye/denemeler", { shipmentId, istemciId: crypto.randomUUID(), sonuc: "TESLIM_EDILDI", lat: 40.9901, lng: 29.0301, accuracyM: 8, fotoUrls: ["fotolar/test/a.jpg"], imzaUrl: "imzalar/test/i.png", teslimAlanAdi: "Ali Veli", teslimAlanIliskisi: "YETKILI", konumKaydet: true, kuryeNotu: "Arka kapıdan girilir", cihazZamani: new Date().toISOString(), ...ekstra }, tok);
const d1 = await deneme(g1.id, {});
assert.equal(d1.status, 200); assert.equal(d1.data.konumSonucu, "KAYDEDILDI");
let a1 = (await q(`select * from "MemberAddress" where id=$1`, [g1.adres.id]))[0];
assert.equal(a1.konumDurumu, "DOGRULANDI"); assert.equal(a1.geoSource, "KURYE_GPS"); assert.equal(a1.verifiedCount, 1); assert.equal(a1.kuryeNotu, "Arka kapıdan girilir");
log("teslimat 1: konum kaydedildi (KURYE_GPS), saha notu yazıldı");
// idempotent tekrar
const istemciId = crypto.randomUUID();
const d2a = await deneme(g2.id, { istemciId, sonuc: "ADRESTE_BULUNAMADI", teslimAlanAdi: null, imzaUrl: null, konumKaydet: true });
const d2b = await deneme(g2.id, { istemciId, sonuc: "ADRESTE_BULUNAMADI", teslimAlanAdi: null, imzaUrl: null });
assert.equal(d2a.data.tekrar, false); assert.equal(d2b.data.tekrar, true);
assert.equal((await q(`select "denemeSayisi" from "Shipment" where id=$1`, [g2.id]))[0].denemeSayisi, 1);
log("teslimat 2: bulunamadı + çevrimdışı tekrar gönderim tekilleştirildi");
// yakın ikinci doğrulama → ağırlıklı ortalama, verifiedCount 2
const d1b = await deneme(g1.id, { lat: 40.9902, lng: 29.0302 });
assert.equal(d1b.data.konumSonucu, "KAYDEDILDI");
a1 = (await q(`select * from "MemberAddress" where id=$1`, [g1.adres.id]))[0]; assert.equal(a1.verifiedCount, 2);
// 500 m uzak → çakışma
const d1c = await deneme(g1.id, { lat: 40.9950, lng: 29.0301 });
assert.equal(d1c.data.konumSonucu, "CAKISMA");
a1 = (await q(`select * from "MemberAddress" where id=$1`, [g1.adres.id]))[0]; assert.equal(a1.konumDurumu, "CAKISMA_BEKLIYOR"); assert.ok(a1.adayLat);
log("konum kuralı: yakın tekrar → doğrulandı x2; 500 m uzak → ÇAKIŞMA");
// taşınmış → adres değişikliği talebi
const d3 = await deneme(g3.id, { sonuc: "TASINMIS", teslimAlanAdi: null, imzaUrl: null, not: "Yeni yer: Bağdat Cad. No:10 Kadıköy/İstanbul" });
assert.equal(d3.status, 200);
assert.equal((await q(`select count(*)::int c from "AddressChangeRequest" where kaynak='KURYE_TASINMIS'`))[0].c, 1);
// yetki: Mehmet, Ahmet'in gönderisine deneme yazamaz
const tokM = (await api("/api/auth/kurye-login", { telefon: "05550000002", pin: "1234" })).data.token;
const yetkisiz = await api("/api/kurye/denemeler", { shipmentId: g1.id, istemciId: crypto.randomUUID(), sonuc: "TESLIM_EDILDI", fotoUrls: [], konumKaydet: false, cihazZamani: new Date().toISOString() }, tokM);
assert.equal(yetkisiz.status, 400); assert.match(yetkisiz.data.hata, /atanmamış/);
assert.equal((await api("/api/kurye/gonderiler")).status, 401);
log("yetki: başka kuryenin gönderisi reddedildi, tokensiz 401");
await api("/api/kurye/rota", { islem: "bitir" }, tok);
assert.equal((await api("/api/kurye/konum", { lat: 1, lng: 1 }, tok)).data.rotaAcik, false);
log("rota bitti, konum artık yazılmıyor");
await api("/api/kurye/rota", { islem: "baslat" }, tok); await new Promise((r) => setTimeout(r, 1000)); await api("/api/kurye/rota", { islem: "bitir" }, tok);
const yoldaTekrar = (await q(`select count(*)::int c from "SmsLog" s join "Shipment" g on g.id=s."shipmentId" where s.sablon='YOLDA' and g."assignedCourierId"=$1`, [ahmet]))[0].c;
assert.equal(yoldaTekrar, yoldaAdet, "rota tekrar başlatılınca yolda SMS'i tekrar gitmemeli");
log("rota tekrar başlatıldı: yolda SMS'i tekrar gönderilmedi (idempotent)");

// --- 5. Üye tercih sayfası ---
const tokenG = (await q(`select token from "Shipment" where id=$1`, [g2.id]))[0].token;
const up = await admin.newPage(); await up.goto(`${WEB}/t/${tokenG}`);
await up.click("label:has-text('Komşuya')"); await up.fill("input[placeholder^='Örn: Ahmet']", "Ahmet Bey, D:4");
await up.click("button:has-text('Tercihimi kaydet')"); await up.waitForSelector("text=Tercihiniz kaydedildi");
liste = await api("/api/kurye/gonderiler", null, tok);
const g2y = liste.data.gonderiler.find((g) => g.id === g2.id);
assert.equal(g2y.tercih, "KOMSUYA_BIRAK"); assert.equal(g2y.komsuBilgisi, "Ahmet Bey, D:4");
log("üye tercihi kaydedildi ve kurye listesine yansıdı");

// --- 6. Admin: gönderi detayı, konum çakışması, canlı sayfa ---
await ap.goto(`${WEB}/admin/gonderiler/${g1.id}`);
await ap.waitForSelector("text=Konum çakışması");
await ap.goto(`${WEB}/admin/konum-cakismalari`);
await ap.waitForSelector("text=m fark");
await ap.click("button:has-text('Mevcut konumu koru')");
await ap.waitForSelector("text=Bekleyen konum çakışması yok");
a1 = (await q(`select * from "MemberAddress" where id=$1`, [g1.adres.id]))[0]; assert.equal(a1.konumDurumu, "DOGRULANDI"); assert.equal(a1.adayLat, null);
log("konum çakışması çözüldü (mevcut korundu)");
await ap.goto(`${WEB}/admin/canli`); await ap.waitForSelector("text=Canlı Harita");
const exp = await ap.request.get(`${WEB}/api/export/dagitim/${campaignId}`);
assert.equal(exp.status(), 200); assert.ok((await exp.body()).length > 5000);
log("sonuç Excel indirildi");

// --- 7. Adres değişikliği içeren 2. genel liste ---
const dogrulanmisOnce = (await q(`select count(*)::int c from "MemberAddress" where "konumDurumu"='DOGRULANDI'`))[0].c;
const b3 = await genelListeYukle(path.join(D, "uyeler-5000-v2.xlsx"));
assert.equal(b3.eklenen, 0); assert.equal(b3.guncellenen, 5000);
assert.equal(b3.adresDegisen, 100, "50 gerçek + 50 yazım farkı; 'Mahallesi' varyantı değişiklik sayılmamalı");
assert.equal(b3.hataRaporu.yaziFarki, 50);
assert.equal((await q(`select count(*)::int c from "MemberAddress" where "konumDurumu"='DOGRULANDI'`))[0].c, dogrulanmisOnce, "konum verisi ezilmemeli");
log("v2 liste: 100 adres değişikliği talebi (50 gerçek, 50 yazım farkı), konumlar korundu");
await ap.goto(`${WEB}/admin/adres-degisiklikleri?batch=${b3.id}`);
await ap.waitForSelector("text=100 bekleyen");
const aynıYer = await ap.locator("select option:checked", { hasText: "Sadece yazım farkı" }).count();
assert.equal(aynıYer, 50, "yazım farklarına 'aynı yer' önerilmeli");
await ap.click("button:has-text('Seçimleri toplu uygula')");
await ap.waitForSelector("text=Bekleyen adres değişikliği yok", { timeout: 60000 });
const kararlar = await q(`select karar, count(*)::int c from "AddressChangeRequest" where "importBatchId"=$1 group by karar`, [b3.id]);
assert.deepEqual(Object.fromEntries(kararlar.map((k) => [k.karar, k.c])), { AYNI_YER: 50, YENI_ADRES: 50 });
assert.equal((await q(`select count(*)::int c from "MemberAddress" where "gecerlilikBitis" is not null`))[0].c, 50, "50 eski adres tarihçede");
assert.equal((await q(`select count(*)::int c from "MemberAddress" where "konumDurumu"='DOGRULANACAK'`))[0].c, 50);
log("adres kararları uygulandı: 50 aynı yer, 50 yeni adres (tarihçe + DOGRULANACAK)");

await browser.close(); await db.end();
console.log("\n✅ Uçtan uca test başarılı");
