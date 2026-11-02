-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "smsYoldaSablonu" TEXT;

-- AlterTable
ALTER TABLE "SmsLog" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "gonderimZamani" TIMESTAMP(3),
ADD COLUMN     "parcaSayisi" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "raporZamani" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SmsLog_campaignId_durum_idx" ON "SmsLog"("campaignId", "durum");

-- CreateIndex
CREATE INDEX "SmsLog_durum_createdAt_idx" ON "SmsLog"("durum", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
