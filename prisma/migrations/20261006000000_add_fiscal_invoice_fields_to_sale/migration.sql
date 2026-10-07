-- CreateEnum
CREATE TYPE "FiscalStatus" AS ENUM ('NOT_PRINTED', 'PRINTED', 'FAILED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "fiscalInvoiceNumber" TEXT,
ADD COLUMN "fiscalPrinterSerial" TEXT,
ADD COLUMN "fiscalStatus" "FiscalStatus" NOT NULL DEFAULT 'NOT_PRINTED',
ADD COLUMN "fiscalPrintedAt" TIMESTAMP(3);
