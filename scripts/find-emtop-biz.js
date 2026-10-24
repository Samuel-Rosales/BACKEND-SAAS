const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function check(url, name) {
    const c = new Client({ connectionString: url });
    await c.connect();
    const res = await c.query('SELECT id, name, address, "createdAt" FROM "Business" WHERE name ILIKE \'%EMTOP%\'');
    console.log(`=== ${name} ===`);
    console.table(res.rows);
    await c.end();
}

async function main() {
    await check(DEV_URL, 'DEV');
    await check(PROD_URL, 'PROD');
}

main().catch(console.error);
