const { Client } = require('pg');

const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function migrateProd() {
  const client = new Client({ connectionString: PROD_URL });
  try {
    await client.connect();
    console.log('Connected to PRODUCTION database.');

    // 1. Add commissionPercentage to BusinessMember
    await client.query(`
      ALTER TABLE "BusinessMember" 
      ADD COLUMN IF NOT EXISTS "commissionPercentage" DECIMAL(5, 2) NOT NULL DEFAULT 0.00;
    `);
    console.log('Added commissionPercentage to BusinessMember in PROD.');

    // 2. Add commissionPercentage and commissionAmount to Sale
    await client.query(`
      ALTER TABLE "Sale" 
      ADD COLUMN IF NOT EXISTS "commissionPercentage" DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS "commissionAmount" DECIMAL(15, 2);
    `);
    console.log('Added commissionPercentage and commissionAmount to Sale in PROD.');

    const bmCols = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'BusinessMember' AND column_name = 'commissionPercentage';
    `);
    console.log('PROD BusinessMember commission column:', bmCols.rows);

    const saleCols = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Sale' AND column_name IN ('commissionPercentage', 'commissionAmount');
    `);
    console.log('PROD Sale commission columns:', saleCols.rows);

  } catch (err) {
    console.error('PROD Migration error:', err);
  } finally {
    await client.end();
  }
}

migrateProd();
