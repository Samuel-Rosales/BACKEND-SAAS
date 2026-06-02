/*
  Warnings:

  - You are about to alter the column `historicalCost` on the `StockMovement` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `Decimal(18,6)`.

*/
-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "SaleItemLot" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "historicalCost" SET DATA TYPE DECIMAL(18,6);
