const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function run() {
    const c = new Client({ connectionString: PROD_URL });
    await c.connect();
    const rates = await c.query(`
        SELECT id, "businessId", rate, source, "isActive", "createdAt"
        FROM "ExchangeRate"
        ORDER BY id DESC
        LIMIT 5
    `);
    console.table(rates.rows);
    await c.end();
}
run().catch(console.error);
