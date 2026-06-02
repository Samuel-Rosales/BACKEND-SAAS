/*
  Warnings:

  - You are about to drop the column `exchangeRate` on the `Business` table. All the data in the column will be lost.
  - You are about to drop the column `isService` on the `Product` table. All the data in the column will be lost.
  - The `conditions` column on the `Sale` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `taxId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExchangeRateStrategy" AS ENUM ('MANUAL', 'API_BCV', 'API_PARALLEL');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'COMPOSITE', 'SERVICE');

-- CreateEnum
CREATE TYPE "Conditions" AS ENUM ('CASH', 'CREDIT');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'VES', 'EUR');

-- AlterTable
ALTER TABLE "Business" DROP COLUMN "exchangeRate",
ADD COLUMN     "currentExchangeRate" DECIMAL(10,4) NOT NULL DEFAULT 1.0,
ADD COLUMN     "manualRate" DECIMAL(10,4),
ADD COLUMN     "rateStrategy" "ExchangeRateStrategy" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "ExchangeRate" ADD COLUMN     "businessId" INTEGER,
ADD COLUMN     "source" "ExchangeRateStrategy" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "isService",
ADD COLUMN     "taxId" INTEGER NOT NULL,
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'SIMPLE';

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "conditions" "Conditions" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "paymentDueDate" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN     "remainingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "conditions",
ADD COLUMN     "conditions" "Conditions" NOT NULL DEFAULT 'CASH';

-- DropEnum
DROP TYPE "SaleConditions";

-- CreateTable
CREATE TABLE "Tax" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductComponent" (
    "id" SERIAL NOT NULL,
    "parentProductId" INTEGER NOT NULL,
    "childProductId" INTEGER NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "ProductComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleInstallment" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "SaleInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInstallment" (
    "id" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductComponent_parentProductId_idx" ON "ProductComponent"("parentProductId");

-- CreateIndex
CREATE INDEX "ProductComponent_childProductId_idx" ON "ProductComponent"("childProductId");

-- CreateIndex
CREATE INDEX "ExchangeRate_createdAt_idx" ON "ExchangeRate"("createdAt");

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComponent" ADD CONSTRAINT "ProductComponent_parentProductId_fkey" FOREIGN KEY ("parentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComponent" ADD CONSTRAINT "ProductComponent_childProductId_fkey" FOREIGN KEY ("childProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInstallment" ADD CONSTRAINT "SaleInstallment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInstallment" ADD CONSTRAINT "PurchaseInstallment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
