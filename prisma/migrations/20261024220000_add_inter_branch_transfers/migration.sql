-- AlterTable Business
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingExempt" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "isWarehouseHub" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TransferStatus" AS ENUM ('PENDING_RECEIPT', 'RECEIVED_FULL', 'RECEIVED_PARTIAL', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "InterBranchTransfer" (
    "id" SERIAL NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "originBusinessId" INTEGER NOT NULL,
    "destinationBusinessId" INTEGER NOT NULL,
    "saleId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING_RECEIPT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "receivedById" INTEGER,
    "receivingNotes" TEXT,

    CONSTRAINT "InterBranchTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InterBranchTransferItem" (
    "id" SERIAL NOT NULL,
    "transferId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "quantitySent" DECIMAL(12,2) NOT NULL,
    "quantityReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quantityDamaged" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quantityMissing" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "damagedReason" TEXT,

    CONSTRAINT "InterBranchTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InterBranchTransfer_transferNumber_key" ON "InterBranchTransfer"("transferNumber");
CREATE INDEX IF NOT EXISTS "InterBranchTransfer_originBusinessId_idx" ON "InterBranchTransfer"("originBusinessId");
CREATE INDEX IF NOT EXISTS "InterBranchTransfer_destinationBusinessId_idx" ON "InterBranchTransfer"("destinationBusinessId");
CREATE INDEX IF NOT EXISTS "InterBranchTransfer_status_idx" ON "InterBranchTransfer"("status");
CREATE INDEX IF NOT EXISTS "InterBranchTransferItem_transferId_idx" ON "InterBranchTransferItem"("transferId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InterBranchTransfer" ADD CONSTRAINT "InterBranchTransfer_originBusinessId_fkey" FOREIGN KEY ("originBusinessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InterBranchTransfer" ADD CONSTRAINT "InterBranchTransfer_destinationBusinessId_fkey" FOREIGN KEY ("destinationBusinessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InterBranchTransferItem" ADD CONSTRAINT "InterBranchTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InterBranchTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
