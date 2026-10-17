import { prisma } from '@/configs';

export interface BusinessAiUsageInfo {
    allowed: boolean;
    usedThisMonth: number;
    monthlyLimit: number;
    remaining: number;
    periodMonth: string;
}

export class AiUsageService {
    private getCurrentPeriodMonth(tzOffset: number = 240): string {
        const local = new Date(Date.now() - (tzOffset * 60_000));
        return local.toISOString().slice(0, 7); // "YYYY-MM"
    }

    async getUsage(businessId: number, tzOffset: number = 240): Promise<BusinessAiUsageInfo> {
        const periodMonth = this.getCurrentPeriodMonth(tzOffset);

        let record = await prisma.businessAiUsage.findUnique({
            where: {
                businessId_periodMonth: {
                    businessId,
                    periodMonth
                }
            }
        });

        if (!record) {
            // Límite por defecto: 100 consultas mensuales
            record = await prisma.businessAiUsage.create({
                data: {
                    businessId,
                    periodMonth,
                    queryCount: 0,
                    monthlyLimit: 100
                }
            });
        }

        const isUnlimited = record.monthlyLimit === -1;
        const allowed = isUnlimited || record.queryCount < record.monthlyLimit;
        const remaining = isUnlimited ? 999999 : Math.max(0, record.monthlyLimit - record.queryCount);

        return {
            allowed,
            usedThisMonth: record.queryCount,
            monthlyLimit: record.monthlyLimit,
            remaining,
            periodMonth
        };
    }

    async checkAndIncrementUsage(businessId: number, tzOffset: number = 240): Promise<BusinessAiUsageInfo> {
        const periodMonth = this.getCurrentPeriodMonth(tzOffset);

        let record = await prisma.businessAiUsage.findUnique({
            where: {
                businessId_periodMonth: {
                    businessId,
                    periodMonth
                }
            }
        });

        if (!record) {
            record = await prisma.businessAiUsage.create({
                data: {
                    businessId,
                    periodMonth,
                    queryCount: 0,
                    monthlyLimit: 100
                }
            });
        }

        const isUnlimited = record.monthlyLimit === -1;

        if (!isUnlimited && record.queryCount >= record.monthlyLimit) {
            return {
                allowed: false,
                usedThisMonth: record.queryCount,
                monthlyLimit: record.monthlyLimit,
                remaining: 0,
                periodMonth
            };
        }

        // Incrementar uso
        const updated = await prisma.businessAiUsage.update({
            where: { id: record.id },
            data: {
                queryCount: { increment: 1 }
            }
        });

        const newRemaining = isUnlimited ? 999999 : Math.max(0, updated.monthlyLimit - updated.queryCount);

        return {
            allowed: true,
            usedThisMonth: updated.queryCount,
            monthlyLimit: updated.monthlyLimit,
            remaining: newRemaining,
            periodMonth
        };
    }
}
