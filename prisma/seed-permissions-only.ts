import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedPermissions } from "./seed-permissions";
import { permissionCache } from "../src/utils/permission-cache";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding permissions and role-permissions...");
  await seedPermissions(prisma);
  permissionCache.invalidateAll();
  console.log("✅ Permissions seed completed. Cache invalidated.");
}

main()
  .catch((e) => {
    console.error("❌ Permissions seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
