const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function main() {
    const client = new Client({ connectionString: DEV_URL });
    await client.connect();

    console.log('>>> Creando tabla BusinessAiUsage en DEV si no existe...');
    await client.query(`
        CREATE TABLE IF NOT EXISTS "BusinessAiUsage" (
            "id" SERIAL PRIMARY KEY,
            "businessId" INTEGER NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
            "periodMonth" VARCHAR(7) NOT NULL,
            "queryCount" INTEGER NOT NULL DEFAULT 0,
            "monthlyLimit" INTEGER NOT NULL DEFAULT 100,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "BusinessAiUsage_businessId_periodMonth_key" UNIQUE ("businessId", "periodMonth")
        );
        CREATE INDEX IF NOT EXISTS "BusinessAiUsage_businessId_periodMonth_idx" ON "BusinessAiUsage"("businessId", "periodMonth");
    `);

    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'BusinessAiUsage';
    `);
    console.table(res.rows);

    await client.end();
}

main().catch(console.error);
