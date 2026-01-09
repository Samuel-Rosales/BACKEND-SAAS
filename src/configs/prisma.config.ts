import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 1. Creamos la conexión con el driver 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. Creamos el adaptador de Prisma para PostgreSQL
const adapter = new PrismaPg(pool);

// 3. Inicializamos Prisma con el adaptador
const prisma = new PrismaClient({ adapter });

export const connectDB = async () => {
  try {
    // Con el adaptador, verificamos la conexión a través del pool
    await pool.connect();
    console.log('🚀 Database connected with Driver Adapter (Prisma 7)');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export default prisma;