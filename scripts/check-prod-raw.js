const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway' });

async function rawCheck() {
  const users = await pool.query(`SELECT id, name, ci FROM "User" WHERE name ILIKE '%Armando%'`);
  console.log('Armando users in PROD:', users.rows);

  const businesses = await pool.query(`SELECT id, name, document FROM "Business" WHERE name ILIKE '%EMTOP%' OR name ILIKE '%Ento%'`);
  console.log('Businesses raw in PROD:', businesses.rows);

  const members = await pool.query(`
    SELECT bm.id, bm."roleId", bm."businessId", b.name as "businessName", u.id as "userId", u.name as "userName", u.ci
    FROM "BusinessMember" bm
    JOIN "Business" b ON bm."businessId" = b.id
    JOIN "User" u ON bm."userId" = u.id
    WHERE u.id = 82
  `);
  console.log('Armando business memberships in PROD:', members.rows);

  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  const hasTransferTable = tables.rows.some(t => t.table_name === 'InterBranchTransfer');
  console.log('Has InterBranchTransfer in PROD?:', hasTransferTable);

  const businessCols = await pool.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'Business'
  `);
  console.log('Has billingExempt in Business?:', businessCols.rows.some(c => c.column_name === 'billingExempt'));
  console.log('Has isWarehouseHub in Business?:', businessCols.rows.some(c => c.column_name === 'isWarehouseHub'));

  pool.end();
}

rawCheck().catch(e => { console.error(e); pool.end(); });
