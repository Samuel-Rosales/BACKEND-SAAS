import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  users,
  roles,
  userContacts,
  businessMembers,
  businessCategories,
  businesses,
  subscriptions,
  exchangeRates,
  paymentMethods,
  cashRegisters,
  cashCounts,
  measurementUnits,
  categories,
  taxes,
  products,
  productComponents,
  productPresentations,
  depots,
  stockLots,
  stockMovements,
  clients,
  sales,
  saleItems,
  saleItemLots,
  salePayments,
  creditNotes,
  creditNoteItems,
  suppliers,
  purchases,
  purchaseItems,
  purchasePayments,
} from "../src/data/index.data";

// Set up Prisma 7 adapter for PostgreSQL via pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Platform
  await prisma.businessCategory.createMany({ data: businessCategories, skipDuplicates: true });
  await prisma.business.createMany({ data: businesses as any, skipDuplicates: true });
  await prisma.subscription.createMany({ data: subscriptions as any, skipDuplicates: true });

  // AIM
  await prisma.user.createMany({ data: users as any, skipDuplicates: true });
  await prisma.role.createMany({ data: roles as any, skipDuplicates: true });
  await prisma.businessMember.createMany({ data: businessMembers as any, skipDuplicates: true });
  await prisma.userContact.createMany({ data: userContacts as any, skipDuplicates: true });

  // Inventory
  await prisma.measurementUnit.createMany({ data: measurementUnits as any, skipDuplicates: true });
  await prisma.category.createMany({ data: categories as any, skipDuplicates: true });
  await prisma.tax.createMany({ data: taxes, skipDuplicates: true });
  await prisma.product.createMany({ data: products as any, skipDuplicates: true });
  await prisma.productComponent.createMany({ data: productComponents, skipDuplicates: true });
  await prisma.productPresentation.createMany({ data: productPresentations as any, skipDuplicates: true });
  await prisma.depot.createMany({ data: depots as any, skipDuplicates: true });
  await prisma.stockLot.createMany({ data: stockLots as any, skipDuplicates: true });
  await prisma.stockMovement.createMany({ data: stockMovements as any, skipDuplicates: true });

  // Finance
  await prisma.exchangeRate.createMany({ data: exchangeRates as any, skipDuplicates: true });
  await prisma.paymentMethod.createMany({ data: paymentMethods as any, skipDuplicates: true });
  await prisma.cashRegister.createMany({ data: cashRegisters as any, skipDuplicates: true });
  await prisma.cashCount.createMany({ data: cashCounts as any, skipDuplicates: true });

  // Procurement
  await prisma.supplier.createMany({ data: suppliers as any, skipDuplicates: true });
  await prisma.purchase.createMany({ data: purchases as any, skipDuplicates: true });
  await prisma.purchaseItem.createMany({ data: purchaseItems as any, skipDuplicates: true });
  await prisma.purchasePayment.createMany({ data: purchasePayments as any, skipDuplicates: true });

  // Sales
  await prisma.client.createMany({ data: clients as any, skipDuplicates: true });
  await prisma.sale.createMany({ data: sales as any, skipDuplicates: true });
  await prisma.saleItem.createMany({ data: saleItems as any, skipDuplicates: true });
  await prisma.saleItemLot.createMany({ data: saleItemLots as any, skipDuplicates: true });
  await prisma.salePayment.createMany({ data: salePayments as any, skipDuplicates: true });
  await prisma.creditNote.createMany({ data: creditNotes as any, skipDuplicates: true });
  await prisma.creditNoteItem.createMany({ data: creditNoteItems as any, skipDuplicates: true });

  console.log("✅ Seed completed.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
