const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function run() {
    const cDev = new Client({ connectionString: DEV_URL });
    await cDev.connect();
    const items = await cDev.query(`
        SELECT pi.id, pi."purchaseId", pi."productId", p.name, pi.quantity, pi."unitCost", pi."depotId"
        FROM "PurchaseItem" pi
        JOIN "Product" p ON pi."productId" = p.id
        WHERE pi."purchaseId" = 58
    `);
    console.log('--- Items of Purchase 58 ---');
    console.table(items.rows);

    if (items.rows.length) {
        const prodId = items.rows[0].productId;
        const lots = await cDev.query(`
            SELECT sl.id, sl."productId", sl."depotId", sl.quantity, sl."lotCost", sl."expirationDate"
            FROM "StockLot" sl
            WHERE sl."productId" = $1
        `, [prodId]);
        console.log('--- Lots of Product ' + prodId + ' ---');
        console.table(lots.rows);

        const mvs = await cDev.query(`
            SELECT sm.id, sm.type, sm.quantity, sm."historicalCost", sm.reason, sm.date, sm."stockLotId"
            FROM "StockMovement" sm
            WHERE sm."productId" = $1
            ORDER BY sm.id DESC
            LIMIT 5
        `, [prodId]);
        console.log('--- Movements of Product ' + prodId + ' ---');
        console.table(mvs.rows);
    }
    await cDev.end();
}
run().catch(console.error);
