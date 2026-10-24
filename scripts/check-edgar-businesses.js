const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkBusinesses() {
  const cDev = new Client({ connectionString: DEV_URL });
  await cDev.connect();
  const devEdgar = await cDev.query("SELECT * FROM \"User\" WHERE ci = '31366298';");
  console.log('DEV Edgar User ID:', devEdgar.rows[0].id);
  const devMembers = await cDev.query(`
    SELECT bm.id as "memberId", bm."businessId", b.name as "businessName" 
    FROM "BusinessMember" bm 
    JOIN "Business" b ON bm."businessId" = b.id 
    WHERE bm."userId" = $1;
  `, [devEdgar.rows[0].id]);
  console.log('DEV Edgar Businesses:', devMembers.rows);
  await cDev.end();

  const cProd = new Client({ connectionString: PROD_URL });
  await cProd.connect();
  const prodEdgar = await cProd.query("SELECT * FROM \"User\" WHERE ci = '31366298';");
  console.log('PROD Edgar User ID:', prodEdgar.rows[0]?.id);
  if (prodEdgar.rows.length > 0) {
    const prodMembers = await cProd.query(`
      SELECT bm.id as "memberId", bm."businessId", b.name as "businessName" 
      FROM "BusinessMember" bm 
      JOIN "Business" b ON bm."businessId" = b.id 
      WHERE bm."userId" = $1;
    `, [prodEdgar.rows[0].id]);
    console.log('PROD Edgar Businesses:', prodMembers.rows);
  }
  await cProd.end();
}

checkBusinesses();
