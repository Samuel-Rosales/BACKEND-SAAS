-- CreateTable
CREATE TABLE "CreditNotePayment" (
    "id" SERIAL NOT NULL,
    "creditNoteId" INTEGER NOT NULL,
    "paymentMethodId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exchangeRateId" INTEGER NOT NULL,
    "cashRegisterId" INTEGER,

    CONSTRAINT "CreditNotePayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditNotePayment" ADD CONSTRAINT "CreditNotePayment_exchangeRateId_fkey" FOREIGN KEY ("exchangeRateId") REFERENCES "ExchangeRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNotePayment" ADD CONSTRAINT "CreditNotePayment_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNotePayment" ADD CONSTRAINT "CreditNotePayment_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNotePayment" ADD CONSTRAINT "CreditNotePayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
