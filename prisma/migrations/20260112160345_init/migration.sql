/*
  Warnings:

  - You are about to drop the column `contact` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Supplier` table. All the data in the column will be lost.
  - Added the required column `address` to the `Supplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactName` to the `Supplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameCompany` to the `Supplier` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `Supplier` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "contact",
DROP COLUMN "name",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "contactName" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nameCompany" TEXT NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;
