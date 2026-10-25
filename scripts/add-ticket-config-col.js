const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function main() {
    const client = new Client({ connectionString: DEV_URL });
    await client.connect();

    console.log('>>> Agregando columna ticketConfig a la tabla Business en DEV...');
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
