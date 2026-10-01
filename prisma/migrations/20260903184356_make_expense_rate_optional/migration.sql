-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_exchangeRateId_fkey";

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "exchangeRateId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_exchangeRateId_fkey" FOREIGN KEY ("exchangeRateId") REFERENCES "ExchangeRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
