const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const biz = await c.query(`
    SELECT b.id, b.name, b.address, b."createdAt"
    FROM "Business" b
    WHERE b.id = 63;
  `);
  console.log('Business 63:', biz.rows[0]);

  const members = await c.query(`
    SELECT bm.id as "memberId", bm."businessId", bm."userId", bm."roleId", bm."isActive", bm."joinedAt",
           r.code as "roleCode", r.name as "roleName",
           u.id as "userId", u.name as "userName", u.ci as "userCi",
           uc.email as "userEmail", uc.phone as "userPhone"
    FROM "BusinessMember" bm
    JOIN "Role" r ON bm."roleId" = r.id
    JOIN "User" u ON bm."userId" = u.id
    LEFT JOIN "UserContact" uc ON uc."userId" = u.id
    WHERE bm."businessId" = 63
    ORDER BY bm.id;
  `);
  console.log('Members of Business 63 (EMTOP SHOP 2025 C.A.):', members.rows);

  await c.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
