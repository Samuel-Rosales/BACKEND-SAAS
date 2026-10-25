const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function updateDb(url, name) {
    console.log(`\n>>> Actualizando esquema para Recargo de Crédito en ${name}...`);
    const client = new Client({ connectionString: url });
    await client.connect();

    // Columnas en tabla Business
    await client.query(`
        ALTER TABLE "Business" 
        ADD COLUMN IF NOT EXISTS "enableCreditPriceSurcharge" BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS "creditSurchargePercentage" DECIMAL(5, 2) DEFAULT 10.00;
    `);
    console.log(`✓ Columnas agregadas a Business en ${name}`);

    // Verificar Business
    const bRes = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'Business' AND column_name IN ('enableCreditPriceSurcharge', 'creditSurchargePercentage');
    `);
    console.table(bRes.rows);

    await client.end();
}

async function main() {
    await updateDb(DEV_URL, 'DEV');
    await updateDb(PROD_URL, 'PROD');
}

main().catch(console.error);
