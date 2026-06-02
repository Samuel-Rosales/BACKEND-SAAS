/*
  Warnings:

  - You are about to drop the column `createdById` on the `ExchangeRate` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `ExchangeRate` table. All the data in the column will be lost.
  - Added the required column `currency` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExchangeRate" DROP COLUMN "createdById",
DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN     "currency" TEXT NOT NULL;
