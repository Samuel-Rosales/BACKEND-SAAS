/*
  Warnings:

  - You are about to alter the column `unitCost` on the `PurchaseItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `Decimal(18,6)`.

*/
-- AlterTable
ALTER TABLE "PurchaseItem" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(18,6);
