const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkBudgetPermissions() {
  const client = new Client({ connectionString: PROD_URL });
  await client.connect();

  const perms = await client.query('SELECT * FROM "Permission" WHERE module::text = \'BUDGETS\';');
  console.log('Permissions with module BUDGETS in PROD:', perms.rows);

  const rolePerms = await client.query('SELECT rp.* FROM "RolePermission" rp JOIN "Permission" p ON rp."permissionId" = p.id WHERE p.module::text = \'BUDGETS\';');
  console.log('RolePermissions with module BUDGETS in PROD:', rolePerms.rows);

  await client.end();
}

checkBudgetPermissions();
