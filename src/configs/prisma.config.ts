import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 1. Configuración robusta del Pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,                  // Límite de conexiones simultáneas
  idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, 
  keepAlive: true           // ¡Vital para evitar cortes por firewalls!
});

// 2. EL FIX CRÍTICO: Manejador de errores del Pool
// Si no pones esto, cualquier micro-corte de red matará tu proceso Node.js
pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle SQL client', err);
  // No es necesario process.exit(1) aquí. 
  // El pool simplemente descartará la conexión rota.
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export const connectDB = async () => {
  try {
    // Verificamos conexión inicial
    const client = await pool.connect();
    console.log('🚀 Database connected with Driver Adapter (Prisma 7)');
    client.release(); // ¡No olvides liberar el cliente al pool!
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};