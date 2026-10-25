const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  console.log('=== NEGOCIOS EN PLAN ENTERPRISE ===');
  const res = await c.query(`
    SELECT s.id as "subId", s."businessId", b.name as "businessName", s."planType", s."planId", s.status, s."endDate"
    FROM "Subscription" s
    JOIN "Business" b ON s."businessId" = b.id
    WHERE s."planType" = 'ENTERPRISE' OR s."planId" = 5;
  `);
  console.log('Empresas en Enterprise:', res.rows);

  console.log('=== PLANES EXISTENTES ===');
  const plans = await c.query(`SELECT id, code, name, "priceMonthly", "isActive" FROM "SubscriptionPlan" ORDER BY id;`);
  console.log('Planes:', plans.rows);

  await c.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
