const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function getDevQuoteDetails() {
  const c = new Client({ connectionString: DEV_URL });
  await c.connect();

  const q = await c.query(`
    SELECT q.*, c.name as "clientName", c.ci as "clientCi", b.name as "bizName", u.name as "userName"
    FROM "Quotation" q
    LEFT JOIN "Client" c ON q."clientId" = c.id
    LEFT JOIN "Business" b ON q."businessId" = b.id
    LEFT JOIN "BusinessMember" bm ON q."memberId" = bm.id
    LEFT JOIN "User" u ON bm."userId" = u.id
    WHERE q.id = 1;
  `);
  console.log('Quotation 1:', q.rows[0]);

  const items = await c.query(`
    SELECT qi.*, p.name as "prodName", p.sku
    FROM "QuotationItem" qi
    LEFT JOIN "Product" p ON qi."productId" = p.id
    WHERE qi."quotationId" = 1;
  `);
  console.log('Quotation 1 items:', items.rows);

  await c.end();
}

getDevQuoteDetails();
