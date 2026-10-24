const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function main() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();

  console.log('=== DEV PLANES DE SUSCRIPCIÓN ===');
  const plans = await c.query(`SELECT id, code, name, "priceMonthly", "isActive" FROM "SubscriptionPlan" ORDER BY id;`);
  console.log('DEV Planes:', plans.rows);

  const res = await c.query(`
    SELECT s.id as "subId", s."businessId", b.name as "businessName", s."planType", s."planId", s.status
    FROM "Subscription" s
    JOIN "Business" b ON s."businessId" = b.id
    WHERE s."planType" = 'ENTERPRISE' OR s."planId" = 5;
  `);
  console.log('DEV Empresas en Enterprise:', res.rows);

  await c.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
