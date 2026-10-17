import { SalesStatsService } from '../report/sales/sales-stats.service';
import { CollectionsReportService } from '../report/collections/collections-report.service';
import { prisma } from '@/configs';
import { ToolExecutionResult, AiChatAction } from './ai.interface';

const salesStatsService = new SalesStatsService();
const collectionsReportService = new CollectionsReportService();

const parseDateRange = (fromDate?: string, toDate?: string, tzOffset: number = 240) => {
    const local = new Date(Date.now() - (tzOffset * 60_000));
    const todayStr = local.toISOString().split('T')[0];
    const from = fromDate || todayStr;
    const to = toDate || from;

    const [fYear, fMonth, fDay] = from.split('-').map(Number);
    const startUtcMs = Date.UTC(fYear, fMonth - 1, fDay, 0, 0, 0, 0) + (tzOffset * 60_000);

    const [tYear, tMonth, tDay] = to.split('-').map(Number);
    const endUtcMs = Date.UTC(tYear, tMonth - 1, tDay + 1, 0, 0, 0, 0) + (tzOffset * 60_000) - 1;

    return {
        fromStr: from,
        toStr: to,
        startDate: new Date(startUtcMs),
        endDate: new Date(endUtcMs)
    };
};

export const AI_TOOL_DECLARATIONS = [
    {
        name: 'consultar_resumen_ventas',
        description: 'Consulta el resumen ejecutivo y totales de ventas del negocio para un rango de fechas. Proporciona monto total en USD, número de ventas realizadas y desglose por método de pago.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio formato YYYY-MM-DD. Si es hoy, usar fecha de hoy.' },
                toDate: { type: 'STRING', description: 'Fecha fin formato YYYY-MM-DD. Si es hoy, usar fecha de hoy.' }
            },
            required: ['fromDate', 'toDate']
        }
    },
    {
        name: 'generar_pdf_ventas',
        description: 'Genera el enlace de descarga del documento oficial PDF de ventas para el negocio en un rango de fechas.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio formato YYYY-MM-DD' },
                toDate: { type: 'STRING', description: 'Fecha fin formato YYYY-MM-DD' }
            },
            required: ['fromDate', 'toDate']
        }
    },
    {
        name: 'consultar_ventas_por_producto',
        description: 'Consulta cuántas unidades se han vendido de un producto específico o tipo de artículo (ej: "neveras", "arroz", "aceite", "hamburguesa") en una fecha o rango, junto con el monto total facturado en USD y desglose.',
        parameters: {
            type: 'OBJECT',
            properties: {
                searchTerm: { type: 'STRING', description: 'Nombre o término del producto a buscar (ej: "nevera", "harina", "cerveza").' },
                fromDate: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD. Opcional, por defecto hoy.' },
                toDate: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD. Opcional, por defecto hoy.' }
            },
            required: ['searchTerm']
        }
    },
    {
        name: 'consultar_valorizacion_inventario',
        description: 'Calcula el valor financiero total del inventario de la empresa: total invertido a precio de costo, total valor comercial a precio de venta al público, ganancia potencial proyectada, margen de rentabilidad global y total de unidades físicas en stock.',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'consultar_top_productos_mas_vendidos',
        description: 'Consulta el ranking de los productos más vendidos de la empresa en un rango de fechas, ordenados por unidades vendidas y recaudación en USD.',
        parameters: {
            type: 'OBJECT',
            properties: {
                limit: { type: 'NUMBER', description: 'Cantidad de productos en el ranking (ej: 5 o 10). Por defecto 5.' },
                fromDate: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD.' },
                toDate: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD.' }
            }
        }
    },
    {
        name: 'consultar_cuentas_por_cobrar_y_deudores',
        description: 'Consulta el saldo total pendiente por cobrar a clientes a crédito en la empresa y el listado de los principales clientes con deuda pendiente.',
        parameters: {
            type: 'OBJECT',
            properties: {
                limit: { type: 'NUMBER', description: 'Límite de clientes a listar. Por defecto 10.' }
            }
        }
    },
    {
        name: 'consultar_informacion_producto',
        description: 'Consulta la ficha, precios y disponibilidad en stock de un producto específico (precio de venta, precio de costo, stock total y por depósito).',
        parameters: {
            type: 'OBJECT',
            properties: {
                search: { type: 'STRING', description: 'Nombre o código SKU del producto a consultar.' }
            },
            required: ['search']
        }
    },
    {
        name: 'consultar_gastos_operativos',
        description: 'Consulta los gastos operativos y egresos registrados en la empresa para un rango de fechas (total en USD y desglose de gastos recientes).',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD.' },
                toDate: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD.' }
            }
        }
    },
    {
        name: 'consultar_ultimas_ventas',
        description: 'Consulta las últimas ventas registradas en la empresa, mostrando cliente, monto total, estado de pago y productos vendidos.',
        parameters: {
            type: 'OBJECT',
            properties: {
                limit: { type: 'NUMBER', description: 'Cantidad de ventas recientes a consultar. Por defecto 5.' }
            }
        }
    },
    {
        name: 'consultar_resumen_cobranza',
        description: 'Consulta las estadísticas de cobranza y abonos a créditos en el negocio para un rango de fechas. Proporciona total recaudado, cantidad de abonos y métodos de pago recibidos.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio formato YYYY-MM-DD' },
                toDate: { type: 'STRING', description: 'Fecha fin formato YYYY-MM-DD' }
            },
            required: ['fromDate', 'toDate']
        }
    },
    {
        name: 'generar_pdf_cobranza',
        description: 'Genera el enlace de descarga del documento oficial PDF de cobranza (caja de cobranza y abonos) para el negocio en un rango de fechas.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio formato YYYY-MM-DD' },
                toDate: { type: 'STRING', description: 'Fecha fin formato YYYY-MM-DD' }
            },
            required: ['fromDate', 'toDate']
        }
    },
    {
        name: 'consultar_ingresos_consolidados',
        description: 'Consulta el reporte consolidado de ingresos del negocio, diferenciando exactamente cuánto ingresó por concepto de ventas directas de contado y cuánto por cobranza de créditos.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio formato YYYY-MM-DD' },
                toDate: { type: 'STRING', description: 'Fecha fin formato YYYY-MM-DD' }
            },
            required: ['fromDate', 'toDate']
        }
    },
    {
        name: 'consultar_productos_stock_bajo',
        description: 'Consulta los artículos del inventario que tienen stock crítico, bajo o agotado en la empresa.',
        parameters: {
            type: 'OBJECT',
            properties: {
                minStock: { type: 'NUMBER', description: 'Cantidad máxima de stock considerado bajo. Por defecto 5.' },
                limit: { type: 'NUMBER', description: 'Máximo número de productos a listar. Por defecto 10.' }
            }
        }
    },
    {
        name: 'consultar_datos_empresa',
        description: 'Consulta la información de la empresa actual (nombre comercial, RIF, teléfono, dirección).',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    }
];

export async function executeAiTool(
    toolName: string, 
    args: any, 
    businessId: number, 
    tzOffset: number = 240
): Promise<ToolExecutionResult> {
    const local = new Date(Date.now() - (tzOffset * 60_000));
    const defaultDate = local.toISOString().split('T')[0];

    switch (toolName) {
        case 'consultar_resumen_ventas': {
            const fromDate = args?.fromDate || defaultDate;
            const toDate = args?.toDate || fromDate;
            const res = await salesStatsService.getDetailedReport(businessId, { fromDate, toDate, tzOffset });
            return {
                data: {
                    periodo: `${fromDate} al ${toDate}`,
                    resultado: res.status === 200 ? res.data : { error: res.message }
                }
            };
        }

        case 'generar_pdf_ventas': {
            const fromDate = args?.fromDate || defaultDate;
            const toDate = args?.toDate || fromDate;
            const endpoint = `/report/sales/pdf?fromDate=${fromDate}&toDate=${toDate}&tzOffset=${tzOffset}`;
            const action: AiChatAction = {
                type: 'DOWNLOAD_PDF',
                label: `📄 Descargar Reporte PDF de Ventas (${fromDate} - ${toDate})`,
                endpoint,
                filename: `Reporte_Ventas_${fromDate}_${toDate}.pdf`,
                params: { fromDate, toDate }
            };
            return {
                data: {
                    status: 'PDF_READY',
                    mensaje: `Reporte PDF de ventas generado exitosamente para el período ${fromDate} a ${toDate}.`,
                    enlace_descarga: endpoint
                },
                action
            };
        }

        case 'consultar_ventas_por_producto': {
            const searchTerm = String(args?.searchTerm || '').trim();
            const { fromStr, toStr, startDate, endDate } = parseDateRange(args?.fromDate, args?.toDate, tzOffset);

            const cleanTerm = searchTerm.toLowerCase().trim();
            const searchVariants = new Set<string>();
            if (cleanTerm) {
                searchVariants.add(cleanTerm);
                if (cleanTerm.endsWith('es') && cleanTerm.length > 3) {
                    searchVariants.add(cleanTerm.slice(0, -2));
                }
                if (cleanTerm.endsWith('s') && cleanTerm.length > 2) {
                    searchVariants.add(cleanTerm.slice(0, -1));
                }
                const words = cleanTerm.split(/\s+/).filter(w => w.length > 2);
                for (const w of words) {
                    searchVariants.add(w);
                    if (w.endsWith('es') && w.length > 3) searchVariants.add(w.slice(0, -2));
                    if (w.endsWith('s') && w.length > 2) searchVariants.add(w.slice(0, -1));
                }
            }

            const orConditions = Array.from(searchVariants).map(term => ({
                name: { contains: term, mode: 'insensitive' as const }
            }));

            const saleItems = await prisma.saleItem.findMany({
                where: {
                    sale: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        deletedAt: null,
                        createdAt: { gte: startDate, lte: endDate }
                    },
                    product: {
                        OR: orConditions.length > 0 ? orConditions : [{ name: { contains: searchTerm, mode: 'insensitive' } }]
                    }
                },
                include: {
                    product: {
                        select: { id: true, name: true, sku: true, salePrice: true }
                    },
                    sale: {
                        select: { id: true, createdAt: true, client: { select: { name: true } } }
                    }
                }
            });

            const totalUnidadesVendidas = saleItems.reduce((acc, it) => acc + Number(it.quantity), 0);
            const totalDineroUSD = saleItems.reduce((acc, it) => acc + Number(it.subTotal), 0);

            const productsMap = new Map<number, { nombre: string; sku: string; unidades: number; totalUSD: number }>();
            for (const it of saleItems) {
                const current = productsMap.get(it.product.id) || {
                    nombre: it.product.name,
                    sku: it.product.sku || 'S/C',
                    unidades: 0,
                    totalUSD: 0
                };
                current.unidades += Number(it.quantity);
                current.totalUSD += Number(it.subTotal);
                productsMap.set(it.product.id, current);
            }

            return {
                data: {
                    articulo_buscado: searchTerm,
                    periodo: `${fromStr} al ${toStr}`,
                    total_unidades_vendidas: totalUnidadesVendidas,
                    total_monto_facturado_usd: Number(totalDineroUSD.toFixed(2)),
                    productos_coincidentes: Array.from(productsMap.values()).map(p => ({
                        ...p,
                        totalUSD: Number(p.totalUSD.toFixed(2))
                    }))
                }
            };
        }

        case 'consultar_valorizacion_inventario': {
            const products = await prisma.product.findMany({
                where: {
                    businessId,
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    costPrice: true,
                    salePrice: true,
                    stockLots: {
                        select: {
                            quantity: true,
                            lotCost: true
                        }
                    }
                }
            });

            let totalInversionCostoUSD = 0;
            let totalValorComercialVentaUSD = 0;
            let totalUnidadesFisicas = 0;
            let productosConExistencia = 0;

            for (const p of products) {
                let pStock = 0;
                for (const lot of p.stockLots) {
                    const qty = Number(lot.quantity);
                    if (qty > 0) {
                        pStock += qty;
                        totalUnidadesFisicas += qty;
                        const unitCost = Number(lot.lotCost) > 0 ? Number(lot.lotCost) : Number(p.costPrice);
                        totalInversionCostoUSD += qty * unitCost;
                        totalValorComercialVentaUSD += qty * Number(p.salePrice);
                    }
                }
                if (pStock > 0) productosConExistencia++;
            }

            const gananciaPotencialUSD = totalValorComercialVentaUSD - totalInversionCostoUSD;
            const margenRentabilidadPct = totalValorComercialVentaUSD > 0
                ? Number(((gananciaPotencialUSD / totalValorComercialVentaUSD) * 100).toFixed(2))
                : 0;

            return {
                data: {
                    total_articulos_catalogo: products.length,
                    articulos_con_stock_disponible: productosConExistencia,
                    total_unidades_fisicas_en_inventario: Number(totalUnidadesFisicas.toFixed(2)),
                    total_invertido_a_precio_de_costo_usd: Number(totalInversionCostoUSD.toFixed(2)),
                    total_inventario_a_precio_de_venta_usd: Number(totalValorComercialVentaUSD.toFixed(2)),
                    ganancia_bruta_potencial_usd: Number(gananciaPotencialUSD.toFixed(2)),
                    margen_rentabilidad_global_porcentaje: margenRentabilidadPct
                }
            };
        }

        case 'consultar_top_productos_mas_vendidos': {
            const limit = Math.min(Number(args?.limit ?? 5), 20);
            const { fromStr, toStr, startDate, endDate } = parseDateRange(args?.fromDate, args?.toDate, tzOffset);

            const grouped = await prisma.saleItem.groupBy({
                by: ['productId'],
                where: {
                    sale: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        deletedAt: null,
                        createdAt: { gte: startDate, lte: endDate }
                    }
                },
                _sum: {
                    quantity: true,
                    subTotal: true
                },
                orderBy: {
                    _sum: {
                        quantity: 'desc'
                    }
                },
                take: limit
            });

            const productIds = grouped.map(g => g.productId);
            const productInfo = await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true, sku: true, salePrice: true }
            });
            const infoMap = new Map(productInfo.map(p => [p.id, p]));

            const ranking = grouped.map(g => {
                const p = infoMap.get(g.productId);
                return {
                    producto: p?.name || `Producto #${g.productId}`,
                    sku: p?.sku || 'S/C',
                    unidades_vendidas: Number(g._sum.quantity || 0),
                    monto_total_usd: Number(Number(g._sum.subTotal || 0).toFixed(2))
                };
            });

            return {
                data: {
                    periodo: `${fromStr} al ${toStr}`,
                    top_productos: ranking
                }
            };
        }

        case 'consultar_cuentas_por_cobrar_y_deudores': {
            const limit = Math.min(Number(args?.limit ?? 10), 30);
            const agg = await prisma.client.aggregate({
                where: { businessId, isActive: true, currentDebt: { gt: 0 } },
                _sum: { currentDebt: true },
                _count: { id: true }
            });

            const debtors = await prisma.client.findMany({
                where: { businessId, isActive: true, currentDebt: { gt: 0 } },
                select: {
                    id: true,
                    name: true,
                    ci: true,
                    phone: true,
                    currentDebt: true
                },
                orderBy: { currentDebt: 'desc' },
                take: limit
            });

            return {
                data: {
                    total_deuda_por_cobrar_usd: Number(Number(agg._sum.currentDebt || 0).toFixed(2)),
                    total_clientes_con_deuda: agg._count.id,
                    principales_deudores: debtors.map(d => ({
                        cliente: d.name,
                        cedula_rif: d.ci,
                        telefono: d.phone || 'No registrado',
                        saldo_pendiente_usd: Number(d.currentDebt)
                    }))
                }
            };
        }

        case 'consultar_informacion_producto': {
            const search = String(args?.search || '').trim();
            const cleanTerm = search.toLowerCase().trim();
            const searchVariants = new Set<string>();
            if (cleanTerm) {
                searchVariants.add(cleanTerm);
                if (cleanTerm.endsWith('es') && cleanTerm.length > 3) {
                    searchVariants.add(cleanTerm.slice(0, -2));
                }
                if (cleanTerm.endsWith('s') && cleanTerm.length > 2) {
                    searchVariants.add(cleanTerm.slice(0, -1));
                }
                const words = cleanTerm.split(/\s+/).filter(w => w.length > 2);
                for (const w of words) {
                    searchVariants.add(w);
                    if (w.endsWith('es') && w.length > 3) searchVariants.add(w.slice(0, -2));
                    if (w.endsWith('s') && w.length > 2) searchVariants.add(w.slice(0, -1));
                }
            }

            const nameConditions = Array.from(searchVariants).map(term => ({
                name: { contains: term, mode: 'insensitive' as const }
            }));

            const products = await prisma.product.findMany({
                where: {
                    businessId,
                    isActive: true,
                    OR: [
                        ...(nameConditions.length > 0 ? nameConditions : [{ name: { contains: search, mode: 'insensitive' as const } }]),
                        { sku: { contains: search, mode: 'insensitive' } }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    salePrice: true,
                    costPrice: true,
                    minStock: true,
                    category: { select: { name: true } },
                    stockLots: {
                        select: {
                            quantity: true,
                            depot: { select: { name: true } }
                        }
                    }
                },
                take: 5
            });

            return {
                data: {
                    coincidencias_encontradas: products.length,
                    articulos: products.map(p => {
                        const totalStock = p.stockLots.reduce((acc, lot) => acc + Number(lot.quantity), 0);
                        return {
                            nombre: p.name,
                            sku: p.sku || 'S/C',
                            categoria: p.category?.name || 'General',
                            precio_venta_usd: Number(p.salePrice),
                            precio_costo_usd: Number(p.costPrice),
                            stock_total: totalStock,
                            stock_minimo: p.minStock,
                            desglose_por_deposito: p.stockLots.map(l => ({
                                deposito: l.depot?.name || 'Almacén',
                                cantidad: Number(l.quantity)
                            }))
                        };
                    })
                }
            };
        }

        case 'consultar_gastos_operativos': {
            const { fromStr, toStr, startDate, endDate } = parseDateRange(args?.fromDate, args?.toDate, tzOffset);

            const agg = await prisma.expense.aggregate({
                where: {
                    businessId,
                    deletedAt: null,
                    expenseDate: { gte: startDate, lte: endDate }
                },
                _sum: { amountInUSD: true },
                _count: { id: true }
            });

            const expenses = await prisma.expense.findMany({
                where: {
                    businessId,
                    deletedAt: null,
                    expenseDate: { gte: startDate, lte: endDate }
                },
                select: {
                    id: true,
                    title: true,
                    amountInUSD: true,
                    expenseDate: true,
                    beneficiary: true
                },
                orderBy: { expenseDate: 'desc' },
                take: 8
            });

            return {
                data: {
                    periodo: `${fromStr} al ${toStr}`,
                    total_gastos_usd: Number(Number(agg._sum.amountInUSD || 0).toFixed(2)),
                    cantidad_registros_gasto: agg._count.id,
                    ultimos_gastos: expenses.map(e => ({
                        concepto: e.title,
                        beneficiario: e.beneficiary || 'N/A',
                        monto_usd: Number(e.amountInUSD),
                        fecha: e.expenseDate.toISOString().split('T')[0]
                    }))
                }
            };
        }

        case 'consultar_ultimas_ventas': {
            const limit = Math.min(Number(args?.limit ?? 5), 15);
            const sales = await prisma.sale.findMany({
                where: { businessId, status: { not: 'CANCELLED' }, deletedAt: null },
                select: {
                    id: true,
                    totalAmount: true,
                    remainingBalance: true,
                    paymentStatus: true,
                    createdAt: true,
                    client: { select: { name: true } },
                    items: {
                        select: {
                            quantity: true,
                            subTotal: true,
                            product: { select: { name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return {
                data: {
                    ultimas_ventas: sales.map(s => ({
                        venta_id: s.id,
                        cliente: s.client?.name || 'Cliente Ocasional',
                        monto_total_usd: Number(s.totalAmount),
                        saldo_pendiente: Number(s.remainingBalance),
                        estado_pago: s.paymentStatus,
                        fecha_hora: s.createdAt.toISOString(),
                        articulos: s.items.map(it => `${Number(it.quantity)}x ${it.product?.name || 'Art.'}`)
                    }))
                }
            };
        }

        case 'consultar_resumen_cobranza': {
            const fromDate = args?.fromDate || defaultDate;
            const toDate = args?.toDate || fromDate;
            const res = await collectionsReportService.getOverview(businessId, { fromDate, toDate, tzOffset });
            return {
                data: {
                    periodo: `${fromDate} al ${toDate}`,
                    resultado: res.status === 200 ? res.data : { error: res.message }
                }
            };
        }

        case 'generar_pdf_cobranza': {
            const fromDate = args?.fromDate || defaultDate;
            const toDate = args?.toDate || fromDate;
            const endpoint = `/report/collections/pdf?fromDate=${fromDate}&toDate=${toDate}&tzOffset=${tzOffset}`;
            const action: AiChatAction = {
                type: 'DOWNLOAD_PDF',
                label: `📄 Descargar Reporte PDF de Cobranza (${fromDate} - ${toDate})`,
                endpoint,
                filename: `Reporte_Cobranza_${fromDate}_${toDate}.pdf`,
                params: { fromDate, toDate }
            };
            return {
                data: {
                    status: 'PDF_READY',
                    mensaje: `Reporte PDF de cobranza generado exitosamente para el período ${fromDate} a ${toDate}.`,
                    enlace_descarga: endpoint
                },
                action
            };
        }

        case 'consultar_ingresos_consolidados': {
            const fromDate = args?.fromDate || defaultDate;
            const toDate = args?.toDate || fromDate;
            const res = await collectionsReportService.getConsolidatedIncome(businessId, { fromDate, toDate, tzOffset });
            return {
                data: {
                    periodo: `${fromDate} al ${toDate}`,
                    resultado: res.status === 200 ? res.data : { error: res.message }
                }
            };
        }

        case 'consultar_productos_stock_bajo': {
            const minStockThreshold = Number(args?.minStock ?? 5);
            const limit = Math.min(Number(args?.limit ?? 10), 30);
            
            const rawProducts = await prisma.product.findMany({
                where: {
                    businessId,
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    salePrice: true,
                    minStock: true,
                    stockLots: {
                        select: {
                            quantity: true
                        }
                    }
                },
                take: 100
            });

            const lowStockProducts = rawProducts
                .map(p => {
                    const totalStock = p.stockLots.reduce((acc, lot) => acc + Number(lot.quantity), 0);
                    return {
                        nombre: p.name,
                        sku: p.sku || 'S/C',
                        stock_actual: totalStock,
                        stock_minimo: p.minStock,
                        precio_usd: Number(p.salePrice)
                    };
                })
                .filter(p => p.stock_actual <= (minStockThreshold || p.stock_minimo || 5))
                .sort((a, b) => a.stock_actual - b.stock_actual)
                .slice(0, limit);

            return {
                data: {
                    criterio_stock_minimo: minStockThreshold,
                    total_articulos_encontrados: lowStockProducts.length,
                    articulos: lowStockProducts
                }
            };
        }

        case 'consultar_datos_empresa': {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    closingNotificationPhone: true,
                    currentExchangeRate: true
                }
            });
            return {
                data: business ? {
                    nombre_comercial: business.name,
                    direccion: business.address,
                    telefono_cierre: business.closingNotificationPhone || 'No configurado',
                    tasa_cambio_actual_bs: Number(business.currentExchangeRate)
                } : { mensaje: 'Empresa no encontrada' }
            };
        }

        default:
            return {
                data: { error: `Herramienta desconocida: ${toolName}` }
            };
    }
}
