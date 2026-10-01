-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'EXPENSES';

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#6B7280',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "exchangeRateId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "amountInUSD" DECIMAL(15,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "beneficiary" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseCategory_businessId_isActive_idx" ON "ExpenseCategory"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_businessId_name_key" ON "ExpenseCategory"("businessId", "name");

-- CreateIndex
CREATE INDEX "Expense_businessId_expenseDate_idx" ON "Expense"("businessId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_businessId_categoryId_idx" ON "Expense"("businessId", "categoryId");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "BusinessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_exchangeRateId_fkey" FOREIGN KEY ("exchangeRateId") REFERENCES "ExchangeRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
