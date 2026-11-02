-- AlterTable
ALTER TABLE "MemberAddress" ADD COLUMN     "geoKalite" TEXT,
ADD COLUMN     "geocodeDenemesi" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "geocodeHata" TEXT;

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "denemeSayisi" INTEGER,
ADD COLUMN     "mesafeM" DOUBLE PRECISION,
ADD COLUMN     "noktaSayisi" INTEGER,
ADD COLUMN     "otomatikKapandi" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "adresNormalize" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "kalite" TEXT,
    "saglayici" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("adresNormalize")
);

-- CreateTable
CREATE TABLE "UyariIsareti" (
    "id" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UyariIsareti_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UyariIsareti_tur_anahtar_key" ON "UyariIsareti"("tur", "anahtar");

-- CreateIndex
CREATE INDEX "Route_baslangic_idx" ON "Route"("baslangic");
