const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkUsers() {
  const cDev = new Client({ connectionString: DEV_URL });
  await cDev.connect();
  const devUsers = await cDev.query('SELECT id, name, username, "roleCode" FROM "User" LIMIT 10;');
  console.log('DEV users:', devUsers.rows);
  const devMembers = await cDev.query('SELECT id, "userId", "businessId", "roleCode" FROM "BusinessMember" WHERE "businessId" = 46 OR "userId" = 1;');
  console.log('DEV members:', devMembers.rows);
  await cDev.end();

  const cProd = new Client({ connectionString: PROD_URL });
  await cProd.connect();
  const prodUsers = await cProd.query('SELECT id, name, username, "roleCode" FROM "User" LIMIT 10;');
  console.log('PROD users:', prodUsers.rows);
  await cProd.end();
}

checkUsers();
