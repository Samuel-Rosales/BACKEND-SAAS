const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkBedwin() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();
  const u = await c.query("SELECT * FROM \"User\" WHERE ci = '26554121';");
  console.log('Bedwin in PROD:', u.rows);
  if (u.rows.length > 0) {
    const mems = await c.query('SELECT bm.*, b.name as "bizName" FROM "BusinessMember" bm JOIN "Business" b ON bm."businessId" = b.id WHERE bm."userId" = $1;', [u.rows[0].id]);
    console.log('Bedwin Memberships in PROD:', mems.rows);
  }
  await c.end();
}

checkBedwin();
