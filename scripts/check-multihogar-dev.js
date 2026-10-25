const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function main() {
    const pClient = new Client({ connectionString: PROD_URL });
    await pClient.connect();
    const pRes = await pClient.query('SELECT id, name FROM "Business" ORDER BY id DESC LIMIT 10;');
    console.log('PROD Businesses:', pRes.rows);
    await pClient.end();

    const dClient = new Client({ connectionString: DEV_URL });
    await dClient.connect();
    const dRes = await dClient.query('SELECT id, name FROM "Business" ORDER BY id DESC LIMIT 10;');
    console.log('DEV Businesses:', dRes.rows);
    await dClient.end();
}
main().catch(console.error);
