# Bilgisayarınızda Deneme

Bu rehber, sistemi kendi bilgisayarınızda (Windows, Mac veya Linux) sunucu, alan adı ve SMS hesabı olmadan çalıştırıp denemeniz içindir. Gerçek SMS gitmez, adres konumları yaklaşık tahmin edilir. Her şey bilgisayarınızda kalır.

## 1. Bir kez yapılacak kurulum

1. **Docker Desktop** kurun: https://www.docker.com/products/docker-desktop/
   Kurulumdan sonra bilgisayarı yeniden başlatın ve Docker Desktop'ı açın. Sol altta yeşil "Engine running" yazısını bekleyin.
   Windows'ta "WSL 2 güncellemesi gerekli" uyarısı çıkarsa, uyarıdaki bağlantıdan güncellemeyi kurup Docker'ı yeniden açın.
2. **Proje dosyalarını indirin**: https://github.com/courage43/KargoTakip adresinde yeşil **Code** düğmesi → **Download ZIP**. ZIP'i masaüstüne çıkarın.
   (Git kullanıyorsanız: `git clone https://github.com/courage43/KargoTakip.git`)

## 2. Sistemi başlatma

1. Çıkardığınız klasörü açın.
2. Klasörün içinde boş bir yere sağ tıklayın:
   - Windows: **Terminalde aç** (veya adres çubuğuna `cmd` yazıp Enter)
   - Mac: Finder'da klasöre sağ tık → **Klasörde Yeni Terminal**
3. Şu komutu yazıp Enter'a basın:

```
docker compose -f docker-compose.yerel.yml up -d --build
```

İlk seferde 5 ile 15 dakika sürer (internetten bileşenler indirilir). Sonraki açılışlar birkaç saniyedir. Bittiğinde 6 satır "Started" veya "Running" görürsünüz.

## 3. Adresler ve giriş bilgileri

| Ne | Adres | Giriş |
|---|---|---|
| Oda paneli | http://localhost:3000 | `admin@oda.local` / `Admin123!` |
| Kurye firması paneli | http://localhost:3000 | `firma@kurye.local` / `Firma123!` |
| Kurye uygulaması | http://localhost:5173 | telefon `05550000001`, PIN `1234` |

Diğer deneme kuryeleri: `05550000002` ve `05550000003`, PIN `1234`.

Paneller ve kurye uygulaması aynı anda farklı tarayıcı pencerelerinde açık kalabilir. Birinde yapılan işlem diğerinde anında görünür.

## 4. Adım adım deneme senaryosu

Klasördeki `ornekler` dizininde üç örnek Excel var. Gerçek dosyanızla da aynı adımları izleyebilirsiniz.

**Oda paneli (admin)**
1. **Üye Listesi Yükle** → `ornekler/ornek-uye-listesi.xlsx` → sütun eşleme ekranında yeşil satırları kontrol edin → **Üye listesini işle**.
2. **Üyeler** → üstteki **"Konumu olmayan … adresi tahmin et"** düğmesi. Birkaç saniyede adresler haritaya düşer.
3. **Dağıtımlar → Yeni dağıtım** → kurye firması olarak "Örnek Kurye A.Ş." seçin → **Dağıtımı oluştur**.
4. Açılan sayfada **Dağıtım listesi yükle** → `ornekler/ornek-dagitim-listesi.xlsx` → **Gönderileri oluştur**. Bir satırın "eşleşmeyen" olarak raporlandığını görürsünüz (bilerek konmuş hatalı sicil).
5. Dağıtım sayfasında **Dağıtımı başlat**. İsterseniz **Üye SMS bildirimi** kartından SMS'i "gönderin" (sahte gönderim, gerçek SMS gitmez) ve **🏷 Zarf etiketleri** ile QR'lı etiket PDF'ini açın.

**Kurye firması paneli** (başka bir tarayıcı veya gizli pencere)
6. `firma@kurye.local` ile girin → dağıtımı açın → **İlçe** filtresinden bir ilçe seçin → **Filtredekileri seç** → kurye "Ahmet Kurye" → **Kuryeye ata**.
7. Aynı ekranda **↕ Kuryenin listesini sırala** ve **🖨 Liste yazdır** düğmelerini deneyin.

**Kurye uygulaması** (telefon görünümü için aşağıdaki ipucuna bakın)
8. http://localhost:5173 → `05550000001` / `1234`. Atanan gönderiler listelenir.
9. **▶ Rotaya başla** → bir kartta **Teslimat** → **Teslim Edildi** → bir fotoğraf seçin, teslim alan adını yazın, imza kutusuna fareyle imza atın → **Kaydet ve gönder**.
10. Oda panelinde **Canlı Harita**, dağıtım sayfası ve ilgili gönderinin zaman çizelgesinde kaydın, fotoğrafın, imzanın ve konumun anında göründüğünü kontrol edin.

**Üye tercih sayfası**
11. Oda panelinde bir gönderinin detayını açın. Üstte `Üye linki: /t/…` yazar. Tarayıcıya `http://localhost:3000/t/…` olarak yazın, "Komşuya bırakılabilir" seçip kaydedin. Kurye uygulamasında o kartta rozetin çıktığını görün.

**Adres değişikliği**
12. **Üye Listesi Yükle** → bu kez `ornekler/ornek-uye-listesi-adres-degisikligi.xlsx`. İşlem sonunda **Adres Değişiklikleri** ekranında eski ve yeni adresler yan yana gelir; önerilen kararları uygulayın.

## İpuçları

- **Kurye uygulamasını telefon gibi görmek**: Chrome'da http://localhost:5173 açıkken `F12` → sol üstteki telefon simgesi (Ctrl+Shift+M) → üstten "Pixel 7" seçin. GPS'i taklit etmek için aynı panelde **⋮ → More tools → Sensors → Location** altından "Istanbul" veya özel koordinat seçin.
- **Gerçek telefonla deneme**: Telefon tarayıcıları konum ve kamerayı yalnızca güvenli (https) adreslerde verir; bu yüzden yerel denemede telefonla bilgisayara bağlanmak konum/kamera açısından çalışmaz. Telefonla gerçek deneme, sistem sunucuya kurulup alan adı aldıktan sonra yapılır.
- **Sistemi durdurmak**: `docker compose -f docker-compose.yerel.yml down`
- **Her şeyi silip baştan başlamak**: `docker compose -f docker-compose.yerel.yml down -v` sonra başlatma komutu.
- **Bir şey açılmıyorsa**: Docker Desktop'ta "dagitim-yerel" grubunu açın; kırmızı görünen kutunun günlüğünü (Logs) bana iletebilirsiniz.
- 3000, 3001 veya 5173 portunu başka bir program kullanıyorsa başlatma "port is already allocated" hatası verir; o programı kapatıp komutu tekrar çalıştırın.
