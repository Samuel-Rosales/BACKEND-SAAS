/*
  Warnings:

  - You are about to alter the column `costPrice` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `Decimal(18,6)`.
  - You are about to alter the column `lotCost` on the `StockLot` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `Decimal(18,6)`.
  - Added the required column `type` to the `MeasurementUnit` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('MASS', 'VOLUME', 'UNIT');

-- AlterTable
ALTER TABLE "MeasurementUnit" ADD COLUMN     "type" "UnitType" NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "costPrice" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "salePrice" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "ProductComponent" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "ProductPresentation" ALTER COLUMN "factor" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "StockLot" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "lotCost" SET DATA TYPE DECIMAL(18,6);
