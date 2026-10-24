const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const prices = await c.query(`
    SELECT spp.id, spp."planId", sp.name as "planName", sp.code, spp.months, spp.price, spp."isActive"
    FROM "SubscriptionPlanPrice" spp
    JOIN "SubscriptionPlan" sp ON spp."planId" = sp.id
    ORDER BY sp.id, spp.months;
  `);
  console.log('Precios configurados por meses:', prices.rows);

  await c.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
