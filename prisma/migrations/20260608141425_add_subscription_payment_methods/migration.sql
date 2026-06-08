-- CreateTable
CREATE TABLE "SubscriptionPaymentMethod" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL,
    "details" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentMethod_name_key" ON "SubscriptionPaymentMethod"("name");
