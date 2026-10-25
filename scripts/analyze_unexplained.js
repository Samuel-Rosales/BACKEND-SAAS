const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';

async function analyzeUnexplained() {
  const rep = JSON.parse(fs.readFileSync(path.join(__dirname, 'emtop_audit_report.json'), 'utf-8'));
  const unexplained = rep.unexplainedDiscrepancies;
  console.log(`Analyzing ${unexplained.length} unexplained discrepancies...`);

  const client = new Client({ connectionString: PROD_URL });
  await client.connect();

  // Check initial lots vs excel stock
  // When were the stock lots created?
  const lotDates = await client.query(`
    SELECT DATE(sl."createdAt") as lot_date, COUNT(*) 
    FROM "StockLot" sl 
    JOIN "Product" p ON sl."productId" = p.id 
    WHERE p."businessId" = 63 
    GROUP BY DATE(sl."createdAt") 
    ORDER BY lot_date;
  `);
  console.log('StockLot creation dates in DB:', lotDates.rows);

  // Check all stock movements for business 63
  const movSummary = await client.query(`
    SELECT sm.type, COUNT(*), SUM(sm.quantity) as total_qty
    FROM "StockMovement" sm
    WHERE sm."businessId" = 63
    GROUP BY sm.type;
  `);
  console.log('StockMovement summary for Business 63:', movSummary.rows);

  // Categorize unexplained differences:
  // Is DB > Excel or DB < Excel?
  let dbMore = 0;
  let dbLess = 0;
  const bigDiffs = [];

  for (const u of unexplained) {
    const diff = parseFloat(u.stockDiff);
    if (diff > 0) dbMore++;
    else dbLess++;

    if (Math.abs(diff) >= 5) {
      bigDiffs.push(u);
    }
  }

  console.log(`DB has MORE stock than Excel: ${dbMore} products`);
  console.log(`DB has LESS stock than Excel: ${dbLess} products`);
  console.log(`Differences >= 5 units: ${bigDiffs.length}`);
  console.log('Top big differences:', bigDiffs.slice(0, 10));

  await client.end();
}

analyzeUnexplained().catch(console.error);
