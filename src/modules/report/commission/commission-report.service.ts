import { prisma } from '@/configs';

export type CommissionReportFilter = {
    memberId?: number;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
    tzOffset?: number;
};

export class CommissionReportService {

    /**
     * Valida si el negocio cuenta con Plan PREMIUM o ENTERPRISE
     */
    async validatePremiumSubscription(businessId: number): Promise<boolean> {
        const subscription = await prisma.subscription.findUnique({
            where: { businessId },
            include: { plan: true }
        });

        return !!(subscription && (
            subscription.planType === 'PREMIUM' ||
            subscription.planType === 'ENTERPRISE' ||
            subscription.plan?.name?.toUpperCase().includes('PREMIUM') ||
            subscription.plan?.name?.toUpperCase().includes('ENTERPRISE')
        ));
    }

    /**
     * Genera el reporte consolidado de comisiones por venta
     */
    async getCommissionReport(businessId: number, filters: CommissionReportFilter) {
        try {
            // 1. Verificación estricta de Plan PREMIUM
            const isPremium = await this.validatePremiumSubscription(businessId);
            if (!isPremium) {
                return {
                    status: 403,
                    message: 'El módulo de comisiones por venta es una función exclusiva del Plan PREMIUM.',
                    data: null
                };
            }

            const page = Math.max(1, Number(filters.page) || 1);
            const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
            const skip = (page - 1) * limit;

            // 2. Construcción de rango de fechas
            let dateFilter: any = {};
            if (filters.fromDate || filters.toDate) {
                if (filters.fromDate) {
                    const from = new Date(filters.fromDate);
                    from.setHours(0, 0, 0, 0);
                    dateFilter.gte = from;
                }
                if (filters.toDate) {
                    const to = new Date(filters.toDate);
                    to.setHours(23, 59, 59, 999);
                    dateFilter.lte = to;
                }
            }

            // 3. Filtro base de ventas
            const whereClause: any = {
                businessId,
                status: { not: 'CANCELLED' }
            };

            if (Object.keys(dateFilter).length > 0) {
                whereClause.createdAt = dateFilter;
            }

            if (filters.memberId) {
                whereClause.memberId = Number(filters.memberId);
            }

            // 4. Consulta de todas las ventas del período para agregados y cálculos
            const allSales = await prisma.sale.findMany({
                where: whereClause,
                include: {
                    member: {
                        include: {
                            user: { select: { id: true, name: true, ci: true } },
                            role: { select: { code: true, name: true } }
                        }
                    },
                    client: { select: { id: true, name: true, ci: true } },
                    creditNotes: { select: { id: true, totalAmount: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            // 5. Agrupación por empleado / colaborador
            const membersMap = new Map<number, {
                memberId: number;
                userId: number;
                name: string;
                ci: string;
                roleName: string;
                configuredCommissionPct: number;
                totalInvoices: number;
                totalSalesGross: number;
                totalSalesNetBase: number;
                totalCommissionEarned: number;
                totalRefunds: number;
            }>();

            let globalTotalGross = 0;
            let globalTotalNetBase = 0;
            let globalTotalCommissions = 0;
            let globalTotalRefunds = 0;

            const processedSales = allSales.map(sale => {
                const subTotal = Number(sale.subTotal) || 0;
                const discount = Number(sale.discount) || 0;
                const totalAmount = Number(sale.totalAmount) || 0;
                const netBase = Math.max(0, subTotal - discount);

                // Cálculo de Notas de Crédito / Devoluciones
                const refunds = (sale.creditNotes || []).reduce((acc, cn) => acc + (Number(cn.totalAmount) || 0), 0);

                // Porcentaje de comisión: prioridad al snapshot de la venta, fallback al miembro
                const memberConfigPct = Number(sale.member?.commissionPercentage) || 0;
                const commissionPct = sale.commissionPercentage !== null && sale.commissionPercentage !== undefined
                    ? Number(sale.commissionPercentage)
                    : memberConfigPct;

                // Monto de comisión: prioridad al snapshot, fallback al cálculo proporcional sobre base neta ajustada
                const adjustedNetBase = Math.max(0, netBase - refunds);
                let commissionEarned = 0;
                if (sale.commissionAmount !== null && sale.commissionAmount !== undefined) {
                    commissionEarned = Number(sale.commissionAmount);
                    if (refunds > 0 && netBase > 0) {
                        // Ajustar si hubo devolución posterior
                        const refundRatio = Math.min(1, refunds / netBase);
                        commissionEarned = Number((commissionEarned * (1 - refundRatio)).toFixed(2));
                    }
                } else if (commissionPct > 0) {
                    commissionEarned = Number(((adjustedNetBase * commissionPct) / 100).toFixed(2));
                }

                // Acumulador global
                globalTotalGross += totalAmount;
                globalTotalNetBase += adjustedNetBase;
                globalTotalCommissions += commissionEarned;
                globalTotalRefunds += refunds;

                // Acumulador por empleado
                const mId = sale.memberId;
                if (!membersMap.has(mId)) {
                    membersMap.set(mId, {
                        memberId: mId,
                        userId: sale.member.userId,
                        name: sale.member.user.name,
                        ci: sale.member.user.ci,
                        roleName: sale.member.role.name,
                        configuredCommissionPct: memberConfigPct,
                        totalInvoices: 0,
                        totalSalesGross: 0,
                        totalSalesNetBase: 0,
                        totalCommissionEarned: 0,
                        totalRefunds: 0
                    });
                }

                const memberStats = membersMap.get(mId)!;
                memberStats.totalInvoices += 1;
                memberStats.totalSalesGross += totalAmount;
                memberStats.totalSalesNetBase += adjustedNetBase;
                memberStats.totalCommissionEarned += commissionEarned;
                memberStats.totalRefunds += refunds;

                return {
                    id: sale.id,
                    receiptNumber: sale.receiptNumber,
                    createdAt: sale.createdAt,
                    client: {
                        id: sale.client.id,
                        name: sale.client.name,
                        ci: sale.client.ci
                    },
                    seller: {
                        memberId: sale.memberId,
                        name: sale.member.user.name,
                        ci: sale.member.user.ci,
                        roleName: sale.member.role.name
                    },
                    conditions: sale.conditions,
                    paymentStatus: sale.paymentStatus,
                    subTotal,
                    discount,
                    taxAmount: Number(sale.taxAmount) || 0,
                    totalAmount,
                    netBase: adjustedNetBase,
                    commissionPct,
                    commissionEarned,
                    hasRefunds: refunds > 0,
                    refundAmount: refunds
                };
            });

            // 6. Lista paginada para la tabla
            const paginatedSales = processedSales.slice(skip, skip + limit);

            // 7. Lista de miembros del negocio para el selector de filtro
            const allMembers = await prisma.businessMember.findMany({
                where: { businessId, isActive: true },
                include: {
                    user: { select: { id: true, name: true, ci: true } },
                    role: { select: { name: true, code: true } }
                },
                orderBy: { user: { name: 'asc' } }
            });

            const sellersList = allMembers.map(m => ({
                id: m.id,
                userId: m.userId,
                name: m.user.name,
                ci: m.user.ci,
                roleName: m.role.name,
                commissionPercentage: Number(m.commissionPercentage) || 0
            }));

            return {
                status: 200,
                message: 'Reporte de comisiones generado exitosamente',
                data: {
                    summary: {
                        totalSalesGross: Number(globalTotalGross.toFixed(2)),
                        totalSalesNetBase: Number(globalTotalNetBase.toFixed(2)),
                        totalCommissions: Number(globalTotalCommissions.toFixed(2)),
                        totalRefunds: Number(globalTotalRefunds.toFixed(2)),
                        totalInvoices: allSales.length,
                        activeSellersCount: membersMap.size
                    },
                    membersBreakdown: Array.from(membersMap.values()).map(m => ({
                        ...m,
                        totalSalesGross: Number(m.totalSalesGross.toFixed(2)),
                        totalSalesNetBase: Number(m.totalSalesNetBase.toFixed(2)),
                        totalCommissionEarned: Number(m.totalCommissionEarned.toFixed(2)),
                        totalRefunds: Number(m.totalRefunds.toFixed(2))
                    })),
                    sales: paginatedSales,
                    sellers: sellersList,
                    pagination: {
                        page,
                        limit,
                        total: allSales.length,
                        totalPages: Math.ceil(allSales.length / limit)
                    }
                }
            };

        } catch (error) {
            console.error('Error al generar reporte de comisiones:', error);
            return {
                status: 500,
                message: 'Error interno al generar el reporte de comisiones',
                data: null
            };
        }
    }
}
