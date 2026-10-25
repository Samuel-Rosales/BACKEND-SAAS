const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway' });

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '../prisma/migrations/20261024220000_add_inter_branch_transfers/migration.sql'), 'utf8');
  console.log('Applying migration to PROD...');
  await pool.query(sql);
  console.log('Migration executed successfully!');

  // Verify
  const businessCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Business'`);
  console.log('billingExempt exists?:', businessCols.rows.some(c => c.column_name === 'billingExempt'));
  console.log('isWarehouseHub exists?:', businessCols.rows.some(c => c.column_name === 'isWarehouseHub'));

  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  console.log('InterBranchTransfer exists?:', tables.rows.some(t => t.table_name === 'InterBranchTransfer'));
  console.log('InterBranchTransferItem exists?:', tables.rows.some(t => t.table_name === 'InterBranchTransferItem'));

  const check = await pool.query("SELECT migration_name FROM _prisma_migrations WHERE migration_name = '20261024220000_add_inter_branch_transfers'");
  if (check.rows.length === 0) {
    const crypto = require('crypto');
    await pool.query(
      'INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)',
      [crypto.randomUUID(), 'applied-manual-safe', '20261024220000_add_inter_branch_transfers']
    );
    console.log('Recorded migration in _prisma_migrations');
  } else {
    console.log('Migration already recorded in _prisma_migrations');
  }

  pool.end();
}

migrate().catch(e => { console.error('Error applying migration:', e); pool.end(); });
