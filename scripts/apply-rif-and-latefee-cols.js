const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function updateDb(url, name) {
    console.log(`\n>>> Actualizando esquema en ${name}...`);
    const client = new Client({ connectionString: url });
    await client.connect();

    // 1. Columnas en tabla Business
    await client.query(`
        ALTER TABLE "Business" 
        ADD COLUMN IF NOT EXISTS "document" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "enableLateFee" BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS "lateFeePercentage" DECIMAL(5, 2) DEFAULT 10.00;
    `);
    console.log(`✓ Columnas agregadas a Business en ${name}`);

    // 2. Columnas en tabla SaleInstallment
    await client.query(`
        ALTER TABLE "SaleInstallment" 
        ADD COLUMN IF NOT EXISTS "lateFeeAmount" DECIMAL(15, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "lateFeePercentage" DECIMAL(5, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "isLateFeeApplied" BOOLEAN DEFAULT false;
    `);
    console.log(`✓ Columnas agregadas a SaleInstallment en ${name}`);

    // Verificar Business
    const bRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Business' AND column_name IN ('document', 'enableLateFee', 'lateFeePercentage');
    `);
    console.table(bRes.rows);

    // Verificar SaleInstallment
    const sRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'SaleInstallment' AND column_name IN ('lateFeeAmount', 'lateFeePercentage', 'isLateFeeApplied');
    `);
    console.table(sRes.rows);

    await client.end();
}

async function main() {
    await updateDb(DEV_URL, 'DEV');
    await updateDb(PROD_URL, 'PROD');
}

main().catch(console.error);
