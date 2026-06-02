-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "defaultCreditLimit" DECIMAL(15,2) NOT NULL DEFAULT 100,
ADD COLUMN     "enableGlobalCredit" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "allowCredit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "currentDebt" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "customLimit" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "useCustomLimit" BOOLEAN NOT NULL DEFAULT false;
