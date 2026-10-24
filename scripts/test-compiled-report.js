process.env.DATABASE_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

const { CollectionsReportService } = require('../dist/modules/report/collections/collections-report.service');
const service = new CollectionsReportService();

async function run() {
    console.log('--- Testing compiled CollectionsReportService on DEV DB ---');
    
    // Overview
    const overview = await service.getOverview(46, {});
    console.log('[1] Overview:', overview.status, overview.data);

    // Debtors
    const debtors = await service.getDebtors(46, { page: 1, limit: 10 });
    console.log('[2] Debtors:', debtors.status, 'Total debtors:', debtors.data?.pagination?.total);

    // Cash Box
    const cashBox = await service.getCashBox(46, {});
    console.log('[3] Cash Box summary:', cashBox.data?.summary);
    console.log('[3] Cash Box byChannel:', cashBox.data?.byChannel);
    console.log('[3] Cash Box byMethod count:', cashBox.data?.byMethod?.length);

    // Consolidated Income
    const consolidated = await service.getConsolidatedIncome(46, {});
    console.log('[4] Consolidated Income summary:', consolidated.data?.summary);
    console.log('[4] Consolidated Income byMethod count:', consolidated.data?.byMethod?.length);
}

run().catch(console.error).finally(() => process.exit(0));
