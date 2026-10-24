const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function run() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();
  const roles = await c.query('SELECT id, code, name FROM "Role" ORDER BY id;');
  console.log('Roles in DB:');
  console.table(roles.rows);

  const members = await c.query(`
    SELECT bm.id, bm."businessId", b.name as "bizName", u.ci, u.name as "userName", u."isSuperAdmin", r.code as "roleCode", r.name as "roleName"
    FROM "BusinessMember" bm
    JOIN "User" u ON bm."userId" = u.id
    JOIN "Role" r ON bm."roleId" = r.id
    JOIN "Business" b ON bm."businessId" = b.id
    WHERE bm."businessId" = 73;
  `);
  console.log('Members of Business 73:');
  console.table(members.rows);

  const allMembers = await c.query(`
    SELECT r.code as "roleCode", r.name as "roleName", count(*) as total
    FROM "BusinessMember" bm
    JOIN "Role" r ON bm."roleId" = r.id
    GROUP BY r.code, r.name;
  `);
  console.log('Distribution of roles across all members:');
  console.table(allMembers.rows);

  await c.end();
}
run();
