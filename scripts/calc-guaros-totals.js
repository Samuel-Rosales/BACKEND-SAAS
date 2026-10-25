const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function calc() {
    const c = new Client({ connectionString: PROD_URL });
    await c.connect();

    const res = await c.query(`
    SELECT p.id, p.name, c.name as category, i.quantity, p."costUsd", p."priceUsd",
           (i.quantity * COALESCE(p."costUsd", 0)) as cost_total,
           (i.quantity * COALESCE(p."priceUsd", 0)) as price_total,
           p."createdAt"
    FROM "Product" p
    JOIN "Inventory" i ON i."productId" = p.id
    LEFT JOIN "Category" c ON p."categoryId" = c.id
    WHERE p."businessId" = 56
    ORDER BY p."createdAt" ASC
  `);

    let cumCost = 0;
    let cumPrice = 0;
    console.log('--- RECONSTRUCCIÓN CRONOLÓGICA PASO A PASO (ID 56: Inversiones Los Guaros C.A 2025) ---');
    for (const r of res.rows) {
        cumCost += Number(r.cost_total);
        cumPrice += Number(r.price_total);
        console.log(`[ID ${String(r.id).padStart(2)}] ${r.name.padEnd(30)} | Cant: ${String(r.quantity).padStart(3)} | CostoU: $${String(r.costUsd).padStart(5)} | CostoTot: $${String(Number(r.cost_total).toFixed(2)).padStart(7)} | AcumCosto: $${cumCost.toFixed(2).padStart(8)} | PrecioTot: $${String(Number(r.price_total).toFixed(2)).padStart(7)} | AcumPrecio: $${cumPrice.toFixed(2).padStart(8)}`);
    }

    // Buscar también movimientos de inventario si existen
    const moves = await c.query(`
    SELECT m.id, m.type, m.quantity, m."productId", p.name as product_name, m."createdAt"
    FROM "InventoryMovement" m
    JOIN "Product" p ON m."productId" = p.id
    WHERE p."businessId" = 56
    ORDER BY m."createdAt" ASC
  `);
    console.log('\nMovimientos de inventario registrados:', moves.rows.length);

    // Buscar si hay ventas
    const sales = await c.query(`
    SELECT id, "totalAmount", "totalUsd", "createdAt"
    FROM "Sale"
    WHERE "businessId" = 56
  `);
    console.log('Ventas registradas:', sales.rows.length);

    await c.end();
}

calc().catch(console.error);
