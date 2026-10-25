const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected! Checking tables...');

    // List all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Tables found:', tables.filter(t => t.toLowerCase().includes('quot') || t.toLowerCase().includes('budg')));

    // Count in Quotation if exists
    if (tables.includes('Quotation')) {
      const qRes = await client.query('SELECT count(*) FROM "Quotation";');
      console.log('Rows in "Quotation":', qRes.rows[0].count);
      const sample = await client.query('SELECT id, "businessId", "receiptNumber", "totalAmount", status FROM "Quotation" LIMIT 5;');
      console.log('Sample Quotations:', sample.rows);
    } else if (tables.includes('quotation')) {
      const qRes = await client.query('SELECT count(*) FROM quotation;');
      console.log('Rows in quotation:', qRes.rows[0].count);
    }

    // Count in Budget if exists
    if (tables.includes('Budget')) {
      const bRes = await client.query('SELECT count(*) FROM "Budget";');
      console.log('Rows in "Budget":', bRes.rows[0].count);
      const sample = await client.query('SELECT id, "businessId", "budgetNumber", "totalAmount", status FROM "Budget" LIMIT 5;');
      console.log('Sample Budgets:', sample.rows);
    } else if (tables.includes('budget')) {
      const bRes = await client.query('SELECT count(*) FROM budget;');
      console.log('Rows in budget:', bRes.rows[0].count);
    }

  } catch (err) {
    console.error('Error querying database:', err.message);
  } finally {
    await client.end();
  }
}

check();
