require('dotenv').config();
process.env.DATABASE_URL = 'postgresql://postgres:EqkmojIcOrYYszDWLTTWDKEFPKPwPgvx@trolley.proxy.rlwy.net:19722/railway';

const { CollectionsReportService } = require('../src/modules/report/collections/collections-report.service');
const service = new CollectionsReportService();

async function run() {
    console.log('--- Testing CollectionsReportService with Business 46 on DEV DB ---');
    
    // 1. Overview
    const overview = await service.getOverview(46, {});
    console.log('\n[1] Overview result status:', overview.status);
    console.log('Overview data:', overview.data);

    // 2. Debtors
    const debtors = await service.getDebtors(46, { page: 1, limit: 10 });
    console.log('\n[2] Debtors result status:', debtors.status);
    console.log('Debtors count:', debtors.data?.items?.length, 'Total:', debtors.data?.pagination?.total);

    // 3. Cash Box
    const cashBox = await service.getCashBox(46, {});
    console.log('\n[3] Cash Box result status:', cashBox.status);
    console.log('Cash Box summary:', cashBox.data?.summary);
    console.log('Cash Box byChannel:', cashBox.data?.byChannel);
    console.log('Cash Box byMethod count:', cashBox.data?.byMethod?.length);

    // 4. Consolidated Income
    const consolidated = await service.getConsolidatedIncome(46, {});
    console.log('\n[4] Consolidated Income result status:', consolidated.status);
    console.log('Consolidated Income summary:', consolidated.data?.summary);
    console.log('Consolidated Income byMethod count:', consolidated.data?.byMethod?.length);
}

run().catch(console.error).finally(() => process.exit(0));
