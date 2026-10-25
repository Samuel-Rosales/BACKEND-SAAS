const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
    const client = new Client({ connectionString: PROD_URL });
    await client.connect();

    console.log('=== CAJAS DEL NEGOCIO 63 (EMTOP) EN 2026-10-13 ===');
    const registers = await client.query(`
        SELECT cr.id, cr.status, cr."openTime", cr."closeTime", cr."initialAmount", cr."finalAmount",
               cr."memberId", u.name as cashier
        FROM "CashRegister" cr
        JOIN "BusinessMember" bm ON cr."memberId" = bm.id
        JOIN "User" u ON bm."userId" = u.id
        WHERE cr."businessId" = 63 AND cr."openTime" >= '2026-10-13 00:00:00' AND cr."openTime" <= '2026-10-13 23:59:59'
        ORDER BY cr.id ASC
    `);
    console.table(registers.rows);

    const regIds = registers.rows.map(r => r.id);

    console.log('\n=== PAGOS NO CANCELADOS EN ESAS CAJAS ===');
    const activePayments = await client.query(`
        SELECT sp."cashRegisterId", pm.name as method, COUNT(*), SUM(sp.amount) as total_ves
        FROM "SalePayment" sp
        JOIN "Sale" s ON sp."saleId" = s.id
        JOIN "PaymentMethod" pm ON sp."paymentMethodId" = pm.id
        WHERE sp."cashRegisterId" = ANY($1) AND s.status != 'CANCELLED'
        GROUP BY sp."cashRegisterId", pm.name
    `, [regIds]);
    console.table(activePayments.rows);

    console.log('\n=== TODOS LOS PAGOS (INCLUYENDO CANCELADOS) EN ESAS CAJAS ===');
    const allPayments = await client.query(`
        SELECT sp."cashRegisterId", s.status, pm.name as method, COUNT(*), SUM(sp.amount) as total_ves
        FROM "SalePayment" sp
        JOIN "Sale" s ON sp."saleId" = s.id
        JOIN "PaymentMethod" pm ON sp."paymentMethodId" = pm.id
        WHERE sp."cashRegisterId" = ANY($1)
        GROUP BY sp."cashRegisterId", s.status, pm.name
    `, [regIds]);
    console.table(allPayments.rows);

    console.log('\n=== REEMBOLSOS (CreditNotePayment) EN ESAS CAJAS ===');
    const allRefunds = await client.query(`
        SELECT cnp."cashRegisterId", pm.name as method, COUNT(*), SUM(cnp.amount) as total_ves
        FROM "CreditNotePayment" cnp
        JOIN "PaymentMethod" pm ON cnp."paymentMethodId" = pm.id
        WHERE cnp."cashRegisterId" = ANY($1)
        GROUP BY cnp."cashRegisterId", pm.name
    `, [regIds]);
    console.table(allRefunds.rows);

    await client.end();
}

main().catch(console.error);
