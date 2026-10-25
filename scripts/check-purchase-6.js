const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function run() {
    const cProd = new Client({ connectionString: PROD_URL });
    await cProd.connect();
    const pays = await cProd.query(`
        SELECT pp.*, pm.name as pm_name, pm.currency
        FROM "PurchasePayment" pp
        JOIN "PaymentMethod" pm ON pp."paymentMethodId" = pm.id
        WHERE pp."purchaseId" = 184
    `);
    console.table(pays.rows);
    await cProd.end();
}
run().catch(console.error);
