const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function run() {
  try {
    const d = new Client({ connectionString: DEV_URL });
    await d.connect();
    const devRes = await d.query('SELECT * FROM "SubscriptionPaymentMethod";');
    console.log('DEV SubscriptionPaymentMethod:', JSON.stringify(devRes.rows, null, 2));
    await d.end();
  } catch (err) {
    console.error('Error DEV:', err.message);
  }

  try {
    const p = new Client({ connectionString: PROD_URL });
    await p.connect();
    const prodRes = await p.query('SELECT * FROM "SubscriptionPaymentMethod";');
    console.log('PROD SubscriptionPaymentMethod:', JSON.stringify(prodRes.rows, null, 2));
    await p.end();
  } catch (err) {
    console.error('Error PROD:', err.message);
  }
}
run();
