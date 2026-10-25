const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function main() {
    const client = new Client({ connectionString: DEV_URL });
    await client.connect();
    const res = await client.query(`
        SELECT "businessId", count(*) as count, sum("remainingBalance") as debt
        FROM "Sale"
        WHERE conditions = 'CREDIT'
        GROUP BY "businessId";
    `);
    console.log('Credit sales on DEV by businessId:', res.rows);

    const payments = await client.query(`
        SELECT s."businessId", count(*) as payments_count, sum(p.amount) as total_paid
        FROM "SalePayment" p
        JOIN "Sale" s ON s.id = p."saleId"
        GROUP BY s."businessId";
    `);
    console.log('Payments on DEV by businessId:', payments.rows);
    await client.end();
}
main().catch(console.error);
