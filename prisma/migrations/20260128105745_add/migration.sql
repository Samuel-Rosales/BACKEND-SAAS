-- AlterEnum
ALTER TYPE "InstallmentStatus" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "PurchaseInstallment" ADD COLUMN     "amountPaid" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SaleInstallment" ADD COLUMN     "amountPaid" DECIMAL(15,2) NOT NULL DEFAULT 0;
