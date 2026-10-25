const { Client } = require('pg');
const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function main() {
  const c = new Client({ connectionString: PROD_URL });
  await c.connect();

  const regs = await c.query(`SELECT count(*) FROM "CashRegister" WHERE "businessId" = 63 AND "memberId" = 92;`);
  const purchases = await c.query(`SELECT count(*) FROM "Purchase" WHERE "businessId" = 63 AND "memberId" = 92;`);
  const moves = await c.query(`SELECT count(*) FROM "StockMovement" WHERE "businessId" = 63 AND "memberId" = 92;`);

  console.log('Actividad de memberId 92 (Antiguo Dueño):', {
    cashRegisters: regs.rows[0].count,
    purchases: purchases.rows[0].count,
    stockMovements: moves.rows[0].count
  });

  const regs82 = await c.query(`SELECT count(*) FROM "CashRegister" WHERE "businessId" = 63 AND "memberId" = 104;`);
  const sales82 = await c.query(`SELECT count(*) FROM "Sale" WHERE "businessId" = 63 AND "memberId" = 104;`);
  console.log('Actividad de memberId 104 (ARMANDO):', {
    cashRegisters: regs82.rows[0].count,
    sales: sales82.rows[0].count
  });

  await c.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
