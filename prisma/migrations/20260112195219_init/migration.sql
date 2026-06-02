/*
  Warnings:

  - Added the required column `observation` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subTotal` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxAmount` to the `Purchase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "observation" TEXT NOT NULL,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "subTotal" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "taxAmount" DECIMAL(15,2) NOT NULL;
