import { SalesStatsService } from '../report/sales/sales-stats.service';
import { CollectionsReportService } from '../report/collections/collections-report.service';
import { prisma } from '@/configs';
import { ToolExecutionResult, AiChatAction } from './ai.interface';

const salesStatsService = new SalesStatsService();
const collectionsReportService = new CollectionsReportService();

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

export async function executeAiTool(toolName: string, args: any, businessId: number): Promise<ToolExecutionResult> {
    const tzOffset = -240; // America/Caracas standard (-4h = -240 min)

    switch (toolName) {
        case 'consultar_resumen_ventas': {
            const fromDate = args?.fromDate || new Date().toISOString().split('T')[0];
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
            const fromDate = args?.fromDate || new Date().toISOString().split('T')[0];
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

        case 'consultar_resumen_cobranza': {
            const fromDate = args?.fromDate || new Date().toISOString().split('T')[0];
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
            const fromDate = args?.fromDate || new Date().toISOString().split('T')[0];
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
            const fromDate = args?.fromDate || new Date().toISOString().split('T')[0];
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
