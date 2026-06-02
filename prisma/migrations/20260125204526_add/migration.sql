/*
  Warnings:

  - You are about to alter the column `quantity` on the `CreditNoteItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `unitPrice` on the `CreditNoteItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(16,2)`.
  - You are about to alter the column `subTotal` on the `CreditNoteItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(16,2)`.

*/
-- AlterTable
ALTER TABLE "CreditNoteItem" ADD COLUMN     "returnToStock" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(16,2),
ALTER COLUMN "subTotal" SET DATA TYPE DECIMAL(16,2);
