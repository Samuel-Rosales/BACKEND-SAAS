const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function syncProd() {
  const p = new Client({ connectionString: PROD_URL });
  await p.connect();

  const updateQuery = `
    UPDATE "SubscriptionPaymentMethod"
    SET 
      name = 'Pago Móvil Banco del Tesoro',
      type = 'MOBILE_PAYMENT',
      "isActive" = true,
      currency = 'VES',
      details = $1,
      "updatedAt" = NOW()
    WHERE id = 1
    RETURNING *;
  `;

  const details = {
    ci: "26554121",
    bank: "Banco del Tesoro (0163)",
    phone: "04129278135",
    instructions: "Realiza tu Pago Móvil al Banco del Tesoro con los datos indicados y reporta los últimos 6 dígitos de la referencia para activación automática inmediata.",
    accountHolder: "Bedwin Gutiérrez"
  };

  const res = await p.query(updateQuery, [JSON.stringify(details)]);
  console.log('Updated PROD SubscriptionPaymentMethod:', JSON.stringify(res.rows[0], null, 2));

  await p.end();
}

syncProd().catch(console.error);
