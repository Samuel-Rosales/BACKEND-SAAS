const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function checkBedwin() {
    const c = new Client({ connectionString: PROD_URL });
    await c.connect();

    // 1. Ver compras de Bedwin
    const purchases = await c.query(`
        SELECT p.id, p.reference, p."totalCost", p.status, p."createdAt",
               json_agg(json_build_object(
                   'productId', pi."productId",
                   'productName', pr.name,
                   'quantity', pi.quantity,
                   'unitCost', pi."unitCost",
                   'totalCost', pi."totalCost"
               )) as items
        FROM "Purchase" p
        JOIN "PurchaseItem" pi ON pi."purchaseId" = p.id
        JOIN "Product" pr ON pi."productId" = pr.id
        WHERE p."businessId" = 70
        GROUP BY p.id, p.reference, p."totalCost", p.status, p."createdAt"
        ORDER BY p.id DESC
    `);
    console.log('--- COMPRAS EN BEDWIN IMPORT (Business ID 70) ---');
    console.dir(purchases.rows, { depth: null });

    // 2. Ver stock actual y lotes de esos productos
    const stock = await c.query(`
        SELECT p.id, p.name, i.quantity as stock_actual,
               COALESCE((
                   SELECT json_agg(json_build_object('lotId', sl.id, 'qty', sl.quantity, 'cost', sl."lotCost"))
                   FROM "StockLot" sl WHERE sl."productId" = p.id AND sl."businessId" = 70
               ), '[]'::json) as lotes
        FROM "Product" p
        LEFT JOIN "Inventory" i ON i."productId" = p.id AND i."businessId" = 70
        WHERE p."businessId" = 70
    `);
    console.log('\n--- STOCK ACTUAL Y LOTES ---');
    console.dir(stock.rows, { depth: null });

    // 3. Ver ventas de esos productos
    const sales = await c.query(`
        SELECT s.id as sale_id, s."createdAt", si."productId", pr.name as product_name, si.quantity, si."unitPrice", si."totalPrice"
        FROM "Sale" s
        JOIN "SaleItem" si ON si."saleId" = s.id
        JOIN "Product" pr ON si."productId" = pr.id
        WHERE s."businessId" = 70
        ORDER BY s."createdAt" DESC
        LIMIT 10
    `);
    console.log('\n--- ÚLTIMAS VENTAS EN BEDWIN ---');
    console.table(sales.rows);

    await c.end();
}

checkBedwin().catch(console.error);
