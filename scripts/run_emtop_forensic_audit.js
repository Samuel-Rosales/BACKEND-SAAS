const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROD_URL = 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway';
const DEV_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

async function runAudit() {
  const excelItems = JSON.parse(fs.readFileSync(path.join(__dirname, 'excel_audit_items.json'), 'utf-8'));
  console.log(`Excel audit items loaded: ${excelItems.length}`);

  const client = new Client({ connectionString: PROD_URL });
  await client.connect();

  const businessId = 63;

  // 1. Fetch Business Info
  const bizRes = await client.query('SELECT * FROM "Business" WHERE id = $1', [businessId]);
  const business = bizRes.rows[0];
  console.log(`Auditing Business: ${business.name} (ID: ${business.id})`);

  // 2. Fetch Depots
  const depotsRes = await client.query('SELECT * FROM "Depot" WHERE "businessId" = $1', [businessId]);
  const depots = depotsRes.rows;
  console.log('Depots in DB:', depots);

  // 3. Fetch DB Products
  const prodsRes = await client.query(`
    SELECT p.id, p.sku, p.name, p."costPrice", p."salePrice", p."minStock", p."isActive", p."categoryId", p.type,
           c.name as "categoryName", p."updatedAt"
    FROM "Product" p
    LEFT JOIN "Category" c ON p."categoryId" = c.id
    WHERE p."businessId" = $1
    ORDER BY p.id ASC;
  `, [businessId]);
  const dbProducts = prodsRes.rows;
  console.log(`DB Products for business ${businessId}: ${dbProducts.length}`);

  // 4. Fetch StockLot totals per product and per depot
  const lotsRes = await client.query(`
    SELECT sl."productId", sl."depotId", d.name as "depotName", SUM(sl.quantity) as "depotStock"
    FROM "StockLot" sl
    JOIN "Product" p ON sl."productId" = p.id
    LEFT JOIN "Depot" d ON sl."depotId" = d.id
    WHERE p."businessId" = $1
    GROUP BY sl."productId", sl."depotId", d.name;
  `, [businessId]);

  const stockByProduct = {};
  for (const l of lotsRes.rows) {
    if (!stockByProduct[l.productId]) {
      stockByProduct[l.productId] = { total: 0, byDepot: {} };
    }
    const qty = parseFloat(l.depotStock || 0);
    stockByProduct[l.productId].total += qty;
    stockByProduct[l.productId].byDepot[l.depotId] = {
      depotName: l.depotName,
      qty: qty
    };
  }

  // 5. Fetch Sales from 2026-10-05 onwards (Audit date)
  const salesRes = await client.query(`
    SELECT si."productId", p.sku, p.name, SUM(si.quantity) as "soldQty", COUNT(DISTINCT s.id) as "salesCount"
    FROM "SaleItem" si
    JOIN "Sale" s ON si."saleId" = s.id
    JOIN "Product" p ON si."productId" = p.id
    WHERE s."businessId" = $1 AND s."createdAt" >= '2026-10-05T00:00:00Z' AND s.status != 'CANCELLED'
    GROUP BY si."productId", p.sku, p.name;
  `, [businessId]);
  const salesByProduct = {};
  for (const s of salesRes.rows) {
    salesByProduct[s.productId] = {
      soldQty: parseFloat(s.soldQty),
      salesCount: parseInt(s.salesCount)
    };
  }

  // 6. Fetch Purchases from 2026-10-05 onwards
  const purchasesRes = await client.query(`
    SELECT pi."productId", p.sku, p.name, SUM(pi.quantity) as "purchasedQty"
    FROM "PurchaseItem" pi
    JOIN "Purchase" pu ON pi."purchaseId" = pu.id
    JOIN "Product" p ON pi."productId" = p.id
    WHERE pu."businessId" = $1 AND pu."createdAt" >= '2026-10-05T00:00:00Z'
    GROUP BY pi."productId", p.sku, p.name;
  `, [businessId]);
  const purchasesByProduct = {};
  for (const pu of purchasesRes.rows) {
    purchasesByProduct[pu.productId] = parseFloat(pu.purchasedQty);
  }

  // 7. Fetch Stock Movements from 2026-10-05 onwards
  const movementsRes = await client.query(`
    SELECT sm."productId", sm.type, SUM(sm.quantity) as "totalQty"
    FROM "StockMovement" sm
    WHERE sm."businessId" = $1 AND sm.date >= '2026-10-05T00:00:00Z'
    GROUP BY sm."productId", sm.type;
  `, [businessId]);
  const movementsByProduct = {};
  for (const m of movementsRes.rows) {
    if (!movementsByProduct[m.productId]) movementsByProduct[m.productId] = {};
    movementsByProduct[m.productId][m.type] = parseFloat(m.totalQty);
  }

  await client.end();

  // Helper maps
  const dbBySku = new Map();
  const dbByName = new Map();
  const dbById = new Map();

  for (const p of dbProducts) {
    const stockInfo = stockByProduct[p.id] || { total: 0, byDepot: {} };
    p.currentStock = stockInfo.total;
    p.stockByDepot = stockInfo.byDepot;

    dbById.set(p.id, p);
    if (p.sku) {
      const key = p.sku.trim().toUpperCase();
      if (!dbBySku.has(key)) dbBySku.set(key, []);
      dbBySku.get(key).push(p);
    }
    if (p.name) {
      const key = p.name.trim().toUpperCase();
      if (!dbByName.has(key)) dbByName.set(key, []);
      dbByName.get(key).push(p);
    }
  }

  // Check Excel duplicates
  const excelSkuCounts = {};
  for (const item of excelItems) {
    const k = item.sku.trim().toUpperCase();
    if (k) {
      excelSkuCounts[k] = (excelSkuCounts[k] || 0) + 1;
    }
  }
  const duplicateExcelSkus = Object.entries(excelSkuCounts).filter(([k, v]) => v > 1);

  // Cross match
  const matched = [];
  const missingInDb = [];
  const matchedDbProductIds = new Set();

  for (const item of excelItems) {
    const skuKey = item.sku.trim().toUpperCase();
    const nameKey = item.name.trim().toUpperCase();

    let dbMatch = null;
    let matchType = null;

    if (skuKey && dbBySku.has(skuKey)) {
      const candidates = dbBySku.get(skuKey);
      dbMatch = candidates.find(c => !matchedDbProductIds.has(c.id)) || candidates[0];
      matchType = 'SKU';
    } else if (nameKey && dbByName.has(nameKey)) {
      const candidates = dbByName.get(nameKey);
      dbMatch = candidates.find(c => !matchedDbProductIds.has(c.id)) || candidates[0];
      matchType = 'NAME';
    }

    if (dbMatch) {
      matchedDbProductIds.add(dbMatch.id);
      const dbStock = dbMatch.currentStock;
      const dbCost = parseFloat(dbMatch.costPrice || 0);
      const excelStock = item.stock;
      const excelCost = item.costPrice;

      const salesInfo = salesByProduct[dbMatch.id] || { soldQty: 0, salesCount: 0 };
      const purchasedQty = purchasesByProduct[dbMatch.id] || 0;
      const movementsInfo = movementsByProduct[dbMatch.id] || {};

      const stockDiff = dbStock - excelStock; // + means DB has more, - means DB has less
      const costDiff = dbCost - excelCost;

      matched.push({
        excelItem: item,
        dbProduct: dbMatch,
        matchType,
        excelStock,
        dbStock,
        stockDiff,
        excelCost,
        dbCost,
        costDiff,
        soldSinceAudit: salesInfo.soldQty,
        purchasedSinceAudit: purchasedQty,
        movements: movementsInfo
      });
    } else {
      missingInDb.push(item);
    }
  }

  // Surplus in DB (Products in DB not in Excel)
  const surplusInDb = dbProducts.filter(p => !matchedDbProductIds.has(p.id));

  // Analyze Stock Discrepancies
  const exactStockMatches = matched.filter(m => Math.abs(m.stockDiff) < 0.001);
  const stockDiscrepancies = matched.filter(m => Math.abs(m.stockDiff) >= 0.001);

  // Discrepancy explained by Sales:
  // If Excel had X, and since Oct 5 sold Y units, then expected DB stock is X - Y.
  // diff = dbStock - excelStock. If diff == -soldSinceAudit, it's 100% explained by sales!
  const explainedBySales = stockDiscrepancies.filter(m => {
    const expected = m.excelStock - m.soldSinceAudit + m.purchasedSinceAudit;
    return Math.abs(m.dbStock - expected) < 0.001 && (m.soldSinceAudit > 0 || m.purchasedSinceAudit > 0);
  });

  const unexplainedDiscrepancies = stockDiscrepancies.filter(m => !explainedBySales.includes(m));

  // Cost discrepancies
  const costDiscrepancies = matched.filter(m => Math.abs(m.costDiff) > 0.01);

  // Totals
  const totalExcelUnits = excelItems.reduce((acc, i) => acc + i.stock, 0);
  const totalExcelValuation = excelItems.reduce((acc, i) => acc + (i.stock * i.costPrice), 0);
  const totalExcelCostCol = excelItems.reduce((acc, i) => acc + i.costTotal, 0);

  const totalDbUnits = dbProducts.reduce((acc, p) => acc + p.currentStock, 0);
  const totalDbValuation = dbProducts.reduce((acc, p) => acc + (p.currentStock * parseFloat(p.costPrice || 0)), 0);

  const report = {
    summary: {
      businessId,
      businessName: business.name,
      totalExcelRows: excelItems.length,
      totalDbProducts: dbProducts.length,
      matchedCount: matched.length,
      missingInDbCount: missingInDb.length,
      surplusInDbCount: surplusInDb.length,
      duplicateExcelSkusCount: duplicateExcelSkus.length,
      exactStockMatchesCount: exactStockMatches.length,
      stockDiscrepanciesCount: stockDiscrepancies.length,
      explainedBySalesCount: explainedBySales.length,
      unexplainedDiscrepanciesCount: unexplainedDiscrepancies.length,
      costDiscrepanciesCount: costDiscrepancies.length,
      excelTotals: {
        units: totalExcelUnits,
        valuationCalculated: totalExcelValuation,
        valuationExcelCol: totalExcelCostCol
      },
      dbTotals: {
        units: totalDbUnits,
        valuation: totalDbValuation
      }
    },
    missingInDb,
    surplusInDb: surplusInDb.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryName: p.categoryName,
      costPrice: parseFloat(p.costPrice),
      salePrice: parseFloat(p.salePrice),
      currentStock: p.currentStock,
      stockByDepot: p.stockByDepot
    })),
    duplicateExcelSkus,
    explainedBySales: explainedBySales.map(m => ({
      sku: m.excelItem.sku,
      name: m.excelItem.name,
      excelStock: m.excelStock,
      dbStock: m.dbStock,
      soldSinceOct5: m.soldSinceAudit,
      purchasedSinceOct5: m.purchasedSinceAudit
    })),
    unexplainedDiscrepancies: unexplainedDiscrepancies.map(m => ({
      sku: m.excelItem.sku,
      name: m.excelItem.name,
      excelStock: m.excelStock,
      excelPiso: m.excelItem.pisoVenta,
      excelAlmacen: m.excelItem.almacen,
      dbStock: m.dbStock,
      stockDiff: m.stockDiff,
      soldSinceOct5: m.soldSinceAudit,
      purchasedSinceOct5: m.purchasedSinceAudit,
      movements: m.movements
    })),
    costDiscrepancies: costDiscrepancies.map(m => ({
      sku: m.excelItem.sku,
      name: m.excelItem.name,
      excelCost: m.excelCost,
      dbCost: m.dbCost,
      costDiff: m.costDiff
    }))
  };

  fs.writeFileSync(path.join(__dirname, 'emtop_audit_report.json'), JSON.stringify(report, null, 2), 'utf-8');
  console.log('=== AUDIT COMPLETE ===');
  console.log(JSON.stringify(report.summary, null, 2));
}

runAudit().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
