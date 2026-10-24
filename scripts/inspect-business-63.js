const { Client } = require('pg');

const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function inspect() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const businessId = 63;
  console.log(`=== Inspección Detallada Negocio ID ${businessId} ===`);

  const biz = await c.query('SELECT * FROM "Business" WHERE id = $1', [businessId]);
  console.log('Business:', biz.rows[0]);

  const prods = await c.query('SELECT count(*) FROM "Product" WHERE "businessId" = $1', [businessId]);
  console.log('Total Productos:', prods.rows[0].count);

  const lots = await c.query('SELECT count(*) FROM "StockLot" sl JOIN "Product" p ON sl."productId" = p.id WHERE p."businessId" = $1', [businessId]);
  console.log('Total StockLot:', lots.rows[0].count);

  const movs = await c.query('SELECT count(*) FROM "StockMovement" WHERE "businessId" = $1', [businessId]);
  console.log('Total StockMovement:', movs.rows[0].count);

  const saleItems = await c.query('SELECT count(*) FROM "SaleItem" si JOIN "Product" p ON si."productId" = p.id WHERE p."businessId" = $1', [businessId]);
  console.log('Total SaleItem:', saleItems.rows[0].count);

  const purchaseItems = await c.query('SELECT count(*) FROM "PurchaseItem" pi JOIN "Product" p ON pi."productId" = p.id WHERE p."businessId" = $1', [businessId]);
  console.log('Total PurchaseItem:', purchaseItems.rows[0].count);

  const quotationItems = await c.query('SELECT count(*) FROM "QuotationItem" qi JOIN "Product" p ON qi."productId" = p.id WHERE p."businessId" = $1', [businessId]);
  console.log('Total QuotationItem:', quotationItems.rows[0].count);

  const components = await c.query('SELECT count(*) FROM "ProductComponent" pc JOIN "Product" p ON pc."parentProductId" = p.id WHERE p."businessId" = $1', [businessId]);
  console.log('Total ProductComponent:', components.rows[0].count);

  const presentations = await c.query('SELECT count(*) FROM "ProductPresentation" pp JOIN "Product" p ON pp."productId" = p.id WHERE p."businessId" = $1', [businessId]);
  console.log('Total ProductPresentation:', presentations.rows[0].count);

  const saleItemLots = await c.query('SELECT count(*) FROM "SaleItemLot" sil JOIN "StockLot" sl ON sil."stockLotId" = sl.id JOIN "Product" p ON sl."productId" = p.id WHERE p."businessId" = $1', [businessId]);
  console.log('Total SaleItemLot:', saleItemLots.rows[0].count);

  const categories = await c.query('SELECT id, name FROM "Category" WHERE "businessId" = $1', [businessId]);
  console.log('Categorías creadas:', categories.rows);

  const members = await c.query(`
    SELECT bm.id, bm."userId", u.name, u.ci, r.name as role
    FROM "BusinessMember" bm
    JOIN "User" u ON bm."userId" = u.id
    LEFT JOIN "Role" r ON bm."roleId" = r.id
    WHERE bm."businessId" = $1;
  `, [businessId]);
  console.log('Miembros de Business 63:', members.rows);

  await c.end();
}

inspect();
