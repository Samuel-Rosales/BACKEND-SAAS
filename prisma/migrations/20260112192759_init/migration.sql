/*
  Warnings:

  - You are about to drop the column `businessId` on the `ExchangeRate` table. All the data in the column will be lost.
  - You are about to drop the `ItemLot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StockGeneral` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `unitId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `depotId` to the `PurchaseItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expirationDate` to the `PurchaseItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ExchangeRate" DROP CONSTRAINT "ExchangeRate_businessId_fkey";

-- DropForeignKey
ALTER TABLE "ItemLot" DROP CONSTRAINT "ItemLot_purchaseItemId_fkey";

-- DropForeignKey
ALTER TABLE "StockGeneral" DROP CONSTRAINT "StockGeneral_depotId_fkey";

-- DropForeignKey
ALTER TABLE "StockGeneral" DROP CONSTRAINT "StockGeneral_productId_fkey";

-- AlterTable
ALTER TABLE "Depot" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ExchangeRate" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unitId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "depotId" INTEGER NOT NULL,
ADD COLUMN     "expirationDate" DATE NOT NULL;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "historicalCost" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "ItemLot";

-- DropTable
DROP TABLE "StockGeneral";

-- CreateTable
CREATE TABLE "MeasurementUnit" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,

    CONSTRAINT "MeasurementUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPresentation" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "factor" DECIMAL(10,4) NOT NULL,
    "barCode" TEXT,
    "price" DECIMAL(65,30),

    CONSTRAINT "ProductPresentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockLot_productId_depotId_idx" ON "StockLot"("productId", "depotId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "MeasurementUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPresentation" ADD CONSTRAINT "ProductPresentation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
