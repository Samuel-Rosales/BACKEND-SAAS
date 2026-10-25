const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function findEdgar() {
  const cDev = new Client({ connectionString: DEV_URL });
  await cDev.connect();
  const devEdgar = await cDev.query("SELECT * FROM \"User\" WHERE name ILIKE '%edgar%';");
  console.log('DEV Edgar:', devEdgar.rows);
  if (devEdgar.rows.length > 0) {
    const mems = await cDev.query('SELECT m.*, b.name as "bizName" FROM "BusinessMember" m JOIN "Business" b ON m."businessId" = b.id WHERE m."userId" = $1;', [devEdgar.rows[0].id]);
    console.log('DEV Edgar Memberships:', mems.rows);
  }
  await cDev.end();

  const cProd = new Client({ connectionString: PROD_URL });
  await cProd.connect();
  const prodEdgar = await cProd.query("SELECT * FROM \"User\" WHERE name ILIKE '%edgar%';");
  console.log('PROD Edgar:', prodEdgar.rows);
  if (prodEdgar.rows.length > 0) {
    const mems = await cProd.query('SELECT m.*, b.name as "bizName" FROM "BusinessMember" m JOIN "Business" b ON m."businessId" = b.id WHERE m."userId" = $1;', [prodEdgar.rows[0].id]);
    console.log('PROD Edgar Memberships:', mems.rows);
  }
  await cProd.end();
}

findEdgar();
