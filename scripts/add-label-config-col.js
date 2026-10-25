const { Client } = require('pg');

async function run() {
    const url = process.env.DATABASE_URL || 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
    console.log('>>> Conectando a PostgreSQL usando:', url.replace(/:[^:@]+@/, ':***@'));
    
    const client = new Client({ connectionString: url });
    await client.connect();

    console.log('>>> Agregando columna labelConfig a la tabla Business si no existe...');
    await client.query(`
        ALTER TABLE "Business" 
        ADD COLUMN IF NOT EXISTS "labelConfig" JSONB;
    `);

    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Business' AND column_name = 'labelConfig';
    `);
    console.log('Resultado de la columna labelConfig:');
    console.table(res.rows);

    await client.end();
}

run().catch(console.error);
