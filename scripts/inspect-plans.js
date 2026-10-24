const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  console.log('=== SUSCRIPCIONES ACTIVAS POR PLAN ===');
  const subs = await c.query(`
    SELECT s."planType", sp.name as "planName", sp."priceMonthly", count(*) as "totalBusinesses"
    FROM "Subscription" s
    LEFT JOIN "SubscriptionPlan" sp ON s."planId" = sp.id
    GROUP BY s."planType", sp.name, sp."priceMonthly";
  `);
  console.log('Suscripciones activas agrupadas:', subs.rows);

  await c.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
