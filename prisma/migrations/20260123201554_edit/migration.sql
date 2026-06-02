/*
  Warnings:

  - You are about to alter the column `profitMargin` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(5,4)`.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "profitMargin" SET DATA TYPE DECIMAL(5,4);
