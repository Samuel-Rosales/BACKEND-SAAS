const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function main() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();

  const biz = await c.query(`SELECT id, name FROM "Business" WHERE name ILIKE '%EMTOP%';`);
  console.log('DEV EMTOP Businesses:', biz.rows);

  for (const b of biz.rows) {
    const members = await c.query(`
      SELECT bm.id, bm."businessId", bm."userId", bm."roleId", bm."isActive", r.code, u.name, u.ci
      FROM "BusinessMember" bm
      JOIN "Role" r ON bm."roleId" = r.id
      JOIN "User" u ON bm."userId" = u.id
      WHERE bm."businessId" = $1;
    `, [b.id]);
    console.log(`Members in DEV for Business ${b.id}:`, members.rows);
  }

  await c.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
