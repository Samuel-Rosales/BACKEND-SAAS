import { prisma } from '@/configs';
import { Prisma } from '@prisma/client';

interface PaginationParams {
    page?: number | string;
    limit?: number | string;
    search?: string;
}

export class DepositsReportService {

    private getPagination(page?: number | string, limit?: number | string) {
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return { page: pageNum, limit: limitNum, skip };
    }

    /**
     * GET /overview - KPIs globales de todos los depósitos
     */
    async getOverview(businessId: number) {
        try {
            const [depotCount, stockAggregates, totals] = await Promise.all([
                prisma.depot.count({
                    where: { businessId, isActive: true }
                }),

                prisma.stockLot.aggregate({
                    _sum: { quantity: true },
                    where: {
                        depot: { businessId, isActive: true },
                        quantity: { gt: 0 }
                    }
                }),

                prisma.$queryRaw<[{ total_cost: number; total_sale: number; total_products: number }]>`
                    SELECT
                        COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as total_cost,
                        COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as total_sale,
                        COUNT(DISTINCT sl."productId")::int as total_products
                    FROM "StockLot" sl
                    INNER JOIN "Product" p ON sl."productId" = p.id
                    INNER JOIN "Depot" d ON sl."depotId" = d.id
                    WHERE d."businessId" = ${businessId}
                    AND d."isActive" = true
                    AND sl.quantity > 0
                `
            ]);

            const totalStock = Number(stockAggregates._sum.quantity || 0);
            const totalCost = Number(totals[0]?.total_cost || 0);
            const totalSale = Number(totals[0]?.total_sale || 0);
            const totalProducts = Number(totals[0]?.total_products || 0);

            return {
                status: 200,
                message: 'Overview de depósitos calculado exitosamente',
                data: {
                    totalDepots: depotCount,
                    totalStock,
                    totalCost,
                    totalSale,
                    totalProducts
                }
            };

        } catch (error) {
            console.error('Error en DepositsReportService.getOverview:', error);
            return {
                status: 500,
                message: 'Error interno calculando overview de depósitos',
                data: {
                    totalDepots: 0,
                    totalStock: 0,
                    totalCost: 0,
                    totalSale: 0,
                    totalProducts: 0
                }
            };
        }
    }

    /**
     * GET / - Lista de depósitos con valorización
     */
    async getAll(businessId: number, params: PaginationParams = {}) {
        try {
            const { page, limit, skip } = this.getPagination(params.page, params.limit);
            const { search } = params;

            const searchCondition = search
                ? Prisma.sql`AND d.name ILIKE ${'%' + search + '%'}`
                : Prisma.empty;

            const [depots, total, globalTotals] = await Promise.all([
                prisma.$queryRaw<any[]>`
                    SELECT
                        d.id as "depotId",
                        d.name as "depotName",
                        d.location as "depotLocation",
                        COUNT(DISTINCT sl."productId")::int as "productCount",
                        COALESCE(SUM(sl.quantity), 0)::numeric as "totalStock",
                        COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as "totalCost",
                        COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as "totalSale"
                    FROM "Depot" d
                    LEFT JOIN "StockLot" sl ON d.id = sl."depotId" AND sl.quantity > 0
                    LEFT JOIN "Product" p ON sl."productId" = p.id
                    WHERE d."businessId" = ${businessId}
                    AND d."isActive" = true
                    ${searchCondition}
                    GROUP BY d.id, d.name, d.location
                    ORDER BY d.name ASC
                    LIMIT ${limit} OFFSET ${skip}
                `,

                prisma.$queryRaw<[{ count: number }]>`
                    SELECT COUNT(*)::int as count
                    FROM "Depot" d
                    WHERE d."businessId" = ${businessId}
                    AND d."isActive" = true
                    ${searchCondition}
                `,

                prisma.$queryRaw<[{ total_cost: number; total_sale: number; total_stock: number }]>`
                    SELECT
                        COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as total_cost,
                        COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as total_sale,
                        COALESCE(SUM(sl.quantity), 0)::numeric as total_stock
                    FROM "StockLot" sl
                    INNER JOIN "Product" p ON sl."productId" = p.id
                    INNER JOIN "Depot" d ON sl."depotId" = d.id
                    WHERE d."businessId" = ${businessId}
                    AND d."isActive" = true
                    AND sl.quantity > 0
                `
            ]);

            const data = depots.map((depot: any) => ({
                id: Number(depot.depotId),
                name: depot.depotName,
                location: depot.depotLocation,
                productCount: Number(depot.productCount),
                totalStock: Number(depot.totalStock),
                totalCost: Number(depot.totalCost),
                totalSale: Number(depot.totalSale)
            }));

            return {
                status: 200,
                message: 'Lista de depósitos obtenida',
                data,
                pagination: {
                    page,
                    limit,
                    total: Number(total[0]?.count || 0),
                    totalPages: Math.ceil(Number(total[0]?.count || 0) / limit)
                },
                globalTotals: {
                    totalCost: Number(globalTotals[0]?.total_cost || 0),
                    totalSale: Number(globalTotals[0]?.total_sale || 0),
                    totalStock: Number(globalTotals[0]?.total_stock || 0)
                }
            };

        } catch (error) {
            console.error('Error en DepositsReportService.getAll:', error);
            return {
                status: 500,
                message: 'Error interno obteniendo lista de depósitos',
                data: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
                globalTotals: { totalCost: 0, totalSale: 0, totalStock: 0 }
            };
        }
    }

    /**
     * GET /:id - Detalle de un depósito (productos con lotes + movimientos recientes)
     */
    async getById(businessId: number, depotId: number) {
        try {
            const depot = await prisma.depot.findFirst({
                where: { id: depotId, businessId, isActive: true },
                select: { id: true, name: true, location: true }
            });

            if (!depot) {
                return { status: 404, message: 'Depósito no encontrado', data: null };
            }

            const [products, lots, recentMovements] = await Promise.all([
                prisma.$queryRaw<any[]>`
                    SELECT
                        p.id as "productId",
                        p.name as "productName",
                        p.sku,
                        c.name as "categoryName",
                        u.symbol as "unitSymbol",
                        p."costPrice",
                        p."salePrice",
                        COALESCE(SUM(sl.quantity), 0)::numeric as "currentStock",
                        COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as "totalCost",
                        COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as "totalSale"
                    FROM "StockLot" sl
                    INNER JOIN "Product" p ON sl."productId" = p.id
                    INNER JOIN "Category" c ON p."categoryId" = c.id
                    INNER JOIN "MeasurementUnit" u ON p."unitId" = u.id
                    WHERE sl."depotId" = ${depotId}
                    AND sl.quantity > 0
                    GROUP BY p.id, p.name, p.sku, c.name, u.symbol, p."costPrice", p."salePrice"
                    ORDER BY p.name ASC
                `,

                prisma.$queryRaw<any[]>`
                    SELECT
                        sl.id as "lotId",
                        sl."productId",
                        sl.quantity,
                        sl."lotCost",
                        sl."expirationDate",
                        p.name as "productName",
                        p.sku
                    FROM "StockLot" sl
                    INNER JOIN "Product" p ON sl."productId" = p.id
                    WHERE sl."depotId" = ${depotId}
                    AND sl.quantity > 0
                    ORDER BY p.name ASC, sl."expirationDate" ASC
                `,

                prisma.$queryRaw<any[]>`
                    SELECT
                        sm.id,
                        sm.type,
                        sm.quantity,
                        sm."historicalCost",
                        sm.reason,
                        sm.date,
                        p.name as "productName",
                        p.sku,
                        u.name as "memberName"
                    FROM "StockMovement" sm
                    INNER JOIN "Product" p ON sm."productId" = p.id
                    INNER JOIN "BusinessMember" bm ON sm."memberId" = bm.id
                    INNER JOIN "User" u ON bm."userId" = u.id
                    WHERE sm."depotId" = ${depotId}
                    ORDER BY sm.date DESC
                    LIMIT 20
                `
            ]);

            const lotsByProduct = new Map<number, any[]>();
            lots.forEach((lot: any) => {
                const pid = Number(lot.productId);
                if (!lotsByProduct.has(pid)) lotsByProduct.set(pid, []);
                lotsByProduct.get(pid)!.push({
                    id: Number(lot.lotId),
                    quantity: Number(lot.quantity),
                    lotCost: Number(lot.lotCost),
                    expirationDate: lot.expirationDate,
                    totalCost: Number(lot.quantity) * Number(lot.lotCost)
                });
            });

            const productsData = products.map((p: any) => {
                const pid = Number(p.productId);
                return {
                    id: pid,
                    name: p.productName,
                    sku: p.sku,
                    category: p.categoryName,
                    unit: p.unitSymbol,
                    costPrice: Number(p.costPrice),
                    salePrice: Number(p.salePrice),
                    currentStock: Number(p.currentStock),
                    totalCost: Number(p.totalCost),
                    totalSale: Number(p.totalSale),
                    lots: lotsByProduct.get(pid) || []
                };
            });

            const movementsData = recentMovements.map((m: any) => ({
                id: Number(m.id),
                type: m.type,
                productName: m.productName,
                sku: m.sku,
                quantity: Number(m.quantity),
                historicalCost: Number(m.historicalCost),
                reason: m.reason,
                date: m.date,
                memberName: m.memberName
            }));

            return {
                status: 200,
                message: 'Detalle de depósito obtenido',
                data: {
                    depot,
                    products: productsData,
                    recentMovements: movementsData
                }
            };

        } catch (error) {
            console.error('Error en DepositsReportService.getById:', error);
            return {
                status: 500,
                message: 'Error interno obteniendo detalle del depósito',
                data: null
            };
        }
    }

    /**
     * GET /pdf - Data para el PDF del reporte de depósitos
     */
    async getPDFData(businessId: number) {
        try {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { name: true, logoUrl: true }
            });

            if (!business) {
                return { status: 404, message: 'Negocio no encontrado', data: null };
            }

            const depotsRaw = await prisma.depot.findMany({
                where: { businessId, isActive: true },
                orderBy: { name: 'asc' },
                select: { id: true, name: true, location: true }
            });

            const depots = await Promise.all(depotsRaw.map(async (depot) => {
                const [products, lots] = await Promise.all([
                    prisma.$queryRaw<any[]>`
                        SELECT
                            p.id as "productId",
                            p.name as "productName",
                            p.sku,
                            c.name as "categoryName",
                            u.symbol as "unitSymbol",
                            p."costPrice",
                            p."salePrice",
                            COALESCE(SUM(sl.quantity), 0)::numeric as "currentStock",
                            COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as "totalCost",
                            COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as "totalSale"
                        FROM "StockLot" sl
                        INNER JOIN "Product" p ON sl."productId" = p.id
                        INNER JOIN "Category" c ON p."categoryId" = c.id
                        INNER JOIN "MeasurementUnit" u ON p."unitId" = u.id
                        WHERE sl."depotId" = ${depot.id}
                        AND sl.quantity > 0
                        GROUP BY p.id, p.name, p.sku, c.name, u.symbol, p."costPrice", p."salePrice"
                        ORDER BY p.name ASC
                    `,

                    prisma.$queryRaw<any[]>`
                        SELECT
                            sl.id as "lotId",
                            sl."productId",
                            sl.quantity,
                            sl."lotCost",
                            sl."expirationDate"
                        FROM "StockLot" sl
                        WHERE sl."depotId" = ${depot.id}
                        AND sl.quantity > 0
                        ORDER BY sl."productId" ASC, sl."expirationDate" ASC
                    `
                ]);

                const lotsByProduct = new Map<number, any[]>();
                lots.forEach((lot: any) => {
                    const pid = Number(lot.productId);
                    if (!lotsByProduct.has(pid)) lotsByProduct.set(pid, []);
                    lotsByProduct.get(pid)!.push({
                        id: Number(lot.lotId),
                        quantity: Number(lot.quantity),
                        lotCost: Number(lot.lotCost),
                        expirationDate: lot.expirationDate,
                        totalCost: Number(lot.quantity) * Number(lot.lotCost)
                    });
                });

                const productsData = products.map((p: any) => {
                    const pid = Number(p.productId);
                    return {
                        id: pid,
                        name: p.productName,
                        sku: p.sku,
                        category: p.categoryName,
                        unit: p.unitSymbol,
                        costPrice: Number(p.costPrice),
                        salePrice: Number(p.salePrice),
                        currentStock: Number(p.currentStock),
                        totalCost: Number(p.totalCost),
                        totalSale: Number(p.totalSale),
                        lots: lotsByProduct.get(pid) || []
                    };
                });

                const subtotalStock = productsData.reduce((s, p) => s + p.currentStock, 0);
                const subtotalCost = productsData.reduce((s, p) => s + p.totalCost, 0);
                const subtotalSale = productsData.reduce((s, p) => s + p.totalSale, 0);

                return {
                    id: depot.id,
                    name: depot.name,
                    location: depot.location,
                    products: productsData,
                    subtotalStock,
                    subtotalCost,
                    subtotalSale
                };
            }));

            const grandTotals = {
                totalDepots: depots.length,
                totalStock: depots.reduce((s, d) => s + d.subtotalStock, 0),
                totalCost: depots.reduce((s, d) => s + d.subtotalCost, 0),
                totalSale: depots.reduce((s, d) => s + d.subtotalSale, 0)
            };

            return {
                status: 200,
                message: 'Data para PDF de depósitos obtenida',
                data: {
                    businessName: business.name,
                    logoUrl: business.logoUrl,
                    date: new Date().toLocaleDateString('es-VE'),
                    depots,
                    grandTotals
                }
            };

        } catch (error) {
            console.error('Error en DepositsReportService.getPDFData:', error);
            return {
                status: 500,
                message: 'Error interno obteniendo data para PDF de depósitos',
                data: null
            };
        }
    }
}
