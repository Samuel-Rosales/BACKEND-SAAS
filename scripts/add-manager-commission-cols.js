const { Client } = require('pg');

const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function run() {
  const client = new Client({ connectionString: DEV_URL });
  try {
    await client.connect();
    console.log('Connected to DEV database.');

    // 1. Columns on Business
    await client.query(`
      ALTER TABLE "Business"
      ADD COLUMN IF NOT EXISTS "enableManagerCommission" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "managerCommissionPercentage" DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS "managerMemberId" INTEGER NULL;
    `);
    console.log('Added manager commission columns to Business.');

    // 2. Foreign key from Business to BusinessMember
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Business_managerMemberId_fkey'
          ) THEN
            ALTER TABLE "Business"
            ADD CONSTRAINT "Business_managerMemberId_fkey"
            FOREIGN KEY ("managerMemberId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      console.log('FK Business_managerMemberId_fkey checked/added.');
    } catch (e) {
      console.warn('FK Business warning:', e.message);
    }

    // 3. Columns on Sale
    await client.query(`
      ALTER TABLE "Sale"
      ADD COLUMN IF NOT EXISTS "managerCommissionPercentage" DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS "managerCommissionAmount" DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS "managerMemberId" INTEGER NULL;
    `);
    console.log('Added manager commission columns to Sale.');

    // 4. FK from Sale to BusinessMember
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Sale_managerMemberId_fkey'
          ) THEN
            ALTER TABLE "Sale"
            ADD CONSTRAINT "Sale_managerMemberId_fkey"
            FOREIGN KEY ("managerMemberId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      console.log('FK Sale_managerMemberId_fkey checked/added.');
    } catch (e) {
      console.warn('FK Sale warning:', e.message);
    }

    const bCols = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Business' AND column_name IN ('enableManagerCommission', 'managerCommissionPercentage', 'managerMemberId');
    `);
    console.log('Business manager commission columns:', bCols.rows);

    const sCols = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Sale' AND column_name IN ('managerCommissionPercentage', 'managerCommissionAmount', 'managerMemberId');
    `);
    console.log('Sale manager commission columns:', sCols.rows);

  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.end();
    console.log('Disconnected from DEV database.');
  }
}

run();
