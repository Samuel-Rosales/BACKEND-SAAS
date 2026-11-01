-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "businessId" INTEGER;

-- DropIndex
DROP INDEX IF EXISTS "PaymentMethod_name_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentMethod_businessId_name_key" ON "PaymentMethod"("businessId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentMethod_businessId_isActive_idx" ON "PaymentMethod"("businessId", "isActive");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PaymentMethod_businessId_fkey'
    ) THEN
        ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
