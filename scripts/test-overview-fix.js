const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
    const client = new Client({ connectionString: PROD_URL });
    await client.connect();

    console.log('=== TEST OVERVIEW FIX EN PROD PARA EL 2026-10-13 ===');

    // 1. Cajas del 13 de octubre
    const registers = await client.query(`
        SELECT id FROM "CashRegister"
        WHERE "businessId" = 63 AND "openTime" >= '2026-10-13 00:00:00' AND "openTime" <= '2026-10-13 23:59:59'
    `);
    const regIds = registers.rows.map(r => r.id);
    console.log('RegIds:', regIds);

    // 2. Pagos no cancelados
    const payments = await client.query(`
        SELECT sp.id, sp.amount, er.rate, pm.name, pm.currency
        FROM "SalePayment" sp
        JOIN "Sale" s ON sp."saleId" = s.id
        JOIN "PaymentMethod" pm ON sp."paymentMethodId" = pm.id
        JOIN "ExchangeRate" er ON sp."exchangeRateId" = er.id
        WHERE sp."cashRegisterId" = ANY($1) AND s.status != 'CANCELLED'
    `, [regIds]);

    // 3. Reembolsos excluyendo ventas canceladas
    const refundsFixed = await client.query(`
        SELECT cnp.id, cnp.amount, er.rate, pm.name, pm.currency
        FROM "CreditNotePayment" cnp
        JOIN "CreditNote" cn ON cnp."creditNoteId" = cn.id
        JOIN "Sale" s ON cn."saleId" = s.id
        JOIN "PaymentMethod" pm ON cnp."paymentMethodId" = pm.id
        JOIN "ExchangeRate" er ON cnp."exchangeRateId" = er.id
        WHERE cnp."cashRegisterId" = ANY($1) AND s.status != 'CANCELLED'
    `, [regIds]);

    console.log('Reembolsos encontrados (solo de ventas no anuladas):', refundsFixed.rows.length);

    // Totalizar BNC
    let bncUSD = 0;
    let bncVES = 0;

    for (const p of payments.rows) {
        if (p.name.toLowerCase().includes('bnc')) {
            const amt = parseFloat(p.amount);
            const rate = parseFloat(p.rate);
            const amtUSD = p.currency === 'USD' ? amt : amt / rate;
            const amtVES = p.currency === 'USD' ? amt * rate : amt;
            bncUSD += amtUSD;
            bncVES += amtVES;
        }
    }

    for (const r of refundsFixed.rows) {
        if (r.name.toLowerCase().includes('bnc')) {
            const amt = parseFloat(r.amount);
            const rate = parseFloat(r.rate);
            const amtUSD = r.currency === 'USD' ? amt : amt / rate;
            const amtVES = r.currency === 'USD' ? amt * rate : amt;
            bncUSD -= amtUSD;
            bncVES -= amtVES;
        }
    }

    console.log(`BNC Neto con FIX: USD ${bncUSD.toFixed(2)} | VES ${bncVES.toFixed(2)}`);

    await client.end();
}

main().catch(console.error);
