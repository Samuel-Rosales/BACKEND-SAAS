import { Prisma, PrismaClient, SaleStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

type DbClient = Prisma.TransactionClient | PrismaClient;

export async function computeClientDebt(db: DbClient, params: { businessId: number; clientId: number }): Promise<Decimal> {
    const aggregate = await db.sale.aggregate({
        where: {
            businessId: params.businessId,
            clientId: params.clientId,
            status: SaleStatus.COMPLETED,
            deletedAt: null,
            remainingBalance: { gt: 0 }
        },
        _sum: { remainingBalance: true }
    });

    const sum = aggregate._sum.remainingBalance ?? 0;
    const debt = new Decimal(sum).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    return debt.lt(0) ? new Decimal(0) : debt;
}
