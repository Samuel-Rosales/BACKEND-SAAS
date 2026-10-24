const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
    const c = new Client({ connectionString: PROD_URL });
    await c.connect();

    console.log('--- ÚLTIMAS 15 COMPRAS REGISTRADAS EN PRODUCCIÓN ---');
    const res = await c.query(`
        SELECT p.id, p."businessId", b.name as business_name, p.reference, p."totalCost", p."remainingBalance", 
               p.status, p."paymentStatus", p.conditions, p."createdAt"
        FROM "Purchase" p
        JOIN "Business" b ON p."businessId" = b.id
        ORDER BY p."createdAt" DESC
        LIMIT 15
    `);
    console.table(res.rows);

    // Si hay compras, mostrar items de las 3 últimas
    if (res.rows.length > 0) {
        const topIds = res.rows.slice(0, 3).map(r => r.id);
        const items = await c.query(`
            SELECT pi."purchaseId", pi."productId", pr.name as product_name, pi.quantity, pi."unitCost", pi."totalCost"
            FROM "PurchaseItem" pi
            JOIN "Product" pr ON pi."productId" = pr.id
            WHERE pi."purchaseId" = ANY($1)
            ORDER BY pi."purchaseId" DESC
        `, [topIds]);
        console.log('\n--- DETALLE DE ITEMS DE LAS ÚLTIMAS COMPRAS ---');
        console.table(items.rows);
    }

    await c.end();
}

main().catch(console.error);
