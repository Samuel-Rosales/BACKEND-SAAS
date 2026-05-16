import { prisma } from '@/configs';
import { ProductType, Prisma } from '@prisma/client';

interface PaginationParams {
    page?: number | string;
    limit?: number | string;
    search?: string;
}

interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export class InventoryReportService {

    private getPagination(page?: number | string, limit?: number | string) {
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return { page: pageNum, limit: limitNum, skip };
    }

    /**
     * GET /overview - KPIs principales del inventario
     */
    async getOverview(businessId: number, params: PaginationParams = {}) {
        try {
            const { search } = params;

            const whereClause = {
                businessId,
                type: ProductType.SIMPLE,
                isActive: true,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                        { sku: { contains: search, mode: 'insensitive' as const } },
                    ]
                })
            };

            const [stockAggregates, productCount, categoryCount, criticalStock, totalStockCostResult, totalStockSaleResult] = await Promise.all([
                prisma.stockLot.aggregate({
                    _sum: { quantity: true },
                    where: {
                        product: { businessId, type: ProductType.SIMPLE, isActive: true },
                        quantity: { gt: 0 }
                    }
                }),

                prisma.product.count({ where: whereClause }),

                prisma.category.count({ where: { businessId, isActive: true } }),

                prisma.$queryRaw<[{ count: number }]>`
                    SELECT COUNT(*)::int as count
                    FROM "Product" p
                    LEFT JOIN (
                        SELECT "productId", SUM(quantity) as total_qty
                        FROM "StockLot"
                        WHERE quantity > 0
                        GROUP BY "productId"
                    ) sl ON p.id = sl."productId"
                    WHERE p."businessId" = ${businessId}
                    AND p."type" = ${ProductType.SIMPLE}
                    AND p."isActive" = true
                    AND COALESCE(sl.total_qty, 0) <= p."minStock"
                `,

                prisma.$queryRaw<[{ total_cost: number }]>`
                    SELECT COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as total_cost
                    FROM "StockLot" sl
                    INNER JOIN "Product" p ON sl."productId" = p.id
                    WHERE p."businessId" = ${businessId}
                    AND p."type" = ${ProductType.SIMPLE}
                    AND p."isActive" = true
                    AND sl.quantity > 0
                `,

                prisma.$queryRaw<[{ total_sale: number }]>`
                    SELECT COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as total_sale
                    FROM "StockLot" sl
                    INNER JOIN "Product" p ON sl."productId" = p.id
                    WHERE p."businessId" = ${businessId}
                    AND p."type" = ${ProductType.SIMPLE}
                    AND p."isActive" = true
                    AND sl.quantity > 0
                `
            ]);

            console.log(stockAggregates);

            const totalStock = Number(stockAggregates._sum.quantity || 0);
            const totalStockCost = Number(totalStockCostResult[0]?.total_cost || 0);
            const totalStockSale = Number(totalStockSaleResult[0]?.total_sale || 0);

            return {
                status: 200,
                message: 'Overview de inventario calculado exitosamente',
                data: {
                    totalStockCost,
                    totalStockSale,
                    productsBelowMin: criticalStock[0]?.count || 0,
                    totalCategories: categoryCount,
                    totalProducts: productCount,
                    totalStock
                }
            };

        } catch (error) {
            console.error('Error en InventoryReportService.getOverview:', error);
            return {
                status: 500,
                message: 'Error interno calculando overview de inventario',
                data: {
                    totalStockCost: 0,
                    totalStockSale: 0,
                    productsBelowMin: 0,
                    totalCategories: 0,
                    totalProducts: 0,
                    totalStock: 0
                }
            };
        }
    }

    /**
     * GET /by-cost - Lista de productos con valor a costo
     */
    async getByCost(businessId: number, params: PaginationParams = {}) {
        try {
            const { page, limit, skip } = this.getPagination(params.page, params.limit);
            const { search } = params;

            let globalTotals: any = { total_cost: '0', total_sale: '0', products_below_min: 0, total_stock: '0' };
            let products: any[] = [];
            let total: any[] = [];

            try {
                const searchCondition = search
                    ? `AND (p.name ILIKE '%${search}%' OR p.sku ILIKE '%${search}%' OR c.name ILIKE '%${search}%')`
                    : '';

                [products, total, globalTotals] = await Promise.all([
                    prisma.$queryRaw<any[]>`
                        SELECT
                            p.id,
                            p.name,
                            p.sku,
                            c.name as "categoryName",
                            u.symbol as "unitSymbol",
                            p."costPrice" as "costPrice",
                            p."minStock" as "minStock",
                            COALESCE(SUM(sl.quantity), 0) as "currentStock"
                        FROM "Product" p
                        INNER JOIN "Category" c ON p."categoryId" = c.id
                        INNER JOIN "MeasurementUnit" u ON p."unitId" = u.id
                        LEFT JOIN "StockLot" sl ON p.id = sl."productId" AND sl.quantity > 0
                        WHERE p."businessId" = ${businessId}
                        AND p."type" = ${ProductType.SIMPLE}
                        AND p."isActive" = true
                        ${searchCondition ? Prisma.raw(searchCondition) : Prisma.empty}
                        GROUP BY p.id, c.name, u.symbol
                        ORDER BY
                            CASE
                                WHEN COALESCE(SUM(sl.quantity), 0) = 0 THEN 0
                                WHEN COALESCE(SUM(sl.quantity), 0) <= p."minStock" THEN 1
                                ELSE 2
                            END,
                            p.name ASC
                        LIMIT ${limit} OFFSET ${skip}
                    `,

                    prisma.$queryRaw<[{ count: number }]>`
                        SELECT COUNT(*)::int as count
                        FROM "Product" p
                        INNER JOIN "Category" c ON p."categoryId" = c.id
                        WHERE p."businessId" = ${businessId}
                        AND p."type" = ${ProductType.SIMPLE}
                        AND p."isActive" = true
                        ${searchCondition ? Prisma.raw(searchCondition) : Prisma.empty}
                    `,

                    prisma.$queryRaw<[{ total_cost: string; total_sale: string; products_below_min: number; total_stock: string }]>`
                        SELECT
                            COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as total_cost,
                            COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as total_sale,
                            (
                                SELECT COUNT(*)::int
                                FROM "Product" p2
                                LEFT JOIN (
                                    SELECT "productId", SUM(quantity) as total_qty
                                    FROM "StockLot"
                                    WHERE quantity > 0
                                    GROUP BY "productId"
                                ) sl2 ON p2.id = sl2."productId"
                                WHERE p2."businessId" = ${businessId}
                                AND p2."type" = ${ProductType.SIMPLE}
                                AND p2."isActive" = true
                                AND COALESCE(sl2.total_qty, 0) <= p2."minStock"
                            ) as products_below_min,
                            COALESCE(SUM(sl.quantity), 0)::numeric as total_stock
                        FROM "StockLot" sl
                        INNER JOIN "Product" p ON sl."productId" = p.id
                        WHERE p."businessId" = ${businessId}
                        AND p."type" = ${ProductType.SIMPLE}
                        AND p."isActive" = true
                        AND sl.quantity > 0
                    `
                ]);

            } catch (queryError) {
                console.error('Error en queries de getByCost:', queryError);
                globalTotals = { total_cost: '0', total_sale: '0', products_below_min: 0, total_stock: '0' };
            }

            const data = products.map((product: any) => {
                const currentStock = Number(product.currentStock);
                const costPrice = Number(product.costPrice);
                const totalCost = currentStock * costPrice;

                return {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    category: product.categoryName,
                    currentStock,
                    costPrice,
                    minStock: Number(product.minStock),
                    unit: product.unitSymbol,
                    totalCost
                };
            });

            const totalStockCost = parseFloat(String(globalTotals.total_cost || 0));
            const totalStockSale = parseFloat(String(globalTotals.total_sale || 0));

            return {
                status: 200,
                message: 'Reporte de inventario por costo calculado',
                data,
                pagination: {
                    page,
                    limit,
                    total: Number(total[0]?.count || 0),
                    totalPages: Math.ceil(Number(total[0]?.count || 0) / limit)
                },
                globalTotals: {
                    totalStockCost,
                    totalStockSale,
                    productsBelowMin: Number(globalTotals.products_below_min || 0),
                    totalStock: parseFloat(String(globalTotals.total_stock || 0))
                }
            };

        } catch (error) {
            console.error('Error en InventoryReportService.getByCost:', error);
            return {
                status: 500,
                message: 'Error interno calculando reporte por costo',
                data: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
                globalTotals: {
                    totalStockCost: 0,
                    totalStockSale: 0,
                    productsBelowMin: 0,
                    totalStock: 0
                }
            };
        }
    }

    /**
     * GET /by-sale - Lista de productos con valor a venta
     */
    async getBySale(businessId: number, params: PaginationParams = {}) {
        try {
            const { page, limit, skip } = this.getPagination(params.page, params.limit);
            const { search } = params;

            let globalTotals: any = { total_cost: '0', total_sale: '0', products_below_min: 0, total_stock: '0' };
            let products: any[] = [];
            let total: any[] = [];

            try {
                const searchCondition = search
                    ? `AND (p.name ILIKE '%${search}%' OR p.sku ILIKE '%${search}%' OR c.name ILIKE '%${search}%')`
                    : '';

                [products, total, globalTotals] = await Promise.all([
                    prisma.$queryRaw<any[]>`
                        SELECT
                            p.id,
                            p.name,
                            p.sku,
                            c.name as "categoryName",
                            u.symbol as "unitSymbol",
                            p."costPrice" as "costPrice",
                            p."salePrice" as "salePrice",
                            p."minStock" as "minStock",
                            COALESCE(SUM(sl.quantity), 0) as "currentStock"
                        FROM "Product" p
                        INNER JOIN "Category" c ON p."categoryId" = c.id
                        INNER JOIN "MeasurementUnit" u ON p."unitId" = u.id
                        LEFT JOIN "StockLot" sl ON p.id = sl."productId" AND sl.quantity > 0
                        WHERE p."businessId" = ${businessId}
                        AND p."type" = ${ProductType.SIMPLE}
                        AND p."isActive" = true
                        ${searchCondition ? Prisma.raw(searchCondition) : Prisma.empty}
                        GROUP BY p.id, c.name, u.symbol
                        ORDER BY
                            CASE
                                WHEN COALESCE(SUM(sl.quantity), 0) = 0 THEN 0
                                WHEN COALESCE(SUM(sl.quantity), 0) <= p."minStock" THEN 1
                                ELSE 2
                            END,
                            p.name ASC
                        LIMIT ${limit} OFFSET ${skip}
                    `,

                    prisma.$queryRaw<[{ count: number }]>`
                        SELECT COUNT(*)::int as count
                        FROM "Product" p
                        INNER JOIN "Category" c ON p."categoryId" = c.id
                        WHERE p."businessId" = ${businessId}
                        AND p."type" = ${ProductType.SIMPLE}
                        AND p."isActive" = true
                        ${searchCondition ? Prisma.raw(searchCondition) : Prisma.empty}
                    `,

                    prisma.$queryRaw<[{ total_cost: string; total_sale: string; products_below_min: number; total_stock: string }]>`
                        SELECT
                            COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as total_cost,
                            COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as total_sale,
                            (
                                SELECT COUNT(*)::int
                                FROM "Product" p2
                                LEFT JOIN (
                                    SELECT "productId", SUM(quantity) as total_qty
                                    FROM "StockLot"
                                    WHERE quantity > 0
                                    GROUP BY "productId"
                                ) sl2 ON p2.id = sl2."productId"
                                WHERE p2."businessId" = ${businessId}
                                AND p2."type" = ${ProductType.SIMPLE}
                                AND p2."isActive" = true
                                AND COALESCE(sl2.total_qty, 0) <= p2."minStock"
                            ) as products_below_min,
                            COALESCE(SUM(sl.quantity), 0)::numeric as total_stock
                        FROM "StockLot" sl
                        INNER JOIN "Product" p ON sl."productId" = p.id
                        WHERE p."businessId" = ${businessId}
                        AND p."type" = ${ProductType.SIMPLE}
                        AND p."isActive" = true
                        AND sl.quantity > 0
                    `
                ]);
                
            } catch (queryError) {
                console.error('Error en queries de getBySale:', queryError);
                globalTotals = { total_cost: '0', total_sale: '0', products_below_min: 0, total_stock: '0' };
            }

            const data = products.map((product: any) => {
                const currentStock = Number(product.currentStock);
                const salePrice = Number(product.salePrice);
                const costPrice = Number(product.costPrice);
                const profitMargin = costPrice > 0 ? ((salePrice - costPrice) / costPrice) * 100 : 0;
                const totalSale = currentStock * salePrice;

                return {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    category: product.categoryName,
                    currentStock,
                    costPrice,
                    salePrice,
                    profitMargin: Math.round(profitMargin * 100) / 100,
                    minStock: Number(product.minStock),
                    unit: product.unitSymbol,
                    totalSale
                };
            });

            const totalStockCost = parseFloat(String(globalTotals.total_cost || 0));
            const totalStockSale = parseFloat(String(globalTotals.total_sale || 0));

            return {
                status: 200,
                message: 'Reporte de inventario por venta calculado',
                data,
                pagination: {
                    page,
                    limit,
                    total: Number(total[0]?.count || 0),
                    totalPages: Math.ceil(Number(total[0]?.count || 0) / limit)
                },
                globalTotals: {
                    totalStockCost,
                    totalStockSale,
                    productsBelowMin: Number(globalTotals.products_below_min || 0),
                    totalStock: parseFloat(String(globalTotals.total_stock || 0))
                }
            };

        } catch (error) {
            console.error('Error en InventoryReportService.getBySale:', error);
            return {
                status: 500,
                message: 'Error interno calculando reporte por venta',
                data: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
                globalTotals: {
                    totalStockCost: 0,
                    totalStockSale: 0,
                    productsBelowMin: 0,
                    totalStock: 0
                }
            };
        }
    }

    /**
     * GET /by-category - Resumen agrupado por categoría
     */
    async getByCategory(businessId: number, params: PaginationParams = {}) {
        try {
            const { page, limit, skip } = this.getPagination(params.page, params.limit);
            const { search } = params;

            const searchCondition = search
                ? Prisma.sql`AND c.name ILIKE ${'%' + search + '%'}`
                : Prisma.empty; // Prisma.empty es un fragmento de SQL vacío

            const [categories, total, globalTotals] = await Promise.all([
                prisma.$queryRaw<any[]>`
                    SELECT 
                        c.id as "categoryId",
                        c.name as "categoryName",
                        COUNT(DISTINCT p.id) as "productCount",
                        COALESCE(SUM(sl.quantity), 0)::numeric as "totalStock",
                        COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as "totalCost",
                        COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as "totalSale"
                    FROM "Category" c
                    LEFT JOIN "Product" p ON c.id = p."categoryId" 
                        AND p."type" = ${ProductType.SIMPLE} 
                        AND p."isActive" = true
                    LEFT JOIN "StockLot" sl ON p.id = sl."productId" AND sl.quantity > 0
                    WHERE c."businessId" = ${businessId}
                    AND c."isActive" = true
                    ${searchCondition}
                    GROUP BY c.id, c.name
                    ORDER BY c.name ASC
                    LIMIT ${limit} OFFSET ${skip}
                `,

                prisma.$queryRaw<[{ count: number }]>`
                    SELECT COUNT(*)::int as count
                    FROM "Category" c
                    WHERE c."businessId" = ${businessId}
                    AND c."isActive" = true
                    ${searchCondition}
                `,

                prisma.$queryRaw<[{ total_cost: number; total_sale: number }]>`
                    SELECT 
                        COALESCE(SUM(sl.quantity * sl."lotCost"), 0)::numeric as total_cost,
                        COALESCE(SUM(sl.quantity * p."salePrice"), 0)::numeric as total_sale
                    FROM "StockLot" sl
                    INNER JOIN "Product" p ON sl."productId" = p.id
                    WHERE p."businessId" = ${businessId}
                    AND p."type" = ${ProductType.SIMPLE}
                    AND p."isActive" = true
                    AND sl.quantity > 0
                `
            ]);

            const totalSaleAll = Number(globalTotals[0]?.total_sale || 0);

            const data = categories.map((category: any) => {
                const totalSale = Number(category.totalSale);
                const percentage = totalSaleAll > 0 ? (totalSale / totalSaleAll) * 100 : 0;

                return {
                    categoryId: Number(category.categoryId),
                    categoryName: category.categoryName,
                    productCount: Number(category.productCount),
                    totalStock: Number(category.totalStock),
                    totalCost: Number(category.totalCost),
                    totalSale,
                    percentage: Math.round(percentage * 100) / 100
                };
            });

            return {
                status: 200,
                message: 'Reporte de inventario por categoría calculado',
                data,
                pagination: {
                    page,
                    limit,
                    total: Number(total[0]?.count || 0),
                    totalPages: Math.ceil(Number(total[0]?.count || 0) / limit)
                },
                globalTotals: {
                    totalStockCost: Number(globalTotals[0]?.total_cost || 0),
                    totalStockSale: Number(globalTotals[0]?.total_sale || 0),
                    productsBelowMin: 0,
                    totalStock: 0
                }
            };

        } catch (error) {
            console.error('Error en InventoryReportService.getByCategory:', error);
            return {
                status: 500,
                message: 'Error interno calculando reporte por categoría',
                data: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
                globalTotals: {
                    totalStockCost: 0,
                    totalStockSale: 0,
                    productsBelowMin: 0,
                    totalStock: 0
                }
            };
        }
    }
}