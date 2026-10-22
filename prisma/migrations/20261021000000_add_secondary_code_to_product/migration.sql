-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "secondaryCode" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_businessId_secondaryCode_idx" ON "Product"("businessId", "secondaryCode");
