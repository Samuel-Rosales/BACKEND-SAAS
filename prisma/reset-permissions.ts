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
  console.log("🗑️  Borrando rolePermissions...");
  await prisma.rolePermission.deleteMany();

  console.log("🗑️  Borrando permissions...");
  await prisma.permission.deleteMany();

  console.log("🌱 Recargando permissions y rolePermissions desde la semilla...");
  await seedPermissions(prisma);

  permissionCache.invalidateAll();
  console.log("✅ Permissions reset completado. Caché invalidado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en permissions reset:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
