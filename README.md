# Üye Zarf Dağıtım ve Teslimat Sistemi

Oda üyelerine kurye ile gönderilen zarfların dağıtımını ve teslimatını takip eden sistem: Excel'den üye ve dağıtım listesi yükleme, kurye firmasına atama, kuryeler için mobil uygulama (GPS + fotoğraf + imza), üye tercih sayfası, canlı harita ve **her teslimatta doğrulanan konum** sayesinde bir sonraki dağıtımda nokta atışı yönlendirme.

## Bileşenler

| Dizin | Ne | Teknoloji |
|---|---|---|
| `apps/web` | Yönetim paneli (Oda), kurye firması paneli, kurye API'si, üye tercih sayfası `/t/{token}` | Next.js 15, Prisma, Tailwind, Leaflet |
| `apps/kurye` | Kurye mobil uygulaması (PWA, telefona kurulur, çevrimdışı çalışır) | Vite + React, IndexedDB, Signature Pad |
| `apps/realtime` | Canlı güncelleme servisi (Postgres NOTIFY → Socket.IO) | Node, socket.io |
| `packages/db` | Veri modeli ve migration'lar | Prisma + PostgreSQL 16 |
| `packages/excel` | Excel okuma, Türkçe başlık eşleme, adres normalize ve benzerlik | SheetJS |
| `packages/shared` | Durum etiketleri, Zod şemaları, mesafe/navigasyon yardımcıları | |
| `tools/` | Uçtan uca test, sentetik Excel üretici, ilk kurulum betiği | Playwright |

## Roller

- **Oda yöneticisi** (`/admin`): üye listesi ve dağıtım listesi yükler, adres değişikliklerini ve konum çakışmalarını onaylar, raporları alır.
- **Kurye firması yöneticisi** (`/firma`): gönderileri ilçe/harita ile filtreleyip kuryelere atar, kuryeleri (telefon + PIN) yönetir.
- **Kurye** (mobil uygulama): kendine atanan listeyi görür, yol tarifi alır, teslimat sonucunu GPS + fotoğraf + imza ile kaydeder, "konumu kaydet" ile üyenin kalıcı konumunu oluşturur.
- **Üye** (SMS linki, girişsiz): "iş yerindeyim / komşuya bırak / başka adres / istemiyorum" tercihini bildirir.

## Kurulum (tek VPS, Docker Compose)

Gereksinim: Ubuntu 22.04+ sunucu, Docker + Compose eklentisi, 3 alan adı (DNS A kayıtları sunucuya işaret etmeli).

```bash
git clone <repo> dagitim && cd dagitim
cp .env.example .env
nano .env            # alan adları, POSTGRES_PASSWORD, AUTH_SECRET (openssl rand -base64 48)
docker compose up -d --build
SEED_ADMIN_EMAIL=admin@oda.org.tr SEED_ADMIN_PASSWORD='GucluSifre!1' ./tools/ilk-kurulum.sh
```

- Panel: `https://APP_DOMAIN` — admin e-posta/şifre ile girer, Ayarlar'dan kurye firması ve firma yöneticisi ekler.
- Kurye uygulaması: `https://KURYE_DOMAIN` — kurye telefonunda açılır, "Ana ekrana ekle" ile kurulur.
- Caddy TLS sertifikalarını otomatik alır. `backups/` klasörüne günlük veritabanı + dosya yedeği düşer (14 gün saklanır).

Güncelleme: `git pull && docker compose up -d --build` (migration'lar web konteyneri açılırken otomatik uygulanır).

## Geliştirme ortamı

```bash
pnpm install
cp packages/db/.env.example packages/db/.env          # DATABASE_URL
cp apps/web/.env.example apps/web/.env.local
cp apps/realtime/.env.example apps/realtime/.env
cp apps/kurye/.env.example apps/kurye/.env
pnpm db:migrate && pnpm db:seed                         # admin@oda.local / Admin123!, firma@kurye.local / Firma123!, kurye 5550000001 / 1234
pnpm dev                                                # web :3000, kurye :5173, realtime :3001
```

Testler:

```bash
pnpm --filter @dagitim/excel test                       # birim testleri (başlık eşleme, adres normalize)
node tools/sentetik-excel.mjs 5000 /tmp/uyeler.xlsx     # 48 sütunlu sentetik üye listesi
node tools/sentetik-excel.mjs 5000 /tmp/uyeler-v2.xlsx degistir   # %1 adres değişikliği, %1 yazım farkı
node tools/sentetik-dagitim.mjs 300 /tmp/dagitim.xlsx
node tools/e2e.mjs /tmp                                 # uçtan uca akış (web + realtime çalışıyor olmalı)
```

## Temel akışlar

**Genel üye listesi** → `/admin/uyeler/yukle`: sütunlar otomatik eşlenir (hassas sütunlar varsayılan yoksayılır), sicil numarasına göre upsert; listede olmayanlar pasife alınır, silinmez. Konum verisi ve saha notu asla ezilmez. Adresi değişenler **Adres Değişiklikleri** ekranına düşer: *yeni adres (konum sıfırlanır)* / *yazım farkı, aynı yer (konum korunur)* / *reddet*. Benzerlik ≥ %90 ise "aynı yer" önerilir.

**Dağıtım** → `/admin/dagitimlar/yeni` + Excel (en az `UYE SICIL NO`) → gönderiler oluşur → "Dağıtımı başlat" → kurye firması görür ve atar → kurye uygulamasına anında düşer.

**Teslimat** → kurye sonucu seçer (Teslim edildi / İş yerine bırakıldı / Komşuya bırakıldı / Adreste bulunamadı / Adres hatalı / Taşınmış), fotoğraf zorunlu, teslimde ad + imza zorunlu, GPS otomatik. "Konumu kaydet" işaretliyse adres `DOGRULANDI` olur; doğrulanmış konumdan 150 m'den uzak yeni GPS otomatik ezilmez, **Konum Çakışmaları** ekranına düşer.

**SMS** → Dağıtım aktif olunca SMS kartında "Üyelere tercih SMS'i gönder". Cep telefonu olmayan üyeler atlanır, her gönderiye bir kez gider. Mesajdaki link üyeyi `/t/{token}` tercih sayfasına götürür. Ayarlar'da "kurye yolda" açıksa kurye "Rotaya başla" dediğinde o günkü üyelere ikinci SMS gider.

**Konum tahmini** → Üyeler sayfasında "Konumu olmayan N adresi tahmin et". Önbellek sayesinde aynı adres bir daha sorgulanmaz. Bulunamayanlar 3 denemeden sonra durur, "yeniden dene" ile sıfırlanır.

**Rotalar ve uyarılar** → `/admin/rotalar` liste, satıra tıklayınca iz + oynatıcı. `/admin/uyarilar` saha anomalileri; her satırda ilgili gönderi/rota linki ve "İncelendi".

**Canlı takip** → kurye "Rotaya başla" dediği sürece 30 sn'de bir konum gönderir; `/admin/canli` ve dağıtım sayfasındaki harita canlı güncellenir. Rota kapalıyken konum alınmaz.

## Fazlar

- **Faz 1 (bu sürüm):** yukarıdakilerin hepsi + çevrimdışı kurye kuyruğu + Excel dışa aktarım + denetim kaydı.
- **Faz 2a (bu sürüm):** SMS bildirimi. Dağıtım sayfasındaki SMS kartından üyelere tercih linki gönderilir; isteğe bağlı "kurye yolda" SMS'i; SMS listesi, teslim raporu, Excel. Sağlayıcı `SMS_SAGLAYICI=netgsm` + `NETGSM_USERCODE/PASSWORD` ile Netgsm, varsayılan `sahte` (gerçek gönderim yapmaz, test için). Başlık ve şablonlar Ayarlar > SMS'te. `cron` servisi dakikada bir kuyruğu işler.
- **Faz 2b (bu sürüm):** **Konum tahmini**: Üyeler sayfasındaki düğme veya `cron` ile konumu olmayan adresler geocode edilir (`GEOCODE_SAGLAYICI=nominatim` ücretsiz, `google` hızlı/ücretli). Tahmini konumlar haritada kesikli daire; kurye navigasyonu yine adres metnine gider, GPS ile doğrulanınca dolu daire olur. **Rotalar**: her "Rotaya başla/bitir" bir rota; km, konum ve deneme sayısı; harita üzerinde iz ve zaman kaydırıcılı oynatma. **Uyarılar**: hareketsiz kurye (45 dk), 14 saatten uzun açık rota (otomatik kapanır), doğrulanmış adresten 300 m uzakta teslim, GPS'siz kayıt, şüpheli hızlı teslimat; "incelendi" ile düşer. **Hakediş**: dağıtım sayfası ve Excel'de kurye × gün tablosu (teslim, başarısız, deneme, ilk/son saat, rota km). 90 günden eski ham konum izleri silinir.
- **Faz 3 (bu sürüm):** **Mağaza uygulaması**: aynı kurye kodu Capacitor ile Android paketine çevrildi (`apps/kurye/android`); arka planda konum paylaşımı (rota açıkken kalıcı bildirimle), push bildirimi (yeni atama, üye tercihi; Firebase gerekir), kamera ile QR okutma. **Rota sıralama**: kurye "Rotamı sırala" ile, firma yöneticisi panelden en kısa yola göre sıralar (ilçe kümeleri korunur). **Zarf etiketi**: her gönderiye `K{dağıtım}-{sıra}` kodu; A4 3×8 QR etiket PDF'i; kurye bazlı yazdırılabilir liste. **Gizlilik politikası** sayfası `/gizlilik` (mağaza listelemesi için).

## Android uygulaması (Capacitor)

Kurye uygulaması hem tarayıcıdan (PWA) hem mağaza paketi olarak çalışır; kod tektir.

**APK'yı GitHub Actions ile almak (önerilen, bilgisayara kurulum gerekmez)**
1. Depoda Settings → Secrets and variables → Actions → **Variables**: `VITE_API_URL` = `https://APP_DOMAIN`, `VITE_REALTIME_URL` = `https://REALTIME_DOMAIN`.
2. Actions → "Android APK" → Run workflow (adresleri formdan da girebilirsiniz). Bitince Artifacts bölümünden `kurye-apk` (app-debug.apk) indirilir; kurye telefonlarına doğrudan kurulabilir (bilinmeyen kaynaklara izin). Değişkenler tanımlanmadan çalışan derlemeler "VITE_API_URL tanımlı değil" hatasıyla durur; bu beklenen bir uyarıdır.
3. Play Store için imzalı sürüm: bir kez `keytool -genkeypair -v -keystore release.keystore -alias kurye -keyalg RSA -keysize 2048 -validity 10000` ile anahtar üretin; `base64 -w0 release.keystore` çıktısını `KEYSTORE_BASE64`, şifreleri `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` secret'larına girin. İş akışı `kurye-release` artefaktında imzalı APK ve AAB üretir. **Anahtarı saklayın**; kaybolursa mağazada güncelleme yapılamaz.
4. Push bildirimi için Firebase projesi açın, Android uygulaması (`tr.org.oda.dagitimkurye`) ekleyin, `google-services.json` dosyasını base64 ile `GOOGLE_SERVICES_JSON` secret'ına koyun; sunucu tarafında servis hesabı JSON'unu `FIREBASE_SERVICE_ACCOUNT_JSON` env'ine (base64) girin. Firebase yoksa uygulama çalışır, yalnızca bildirim gitmez.

**Yerelde derlemek**: Android Studio veya SDK (platform 34, build-tools 34) + Java 17. `cd apps/kurye && pnpm cap:android` → `android/app/build/outputs/apk/debug/app-debug.apk`.

**iOS**: macOS + Xcode gerekir. `cd apps/kurye && pnpm build && npx cap add ios && npx cap sync ios && npx cap open ios`. `Info.plist`'e Türkçe izin metinleri ekleyin: `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationWhenInUseUsageDescription` ("Rota açıkken konumunuz dağıtım merkeziyle paylaşılır"), `NSCameraUsageDescription` ("Teslimat fotoğrafı ve zarf QR kodu için"). Background Modes → Location updates açılır. App Store için Apple Developer hesabı gerekir.

**Play Console notları**: Arka plan konum izni için "konum beyanı" istenir; gerekçe: kurye rota açıkken canlı takip ve teslimat doğrulaması, yalnızca "Rotaya başla" ile "Rotayı bitir" arasında. Gizlilik politikası adresi: `https://APP_DOMAIN/gizlilik`.

## Notlar

- Fotoğraf ve imzalar `storage` Docker volume'unda tutulur, yalnızca oturumlu kullanıcılara `/api/files/...` üzerinden servis edilir.
- PWA'da uygulama arka plana atılırsa (özellikle iPhone) konum gönderimi durabilir; kurye rota açıkken uygulamayı ön planda tutmalı. Faz 3 native paket bunu çözer.
- Üye verisi için KVKK: kimlik no, doğum tarihi, baba adı gibi sütunlar varsayılan olarak içe alınmaz; eşleme ekranında kırmızı işaretli görünür.
