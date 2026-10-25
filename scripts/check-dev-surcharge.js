const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function main() {
    const client = new Client({ connectionString: DEV_URL });
    await client.connect();
    const res = await client.query(`
        SELECT id, name, "enableCreditPriceSurcharge", "creditSurchargePercentage"
        FROM "Business"
        ORDER BY "updatedAt" DESC
        LIMIT 10;
    `);
    console.table(res.rows);
    await client.end();
}

main().catch(console.error);
