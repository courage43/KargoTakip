-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ODA_ADMIN', 'KURYE_FIRMA_YONETICI', 'KURYE');

-- CreateEnum
CREATE TYPE "GeoSource" AS ENUM ('GEOCODE_TAHMIN', 'KURYE_GPS', 'ADMIN_DUZELTME');

-- CreateEnum
CREATE TYPE "KonumDurumu" AS ENUM ('YOK', 'TAHMINI', 'DOGRULANDI', 'DOGRULANACAK', 'CAKISMA_BEKLIYOR');

-- CreateEnum
CREATE TYPE "AdresDegisiklikKaynak" AS ENUM ('EXCEL', 'UYE_SAYFASI', 'KURYE_TASINMIS', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdresDegisiklikKarar" AS ENUM ('BEKLIYOR', 'YENI_ADRES', 'AYNI_YER', 'REDDEDILDI');

-- CreateEnum
CREATE TYPE "ImportTuru" AS ENUM ('GENEL_LISTE', 'DAGITIM_LISTESI');

-- CreateEnum
CREATE TYPE "ImportDurumu" AS ENUM ('ESLEME_BEKLIYOR', 'ISLENIYOR', 'TAMAMLANDI', 'HATA');

-- CreateEnum
CREATE TYPE "KampanyaTuru" AS ENUM ('DONEMSEL', 'OZEL');

-- CreateEnum
CREATE TYPE "KampanyaDurumu" AS ENUM ('TASLAK', 'AKTIF', 'TAMAMLANDI');

-- CreateEnum
CREATE TYPE "GonderiDurumu" AS ENUM ('BEKLIYOR', 'ATANDI', 'YOLDA', 'TESLIM_EDILDI', 'KOMSUYA_BIRAKILDI', 'ISYERINE_BIRAKILDI', 'ADRESTE_BULUNAMADI', 'ADRES_HATALI', 'TASINMIS', 'UYE_ISTEMEDI', 'IADE');

-- CreateEnum
CREATE TYPE "UyeTercihi" AS ENUM ('ISYERINDEYIM', 'EVDEYIM', 'KOMSUYA_BIRAK', 'BASKA_ADRESE', 'ZARF_ISTEMIYORUM');

-- CreateEnum
CREATE TYPE "TeslimAlanIliskisi" AS ENUM ('YETKILI', 'CALISAN', 'KOMSU', 'DIGER');

-- CreateEnum
CREATE TYPE "SmsDurumu" AS ENUM ('KUYRUKTA', 'GONDERILDI', 'ILETILDI', 'HATA');

-- CreateTable
CREATE TABLE "CourierCompany" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "telefon" TEXT,
    "eposta" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "eposta" TEXT,
    "sifreHash" TEXT,
    "telefon" TEXT,
    "pinHash" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "courierCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sonGiris" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "sicilNo" TEXT NOT NULL,
    "unvan" TEXT NOT NULL,
    "tabelaUnvani" TEXT,
    "yetkiliAdSoyad" TEXT,
    "cepTelefonu" TEXT,
    "isTelefonu" TEXT,
    "eposta" TEXT,
    "meslekGrubu" TEXT,
    "odaBolgeKodu" TEXT,
    "durumTanimi" TEXT,
    "subeAdi" TEXT,
    "rawData" JSONB,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "lastImportBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberAddress" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "adresTipi" TEXT,
    "adresMetni" TEXT NOT NULL,
    "adresNormalize" TEXT NOT NULL,
    "ilce" TEXT,
    "il" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "gecerlilikBaslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gecerlilikBitis" TIMESTAMP(3),
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "geoAccuracyM" DOUBLE PRECISION,
    "geoSource" "GeoSource",
    "konumDurumu" "KonumDurumu" NOT NULL DEFAULT 'YOK',
    "verifiedCount" INTEGER NOT NULL DEFAULT 0,
    "lastVerifiedAt" TIMESTAMP(3),
    "adayLat" DOUBLE PRECISION,
    "adayLng" DOUBLE PRECISION,
    "adayAttemptId" TEXT,
    "kuryeNotu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressChangeRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "eskiAddressId" TEXT,
    "eskiAdres" TEXT,
    "yeniAdres" TEXT NOT NULL,
    "yeniAdresTipi" TEXT,
    "benzerlikSkoru" DOUBLE PRECISION,
    "eskiKonumVarMi" BOOLEAN NOT NULL DEFAULT false,
    "kaynak" "AdresDegisiklikKaynak" NOT NULL,
    "karar" "AdresDegisiklikKarar" NOT NULL DEFAULT 'BEKLIYOR',
    "kararVerenId" TEXT,
    "kararTarihi" TIMESTAMP(3),
    "importBatchId" TEXT,
    "shipmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddressChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "tur" "ImportTuru" NOT NULL,
    "dosyaAdi" TEXT NOT NULL,
    "dosyaYolu" TEXT,
    "satirSayisi" INTEGER NOT NULL DEFAULT 0,
    "eklenen" INTEGER NOT NULL DEFAULT 0,
    "guncellenen" INTEGER NOT NULL DEFAULT 0,
    "pasifYapilan" INTEGER NOT NULL DEFAULT 0,
    "adresDegisen" INTEGER NOT NULL DEFAULT 0,
    "eslesmeyen" INTEGER NOT NULL DEFAULT 0,
    "esleme" JSONB,
    "hataRaporu" JSONB,
    "durum" "ImportDurumu" NOT NULL DEFAULT 'ESLEME_BEKLIYOR',
    "yukleyenId" TEXT NOT NULL,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitisZamani" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tur" "KampanyaTuru" NOT NULL DEFAULT 'DONEMSEL',
    "planlananBaslangic" TIMESTAMP(3),
    "planlananBitis" TIMESTAMP(3),
    "durum" "KampanyaDurumu" NOT NULL DEFAULT 'TASLAK',
    "courierCompanyId" TEXT,
    "smsSablonu" TEXT,
    "smsGonderildi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "memberAddressId" TEXT NOT NULL,
    "courierCompanyId" TEXT,
    "barkod" TEXT,
    "durum" "GonderiDurumu" NOT NULL DEFAULT 'BEKLIYOR',
    "assignedCourierId" TEXT,
    "siraNo" INTEGER,
    "atamaTarihi" TIMESTAMP(3),
    "token" TEXT NOT NULL,
    "uyeTercihi" "UyeTercihi",
    "uyeNotu" TEXT,
    "komsuBilgisi" TEXT,
    "alternatifAdres" TEXT,
    "uygunSaat" TEXT,
    "tercihTarihi" TIMESTAMP(3),
    "denemeSayisi" INTEGER NOT NULL DEFAULT 0,
    "sonDenemeAt" TIMESTAMP(3),
    "sonDurumAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "sonuc" "GonderiDurumu" NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "adresMesafesiM" DOUBLE PRECISION,
    "fotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imzaUrl" TEXT,
    "teslimAlanAdi" TEXT,
    "teslimAlanIliskisi" "TeslimAlanIliskisi",
    "not" TEXT,
    "konumKaydet" BOOLEAN NOT NULL DEFAULT false,
    "konumSonucu" TEXT,
    "offlineOlusturuldu" BOOLEAN NOT NULL DEFAULT false,
    "istemciId" TEXT,
    "cihazZamani" TIMESTAMP(3) NOT NULL,
    "sunucuZamani" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "campaignId" TEXT,
    "baslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" TIMESTAMP(3),

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierLocation" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "campaignId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracyM" DOUBLE PRECISION,
    "hiz" DOUBLE PRECISION,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT,
    "telefon" TEXT NOT NULL,
    "sablon" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL,
    "saglayici" TEXT,
    "saglayiciMesajId" TEXT,
    "durum" "SmsDurumu" NOT NULL DEFAULT 'KUYRUKTA',
    "hata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "islem" TEXT NOT NULL,
    "varlik" TEXT NOT NULL,
    "varlikId" TEXT,
    "detay" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_eposta_key" ON "User"("eposta");

-- CreateIndex
CREATE UNIQUE INDEX "User_telefon_key" ON "User"("telefon");

-- CreateIndex
CREATE INDEX "User_courierCompanyId_idx" ON "User"("courierCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_sicilNo_key" ON "Member"("sicilNo");

-- CreateIndex
CREATE INDEX "Member_unvan_idx" ON "Member"("unvan");

-- CreateIndex
CREATE INDEX "Member_aktif_idx" ON "Member"("aktif");

-- CreateIndex
CREATE INDEX "MemberAddress_memberId_gecerlilikBitis_idx" ON "MemberAddress"("memberId", "gecerlilikBitis");

-- CreateIndex
CREATE INDEX "MemberAddress_ilce_idx" ON "MemberAddress"("ilce");

-- CreateIndex
CREATE INDEX "MemberAddress_konumDurumu_idx" ON "MemberAddress"("konumDurumu");

-- CreateIndex
CREATE INDEX "AddressChangeRequest_karar_idx" ON "AddressChangeRequest"("karar");

-- CreateIndex
CREATE INDEX "AddressChangeRequest_importBatchId_idx" ON "AddressChangeRequest"("importBatchId");

-- CreateIndex
CREATE INDEX "Campaign_durum_idx" ON "Campaign"("durum");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_barkod_key" ON "Shipment"("barkod");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_token_key" ON "Shipment"("token");

-- CreateIndex
CREATE INDEX "Shipment_campaignId_durum_idx" ON "Shipment"("campaignId", "durum");

-- CreateIndex
CREATE INDEX "Shipment_assignedCourierId_durum_idx" ON "Shipment"("assignedCourierId", "durum");

-- CreateIndex
CREATE INDEX "Shipment_courierCompanyId_idx" ON "Shipment"("courierCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_campaignId_memberId_memberAddressId_key" ON "Shipment"("campaignId", "memberId", "memberAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAttempt_istemciId_key" ON "DeliveryAttempt"("istemciId");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_shipmentId_idx" ON "DeliveryAttempt"("shipmentId");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_courierId_sunucuZamani_idx" ON "DeliveryAttempt"("courierId", "sunucuZamani");

-- CreateIndex
CREATE INDEX "Route_courierId_bitis_idx" ON "Route"("courierId", "bitis");

-- CreateIndex
CREATE INDEX "CourierLocation_courierId_zaman_idx" ON "CourierLocation"("courierId", "zaman");

-- CreateIndex
CREATE INDEX "SmsLog_shipmentId_idx" ON "SmsLog"("shipmentId");

-- CreateIndex
CREATE INDEX "AuditLog_varlik_varlikId_idx" ON "AuditLog"("varlik", "varlikId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_courierCompanyId_fkey" FOREIGN KEY ("courierCompanyId") REFERENCES "CourierCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_lastImportBatchId_fkey" FOREIGN KEY ("lastImportBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAddress" ADD CONSTRAINT "MemberAddress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressChangeRequest" ADD CONSTRAINT "AddressChangeRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressChangeRequest" ADD CONSTRAINT "AddressChangeRequest_kararVerenId_fkey" FOREIGN KEY ("kararVerenId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressChangeRequest" ADD CONSTRAINT "AddressChangeRequest_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressChangeRequest" ADD CONSTRAINT "AddressChangeRequest_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_courierCompanyId_fkey" FOREIGN KEY ("courierCompanyId") REFERENCES "CourierCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_memberAddressId_fkey" FOREIGN KEY ("memberAddressId") REFERENCES "MemberAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_courierCompanyId_fkey" FOREIGN KEY ("courierCompanyId") REFERENCES "CourierCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_assignedCourierId_fkey" FOREIGN KEY ("assignedCourierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierLocation" ADD CONSTRAINT "CourierLocation_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierLocation" ADD CONSTRAINT "CourierLocation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
