const { Client } = require('pg');
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function main() {
    const client = new Client({ connectionString: DEV_URL });
    await client.connect();
    let res = await client.query('SELECT id, name, type, currency, "isActive" FROM "PaymentMethod" WHERE UPPER(name) LIKE \'%CASHEA%\';');
    if (res.rows.length === 0) {
        console.log('CASHEA no existe en DEV. Insertando...');
        await client.query('INSERT INTO "PaymentMethod" (name, type, currency, "isActive") VALUES (\'CASHEA\', \'OTHER\', \'USD\', true);');
        res = await client.query('SELECT id, name, type, currency, "isActive" FROM "PaymentMethod" WHERE UPPER(name) LIKE \'%CASHEA%\';');
    }
    console.log('DEV PaymentMethod CASHEA:', res.rows);

    const activeMethods = await client.query('SELECT id, name, type, currency, "isActive" FROM "PaymentMethod" WHERE "isActive" = true;');
    console.log('Total active payment methods:', activeMethods.rows.length);
    console.log('Active payment methods names:', activeMethods.rows.map(r => r.name));

    const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';
    const prodClient = new Client({ connectionString: PROD_URL });
    await prodClient.connect();
    let prodAll = await prodClient.query('SELECT id, name, type, currency, "isActive" FROM "PaymentMethod";');
    console.log('PROD all PaymentMethods:', prodAll.rows);
    let prodRes = await prodClient.query('SELECT id, name, type, currency, "isActive" FROM "PaymentMethod" WHERE UPPER(name) LIKE \'%CASHEA%\';');
    if (prodRes.rows.length === 0) {
        console.log('CASHEA no existe en PROD. Insertando...');
        await prodClient.query('INSERT INTO "PaymentMethod" (name, type, currency, "isActive") VALUES (\'CASHEA\', \'OTHER\', \'USD\', true);');
    } else if (prodRes.rows[0].currency !== 'USD') {
        console.log('Actualizando CASHEA en PROD a USD...');
        await prodClient.query('UPDATE "PaymentMethod" SET currency = \'USD\' WHERE UPPER(name) LIKE \'%CASHEA%\';');
    }
    prodRes = await prodClient.query('SELECT id, name, type, currency, "isActive" FROM "PaymentMethod" WHERE UPPER(name) LIKE \'%CASHEA%\';');
    console.log('PROD PaymentMethod CASHEA:', prodRes.rows);
    await prodClient.end();

    await client.end();
}

main().catch(console.error);
