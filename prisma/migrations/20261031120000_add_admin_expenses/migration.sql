-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminExpense" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "exchangeRate" DECIMAL(12,4),
    "amountInUSD" DECIMAL(15,2),
    "usdtReceived" DECIMAL(15,2),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdminExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminExpense_date_idx" ON "AdminExpense"("date");
CREATE INDEX IF NOT EXISTS "AdminExpense_currency_idx" ON "AdminExpense"("currency");
CREATE INDEX IF NOT EXISTS "AdminExpense_category_idx" ON "AdminExpense"("category");
