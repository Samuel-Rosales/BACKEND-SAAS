const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkQuotations() {
  const client = new Client({ connectionString: PROD_URL });
  try {
    await client.connect();
    
    // Check columns of quotations
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'quotations';
    `);
    console.log('Columns of quotations:', cols.rows);

    const count = await client.query('SELECT count(*) FROM quotations;');
    console.log('Total rows in quotations:', count.rows[0].count);

    const rows = await client.query('SELECT * FROM quotations ORDER BY id DESC LIMIT 10;');
    console.log('Rows in quotations:', rows.rows);

    const itemsCount = await client.query('SELECT count(*) FROM quotation_items;');
    console.log('Total rows in quotation_items:', itemsCount.rows[0].count);

    const itemRows = await client.query('SELECT * FROM quotation_items LIMIT 5;');
    console.log('Rows in quotation_items:', itemRows.rows);

  } finally {
    await client.end();
  }
}

checkQuotations();
