const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function migrateDev() {
  const client = new Client({ connectionString: DEV_URL });
  try {
    await client.connect();
    console.log('Connected to DEV database.');

    // 1. Add commissionPercentage to BusinessMember
    await client.query(`
      ALTER TABLE "BusinessMember" 
      ADD COLUMN IF NOT EXISTS "commissionPercentage" DECIMAL(5, 2) NOT NULL DEFAULT 0.00;
    `);
    console.log('Added commissionPercentage to BusinessMember.');

    // 2. Add commissionPercentage and commissionAmount to Sale
    await client.query(`
      ALTER TABLE "Sale" 
      ADD COLUMN IF NOT EXISTS "commissionPercentage" DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS "commissionAmount" DECIMAL(15, 2);
    `);
    console.log('Added commissionPercentage and commissionAmount to Sale.');

    const bmCols = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'BusinessMember' AND column_name = 'commissionPercentage';
    `);
    console.log('BusinessMember commission column:', bmCols.rows);

    const saleCols = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Sale' AND column_name IN ('commissionPercentage', 'commissionAmount');
    `);
    console.log('Sale commission columns:', saleCols.rows);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrateDev();
