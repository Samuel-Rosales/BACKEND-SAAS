const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
    const client = new Client({ connectionString: PROD_URL });
    await client.connect();

    console.log('>>> Agregando columna ticketConfig a la tabla Business en PROD...');
    await client.query(`
        ALTER TABLE "Business" 
        ADD COLUMN IF NOT EXISTS "ticketConfig" JSONB;
    `);

    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Business' AND column_name = 'ticketConfig';
    `);
    console.table(res.rows);

    await client.end();
}

main().catch(console.error);
