import { SalesStatsService } from '../report/sales/sales-stats.service';
import { CollectionsReportService } from '../report/collections/collections-report.service';
import { CommissionReportService } from '../report/commission/commission-report.service';
import { FinancialReportService } from '../report/financial/financial-report.service';
import { DepositsReportService } from '../report/deposits/deposits-report.service';
import { ExpenseService } from '../finance/expense/expense.service';
import { prisma } from '@/configs';
import { ToolExecutionResult, AiChatAction, AiUserContext } from './ai.interface';
import { SaleService } from '../sales/sale/sale.service';
import { canAccessBusinessPermission, resolveBusinessExchangeRate } from '@/utils';
import { BusinessPermissionCode } from '@/data/aim/role-permissions.data';
import { CashStatus, Currency, ProductType, MovementType, InstallmentStatus, Conditions, SaleType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

const saleService = new SaleService();
const expenseService = new ExpenseService();

const salesStatsService = new SalesStatsService();
const collectionsReportService = new CollectionsReportService();
const commissionReportService = new CommissionReportService();
const financialReportService = new FinancialReportService();
const depositsReportService = new DepositsReportService();

export const stripAccents = (str: string): string => {
    return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const getSearchVariants = (term: string): string[] => {
    const raw = (term || '').trim();
    if (!raw) return [];
    const lower = raw.toLowerCase();
    const unaccented = stripAccents(lower);

    const set = new Set<string>();
    set.add(raw);
    set.add(lower);
    set.add(unaccented);

    for (const v of [lower, unaccented]) {
        if (v.endsWith('es') && v.length > 3) set.add(v.slice(0, -2));
        if (v.endsWith('s') && v.length > 2) set.add(v.slice(0, -1));

        const words = v.split(/\s+/).filter(w => w.length > 2);
        for (const w of words) {
            set.add(w);
            set.add(stripAccents(w));
            if (w.endsWith('es') && w.length > 3) set.add(w.slice(0, -2));
            if (w.endsWith('s') && w.length > 2) set.add(w.slice(0, -1));
        }
    }
    return Array.from(set).filter(Boolean);
};

export const getLocalDateStr = (tzOffset: number = 240, deltaDays: number = 0): string => {
    const local = new Date(Date.now() - (tzOffset * 60_000) + (deltaDays * 86_400_000));
    return local.toISOString().split('T')[0];
};

const parseDateRange = (fromDate?: string, toDate?: string, tzOffset: number = 240) => {
    const todayStr = getLocalDateStr(tzOffset, 0);
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

export const TOOL_PERMISSIONS: Record<string, BusinessPermissionCode | BusinessPermissionCode[]> = {
    consultar_resumen_ventas: ['REPORTS_SALES_VIEW', 'SALES_READ'],
    generar_pdf_ventas: ['REPORTS_SALES_VIEW', 'SALES_READ'],
    consultar_ventas_por_producto: ['REPORTS_SALES_VIEW', 'SALES_READ'],
    consultar_top_productos_mas_vendidos: ['REPORTS_SALES_VIEW', 'SALES_READ'],
    consultar_ultimas_ventas: ['REPORTS_SALES_VIEW', 'SALES_READ'],
    consultar_cotizaciones_presupuestos: ['REPORTS_SALES_VIEW', 'SALES_READ'],
    consultar_valorizacion_inventario: ['REPORTS_INVENTORY_VIEW', 'INVENTORY_READ'],
    consultar_reporte_almacenes_depositos: ['REPORTS_DEPOSITS_VIEW', 'REPORTS_INVENTORY_VIEW', 'DEPOSITS_READ'],
    consultar_informacion_producto: ['PRODUCTS_READ', 'INVENTORY_READ', 'SALES_WRITE'],
    consultar_productos_stock_bajo: ['PRODUCTS_READ', 'INVENTORY_READ', 'REPORTS_INVENTORY_VIEW'],
    generar_promociones_combos_estancados: ['PRODUCTS_READ', 'INVENTORY_READ', 'REPORTS_SALES_VIEW'],
    consultar_cuentas_por_cobrar_y_deudores: ['REPORTS_CREDITS_VIEW', 'CREDITS_SALES_COLLECT', 'CLIENTS_READ'],
    consultar_resumen_cobranza: ['REPORTS_COLLECTIONS_VIEW', 'CREDITS_SALES_COLLECT', 'FINANCE_READ'],
    generar_pdf_cobranza: ['REPORTS_COLLECTIONS_VIEW', 'CREDITS_SALES_COLLECT', 'FINANCE_READ'],
    generar_mensaje_cobranza_whatsapp: ['CREDITS_SALES_COLLECT', 'CLIENTS_READ', 'REPORTS_CREDITS_VIEW'],
    consultar_top_clientes: ['CLIENTS_READ', 'REPORTS_SALES_VIEW'],
    consultar_gastos_operativos: ['EXPENSES_READ', 'FINANCE_READ', 'REPORTS_FINANCIAL_VIEW'],
    consultar_ingresos_consolidados: ['FINANCE_READ', 'REPORTS_FINANCIAL_VIEW', 'REPORTS_COLLECTIONS_VIEW'],
    consultar_compras_proveedores: ['PROCUREMENT_READ', 'REPORTS_PURCHASES_VIEW'],
    sugerir_reposicion_compras_proveedores: ['PROCUREMENT_READ', 'REPORTS_PURCHASES_VIEW', 'INVENTORY_READ'],
    consultar_estado_cajas: ['CASH_REGISTER_READ', 'REPORTS_CASH_REGISTER_VIEW'],
    consultar_comisiones_vendedores: ['REPORTS_FINANCIAL_VIEW', 'FINANCE_READ', 'REPORTS_SALES_VIEW'],
    consultar_reporte_financiero: ['REPORTS_FINANCIAL_VIEW', 'FINANCE_READ'],
    auditar_fugas_y_dinero_dormido: ['REPORTS_FINANCIAL_VIEW', 'FINANCE_READ', 'REPORTS_INVENTORY_VIEW'],
    auditar_fraude_y_anulaciones_caja: ['REPORTS_FINANCIAL_VIEW', 'REPORTS_CASH_REGISTER_VIEW', 'FINANCE_READ'],
    ejecutar_crear_gasto: 'EXPENSES_WRITE',
    ejecutar_cambiar_precio_producto: 'PRODUCTS_WRITE',
    ejecutar_crear_producto: 'PRODUCTS_WRITE',
    ejecutar_abonar_a_cliente: 'CREDITS_SALES_COLLECT',
    ejecutar_crear_venta: 'SALES_WRITE'
};

export const resolveActiveMemberForUser = async (businessId: number, userId?: number) => {
    if (!userId) return null;
    return prisma.businessMember.findFirst({
        where: { businessId, userId, isActive: true },
        include: {
            user: { select: { id: true, name: true } },
            role: { select: { code: true, name: true } }
        }
    });
};

export const checkToolPermission = async (
    toolName: string,
    userContext?: AiUserContext
): Promise<{ allowed: boolean; required?: BusinessPermissionCode | BusinessPermissionCode[] }> => {
    const required = TOOL_PERMISSIONS[toolName];
    if (!required) return { allowed: true };
    if (userContext?.isSuperAdmin) return { allowed: true, required };

    const roleCode = userContext?.roleCode || '';
    if (!roleCode) return { allowed: false, required };

    const allowed = await canAccessBusinessPermission(roleCode, required, false);
    return { allowed, required };
};

export const getAllowedToolDeclarations = async (
    roleCode?: string,
    isSuperAdmin: boolean = false
) => {
    if (isSuperAdmin) return AI_TOOL_DECLARATIONS;
    if (!roleCode) {
        return AI_TOOL_DECLARATIONS.filter(t => !TOOL_PERMISSIONS[t.name]);
    }

    const checks = await Promise.all(
        AI_TOOL_DECLARATIONS.map(async (decl) => {
            const required = TOOL_PERMISSIONS[decl.name];
            if (!required) return true;
            return canAccessBusinessPermission(roleCode, required, false);
        })
    );

    return AI_TOOL_DECLARATIONS.filter((_, idx) => checks[idx]);
};

export const findBusinessClientCandidates = async (
    businessId: number,
    clientSearch: string,
    preferWithDebt: boolean = false
) => {
    const rawSearch = (clientSearch || '').trim();
    if (!rawSearch) return { exactMatch: null as any, candidates: [] as any[] };

    const normSearch = stripAccents(rawSearch).toLowerCase().trim();
    const tokens = normSearch.split(/\s+/).filter(Boolean);

    const clients = await prisma.client.findMany({
        where: { businessId, isActive: true },
        include: {
            sales: {
                where: {
                    status: { not: 'CANCELLED' },
                    deletedAt: null,
                    remainingBalance: { gt: 0 }
                },
                select: { id: true, remainingBalance: true }
            }
        }
    });

    const matches = clients.filter(c => {
        const normName = stripAccents(c.name || '').toLowerCase();
        const normCi = stripAccents(c.ci || '').toLowerCase();
        const normPhone = stripAccents(c.phone || '').toLowerCase();
        const combined = `${normName} ${normCi} ${normPhone}`;

        if (normName.includes(normSearch) || normCi.includes(normSearch) || normPhone.includes(normSearch)) {
            return true;
        }
        return tokens.length > 0 && tokens.every(t => combined.includes(t));
    });

    if (matches.length === 0) return { exactMatch: null, candidates: [] };

    matches.sort((a, b) => {
        const aExact = (stripAccents(a.name || '').toLowerCase().trim() === normSearch || stripAccents(a.ci || '').toLowerCase().trim() === normSearch || stripAccents(a.phone || '').toLowerCase().trim() === normSearch) ? 1 : 0;
        const bExact = (stripAccents(b.name || '').toLowerCase().trim() === normSearch || stripAccents(b.ci || '').toLowerCase().trim() === normSearch || stripAccents(b.phone || '').toLowerCase().trim() === normSearch) ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        if (preferWithDebt) {
            const aPending = a.sales.reduce((acc, s) => acc + Number(s.remainingBalance), 0);
            const bPending = b.sales.reduce((acc, s) => acc + Number(s.remainingBalance), 0);
            const aHasDebt = aPending > 0.01 || Number(a.currentDebt || 0) > 0.01 ? 1 : 0;
            const bHasDebt = bPending > 0.01 || Number(b.currentDebt || 0) > 0.01 ? 1 : 0;
            if (aHasDebt !== bHasDebt) return bHasDebt - aHasDebt;
        }

        return Number(b.currentDebt || 0) - Number(a.currentDebt || 0);
    });

    const exactMatches = matches.filter(c =>
        stripAccents(c.name || '').toLowerCase().trim() === normSearch
        || stripAccents(c.ci || '').toLowerCase().trim() === normSearch
        || stripAccents(c.phone || '').toLowerCase().trim() === normSearch
    );

    const exactMatch = exactMatches.length === 1 ? exactMatches[0] : (matches.length === 1 ? matches[0] : null);
    return { exactMatch, candidates: matches };
};

export const resolveBusinessClient = async (
    businessId: number,
    clientSearch: string,
    preferWithDebt: boolean = false
) => {
    const { candidates } = await findBusinessClientCandidates(businessId, clientSearch, preferWithDebt);
    return candidates.length > 0 ? candidates[0] : null;
};

export const listActiveStorePaymentMethods = async (businessId: number) => {
    let methods = await prisma.paymentMethod.findMany({
        where: { businessId, isActive: true },
        orderBy: { id: 'asc' }
    });

    if (methods.length === 0) {
        methods = await prisma.paymentMethod.findMany({
            where: { businessId: null, isActive: true },
            orderBy: { id: 'asc' }
        });
    }
    return methods;
};

export const resolveStorePaymentMethod = async (
    businessId: number,
    requestedMethodName?: string,
    preferredCurrency: 'USD' | 'VES' | 'COP' = 'USD'
) => {
    let methods = await listActiveStorePaymentMethods(businessId);
    if (methods.length === 0) {
        methods = await prisma.paymentMethod.findMany({
            where: { isActive: true },
            orderBy: { id: 'asc' }
        });
    }
    if (methods.length === 0) return null;

    const normReq = stripAccents(requestedMethodName || '').toLowerCase().trim();

    // Coincidencia directa por nombre completo o muy cercano primero
    if (normReq) {
        const exactByName = methods.find(m => stripAccents(m.name).toLowerCase().trim() === normReq);
        if (exactByName) return exactByName;
    }

    // Determinar moneda objetivo según lo pedido explícitamente o preferredCurrency
    let targetCurrency: 'USD' | 'VES' | 'COP' = preferredCurrency;
    if (/(pago\s*movil|pagomovil|punto\s*de\s*venta|\bpunto\b|biopago|debito|bolivar|\bbs\b|\bves\b)/.test(normReq)) {
        targetCurrency = 'VES';
    } else if (/(dolar|\busd\b|divisa|zelle|paypal|cashea|\$)/.test(normReq)) {
        targetCurrency = 'USD';
    } else if (/(\bpeso\b|pesos|\bcop\b)/.test(normReq)) {
        targetCurrency = 'COP';
    }

    // 1. Buscar coincidencia por tipo específico + moneda
    if (/(pago\s*movil|pagomovil)/.test(normReq)) {
        const pm = methods.find(m => m.type === 'MOBILE_PAYMENT' || stripAccents(m.name).toLowerCase().includes('pago movil'));
        if (pm) return pm;
    }
    if (/(punto\s*de\s*venta|\bpunto\b|debito|biopago|tarjeta)/.test(normReq)) {
        const pos = methods.find(m => m.type === 'DEBIT_CARD' || m.type === 'CREDIT_CARD' || stripAccents(m.name).toLowerCase().includes('punto'));
        if (pos) return pos;
    }
    if (/zelle/.test(normReq)) {
        const zelle = methods.find(m => m.type === 'ZELLE' || stripAccents(m.name).toLowerCase().includes('zelle'));
        if (zelle) return zelle;
    }
    if (/cashea/.test(normReq)) {
        const cashea = methods.find(m => stripAccents(m.name).toLowerCase().includes('cashea'));
        if (cashea) return cashea;
    }
    if (/transferencia/.test(normReq)) {
        const tr = methods.find(m => m.type === 'TRANSFER' && m.currency === targetCurrency)
            || methods.find(m => m.type === 'TRANSFER');
        if (tr) return tr;
    }

    // 2. Coincidencia por nombre parcial antes de caer en efectivo genérico
    if (normReq) {
        const byNameAndCurr = methods.find(m => m.currency === targetCurrency && stripAccents(m.name).toLowerCase().includes(normReq));
        if (byNameAndCurr) return byNameAndCurr;
        const byNameOnly = methods.find(m => stripAccents(m.name).toLowerCase().includes(normReq));
        if (byNameOnly) return byNameOnly;
    }

    // 3. Si es efectivo o por defecto, buscar CASH en la moneda objetivo
    if (!normReq || /(efectivo|dolar|\busd\b|divisa|bolivar|\bbs\b|\bves\b|\bpeso\b|pesos|\bcop\b)/.test(normReq)) {
        const cashInTarget = methods.find(m => m.type === 'CASH' && m.currency === targetCurrency);
        if (cashInTarget) return cashInTarget;
    }

    // 4. Cualquier método activo en la moneda objetivo (priorizando CASH)
    const anyInTarget = methods.find(m => m.currency === targetCurrency && m.type === 'CASH')
        || methods.find(m => m.currency === targetCurrency);
    if (anyInTarget) return anyInTarget;

    return methods[0];
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
    },
    {
        name: 'consultar_top_clientes',
        description: 'Consulta el ranking de los clientes estrella que más compras han realizado en el negocio (ordenados por volumen total comprado en USD y número de pedidos).',
        parameters: {
            type: 'OBJECT',
            properties: {
                limit: { type: 'NUMBER', description: 'Cantidad de clientes en el ranking. Por defecto 5.' },
                fromDate: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD.' },
                toDate: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD.' }
            }
        }
    },
    {
        name: 'consultar_compras_proveedores',
        description: 'Consulta las compras realizadas a proveedores de mercancía, facturas de compras recientes, total gastado en reposición y saldo pendiente por pagar a proveedores.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD.' },
                toDate: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD.' }
            }
        }
    },
    {
        name: 'consultar_estado_cajas',
        description: 'Consulta el estado operativo de las cajas registradoras de la empresa (si están abiertas o cerradas, cajero responsable, saldo inicial en apertura y montos de cierre).',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'consultar_cotizaciones_presupuestos',
        description: 'Consulta las cotizaciones o presupuestos emitidos a clientes, montos totales cotizados y estados (pendientes, aprobados, rechazados).',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD.' },
                toDate: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD.' }
            }
        }
    },
    {
        name: 'auditar_fugas_y_dinero_dormido',
        description: 'Audita la salud operativa y financiera del negocio detectando: 1) Faltantes o descuadres en cierres de caja recientes, 2) Artículos vendidos por debajo del costo o con margen crítico (< 5%), 3) Dinero dormido / mercancía congelada en inventario que no registra ventas en los últimos 45 días, calculando el capital total paralizado.',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'generar_mensaje_cobranza_whatsapp',
        description: 'Genera un mensaje formal y cortés de cobranza para un cliente con cuotas o deuda pendiente, con enlace directo para abrir el chat de WhatsApp listo para enviar.',
        parameters: {
            type: 'OBJECT',
            properties: {
                clientSearch: { type: 'STRING', description: 'Nombre, teléfono o cédula del cliente a cobrar.' },
                tone: { type: 'STRING', description: 'Tono del mensaje: "cordial_recordatorio" o "formal_vencido". Por defecto "cordial_recordatorio".' }
            },
            required: ['clientSearch']
        }
    },
    {
        name: 'ejecutar_crear_gasto',
        description: 'Registra un gasto operativo real en el sistema Guardián usando la tasa oficial BCV si es en Bolívares. IMPORTANTE: Nunca inventes monto, moneda ni categoría; si falta confirmar, llama primero con confirmed=false para mostrar el resumen y esperar confirmación del usuario.',
        parameters: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING', description: 'Título o concepto del gasto (ej: "Compra de bolsas plásticas", "Pago de internet").' },
                amountUSD: { type: 'NUMBER', description: 'Monto del gasto en dólares USD (usar si el usuario indicó USD/$).' },
                amountVES: { type: 'NUMBER', description: 'Monto del gasto en Bolívares Bs/VES (usar si el usuario indicó bolívares).' },
                categoryName: { type: 'STRING', description: 'Nombre de la categoría (ej: "Suministros", "Servicios", "Operativo").' },
                beneficiary: { type: 'STRING', description: 'Beneficiario o persona que recibió el pago. Opcional.' },
                reference: { type: 'STRING', description: 'Comprobante o referencia del pago. Opcional.' },
                confirmed: { type: 'BOOLEAN', description: 'Obligatorio false (o omitir) la primera vez para mostrar resumen y pedir confirmación. Pasar true ÚNICAMENTE cuando el usuario confirme explícitamente.' }
            },
            required: ['title']
        }
    },
    {
        name: 'ejecutar_cambiar_precio_producto',
        description: 'Actualiza el precio de venta de un producto en el catálogo e inventario de la empresa. IMPORTANTE: Llama primero con confirmed=false para desambiguar el producto, validar que no quede por debajo del costo y pedir confirmación explícita.',
        parameters: {
            type: 'OBJECT',
            properties: {
                search: { type: 'STRING', description: 'Nombre o código SKU del producto a actualizar.' },
                newSalePriceUSD: { type: 'NUMBER', description: 'Nuevo precio de venta en dólares USD.' },
                confirmed: { type: 'BOOLEAN', description: 'Pasar false para previsualizar el cambio y marginado; pasar true ÚNICAMENTE cuando el usuario haya confirmado.' }
            },
            required: ['search', 'newSalePriceUSD']
        }
    },
    {
        name: 'consultar_comisiones_vendedores',
        description: 'Consulta el reporte oficial de comisiones ganadas por los vendedores y colaboradores de la empresa en un rango de fechas. Muestra facturas emitidas, volumen vendido en USD, porcentaje de comisión asignado, deducciones por devoluciones y comisión total acumulada a liquidar para cada vendedor.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio formato YYYY-MM-DD. Opcional.' },
                toDate: { type: 'STRING', description: 'Fecha fin formato YYYY-MM-DD. Opcional.' },
                sellerName: { type: 'STRING', description: 'Nombre o filtro del vendedor específico a consultar. Opcional.' }
            }
        }
    },
    {
        name: 'consultar_reporte_financiero',
        description: 'Consulta el balance financiero integral y estado de resultados del negocio: facturación bruta, notas de crédito/devoluciones, ingresos netos reales, costo de mercancía vendida (COGS), utilidad bruta con margen bruto %, gastos operativos, comisiones pagadas a vendedores, y la utilidad o ganancia neta real en USD junto con el margen neto % para un rango de fechas.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio formato YYYY-MM-DD. Opcional.' },
                toDate: { type: 'STRING', description: 'Fecha fin formato YYYY-MM-DD. Opcional.' }
            }
        }
    },
    {
        name: 'consultar_reporte_almacenes_depositos',
        description: 'Consulta el estado y valorización de todos los depósitos y almacenes físicos de la empresa: total de depósitos activos, unidades totales en existencia, capital total invertido a costo de reposición y valor comercial proyectado a precio de venta.',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    }
,
    {
        name: 'ejecutar_abonar_a_cliente',
        description: 'Prepara y registra un abono o pago a crédito de un cliente (FIFO). REGLA ESTRICTA: Nunca inventes método de pago ni elijas cliente al azar. Si falta el método de pago o hay varios clientes con el mismo nombre, devuélvelo al usuario para elegir. Usa confirmed=false primero para mostrar el resumen de abono y confirmed=true SOLO tras confirmación.',
        parameters: {
            type: 'OBJECT',
            properties: {
                clientSearch: { type: 'STRING', description: 'Nombre, apellido, cédula o teléfono del cliente (ej: "Pedro Pérez", "24890123").' },
                amountUSD: { type: 'NUMBER', description: 'Monto a abonar expresado en dólares USD (ej: 10). Usar cuando el usuario indique el monto en dólares o divisas.' },
                amountVES: { type: 'NUMBER', description: 'Monto a abonar expresado en Bolívares VES / Bs (ej: 4500). Usar únicamente si el usuario indicó el monto pagado en bolívares.' },
                payFullDebt: { type: 'BOOLEAN', description: 'Colocar en true si el usuario indica que el cliente pagó o canceló toda su deuda pendiente.' },
                paymentMethodName: { type: 'STRING', description: 'Método de pago exacto indicado por el usuario (ej: "Efectivo Dólares", "Efectivo Bolívares", "Pago Móvil", "Punto de Venta", "Zelle", "Transferencia"). NO inventar si el usuario no lo especificó.' },
                reference: { type: 'STRING', description: 'Número de referencia bancaria o nota del abono. Opcional.' },
                confirmed: { type: 'BOOLEAN', description: 'Pasar false para previsualizar el abono y pedir confirmación; pasar true ÚNICAMENTE cuando el usuario confirme.' }
            },
            required: ['clientSearch']
        }
    },
    {
        name: 'sugerir_reposicion_compras_proveedores',
        description: 'Analiza el inventario del negocio y la velocidad de ventas de los últimos 30 días para predecir cuándo se agotará cada producto. Identifica productos en quiebre o riesgo de agotarse en los próximos 7 días, calcula la cantidad de reposición recomendada y redacta el mensaje de pedido para WhatsApp al proveedor.',
        parameters: {
            type: 'OBJECT',
            properties: {
                daysThreshold: { type: 'NUMBER', description: 'Días de inventario de tolerancia para considerar en riesgo (por defecto 7 días).' }
            }
        }
    },
    {
        name: 'consultar_resumen_apertura_matutino',
        description: 'Genera el resumen ejecutivo matutino ("Briefing de Apertura") para el dueño o administrador: 1) Cobranzas y cuotas de crédito que vencen hoy o esta semana, 2) Productos en riesgo crítico de agotarse hoy, 3) Meta de ventas sugerida basada en el mismo día de la semana anterior, 4) Estado operativo de cajas registradoras.',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'ejecutar_crear_producto',
        description: 'Prepara y crea un nuevo producto en el catálogo e inventario. IMPORTANTE: Llama primero con confirmed=false para mostrar categoría, impuesto asignado, unidad, almacén, costo, venta y margen y pedir confirmación al usuario antes de guardar.',
        parameters: {
            type: 'OBJECT',
            properties: {
                name: { type: 'STRING', description: 'Nombre del producto a crear (ej: "Galletas María 100g").' },
                costPriceUSD: { type: 'NUMBER', description: 'Precio de costo del producto en dólares USD.' },
                salePriceUSD: { type: 'NUMBER', description: 'Precio de venta al público (PVP) en dólares USD.' },
                initialStock: { type: 'NUMBER', description: 'Cantidad inicial de unidades físicas en stock. Opcional, por defecto 0.' },
                sku: { type: 'STRING', description: 'Código de barras o SKU del producto. Opcional.' },
                categoryName: { type: 'STRING', description: 'Nombre de la categoría (ej: "Snacks", "Bebidas", "Víveres"). Opcional.' },
                isExempt: { type: 'BOOLEAN', description: 'true si el producto es exento de IVA; false/omitir para impuesto estándar.' },
                description: { type: 'STRING', description: 'Descripción o notas del producto. Opcional.' },
                confirmed: { type: 'BOOLEAN', description: 'Pasar false para previsualizar los datos antes de crear; pasar true ÚNICAMENTE cuando el usuario confirme.' }
            },
            required: ['name', 'costPriceUSD', 'salePriceUSD']
        }
    },
    {
        name: 'auditar_fraude_y_anulaciones_caja',
        description: 'Audita las operaciones de caja y facturación para detectar posibles fraudes, mermas o irregularidades: lista ventas canceladas/anuladas, notas de crédito emitidas, cajeros con mayor frecuencia de cancelación y descuentos manuales inusuales.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fromDate: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD. Opcional, por defecto últimos 7 días.' },
                toDate: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD. Opcional, por defecto hoy.' }
            }
        }
    },
    {
        name: 'generar_promociones_combos_estancados',
        description: 'Identifica mercancía fría o dinero dormido (productos sin ventas en las últimas semanas con stock disponible) y genera combos promocionales inteligentes combinándolos con los productos más vendidos, calculando precios de oferta atractivos con margen protegido y copy publicitario listo para WhatsApp / Instagram.',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'ejecutar_crear_venta',
        description: 'Prepara (pre-venta) o procesa una venta real en Guardián (POS). REGLAS OBLIGATORIAS ANTI-AZAR: 1) NUNCA inventes clientSearch ni paymentMethodName ni condition si el usuario no los dijo explícitamente; pásalos vacíos si faltan para que el sistema devuelva las preguntas y opciones reales de la tienda. 2) Si el usuario dice solo "véndeme X", llama a esta herramienta sin inventar datos y con confirmed=false; la herramienta validará stock/productos y preguntará qué cliente, si es contado o crédito y con qué método de pago. 3) Usa confirmed=true ÚNICAMENTE después de mostrar el resumen de pre-venta y recibir confirmación explícita del usuario.',
        parameters: {
            type: 'OBJECT',
            properties: {
                items: {
                    type: 'ARRAY',
                    description: 'Lista de productos a vender.',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            productSearch: { type: 'STRING', description: 'Nombre exacto o parcial del producto a vender.' },
                            quantity: { type: 'NUMBER', description: 'Cantidad de unidades a vender (ej: 1, 2, 5).' },
                            unitPriceUSD: { type: 'NUMBER', description: 'Precio unitario personalizado en dólares USD si el usuario lo especificó. Opcional.' }
                        },
                        required: ['productSearch', 'quantity']
                    }
                },
                clientSearch: { type: 'STRING', description: 'Nombre, cédula o teléfono del cliente, o "Consumidor Final" SOLO si el usuario lo pidió o confirmó explícitamente. NO inventar.' },
                condition: { type: 'STRING', description: 'Condición: "CASH" para contado o "CREDIT" para crédito. NO asumir si no está claro en el mensaje.' },
                paymentMethodName: { type: 'STRING', description: 'Método de pago indicado por el usuario (ej: "Efectivo Dólares", "Efectivo Bolívares", "Pago Móvil", "Punto de Venta", "Zelle"). NO asumir si es contado y no se indicó.' },
                depotName: { type: 'STRING', description: 'Nombre del almacén o depósito si la tienda tiene múltiples depósitos y el usuario especificó uno.' },
                discountUSD: { type: 'NUMBER', description: 'Descuento global en dólares USD. Opcional, por defecto 0.' },
                reference: { type: 'STRING', description: 'Referencia bancaria o nota de comprobante. Opcional.' },
                creditDays: { type: 'NUMBER', description: 'Si la venta es a crédito, días de plazo para pagar (ej: 15 o 30). Opcional, por defecto 15.' },
                confirmed: { type: 'BOOLEAN', description: 'Obligatorio false en el primer paso para mostrar pre-venta y pedir confirmación. Pasar true ÚNICAMENTE tras confirmación explícita del usuario.' }
            },
            required: ['items']
        }
    }
];

export async function executeAiTool(
    toolName: string, 
    args: any, 
    businessId: number, 
    tzOffset: number = 240,
    userId?: number,
    userContext?: AiUserContext
): Promise<ToolExecutionResult> {
    const defaultDate = getLocalDateStr(tzOffset, 0);

    // Enforcement estricto de permisos RBAC antes de ejecutar cualquier herramienta
    const effectiveUserId = userId ?? userContext?.userId;
    let resolvedContext = userContext;
    if (!resolvedContext && effectiveUserId) {
        const member = await resolveActiveMemberForUser(businessId, effectiveUserId);
        if (member) {
            resolvedContext = {
                userId: effectiveUserId,
                membershipId: member.id,
                roleCode: member.role?.code,
                isSuperAdmin: false
            };
        }
    }

    if (resolvedContext) {
        const permCheck = await checkToolPermission(toolName, resolvedContext);
        if (!permCheck.allowed) {
            return {
                data: {
                    status: 'FORBIDDEN',
                    mensaje: `No tienes permisos suficientes para ejecutar esta operación o consultar esta información con tu rol actual (${resolvedContext.roleCode || 'Sin rol'}). Solicita acceso a un administrador.`
                }
            };
        }
    }

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
            const whereSale: any = {
                businessId,
                status: { not: 'CANCELLED' },
                deletedAt: null
            };
            let periodoStr = 'Histórico global del negocio';
            if (args?.fromDate || args?.toDate) {
                const { fromStr, toStr, startDate, endDate } = parseDateRange(args?.fromDate, args?.toDate, tzOffset);
                whereSale.createdAt = { gte: startDate, lte: endDate };
                periodoStr = `${fromStr} al ${toStr}`;
            }

            const grouped = await prisma.saleItem.groupBy({
                by: ['productId'],
                where: {
                    sale: whereSale
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
                    periodo: periodoStr,
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
            const searchVariants = getSearchVariants(search);
            const normalize = (s: string) => stripAccents(s || '').toLowerCase().trim();
            const target = normalize(search);

            const products = await prisma.product.findMany({
                where: {
                    businessId,
                    isActive: true,
                    OR: [
                        ...searchVariants.map(term => ({ name: { contains: term, mode: 'insensitive' as const } })),
                        ...searchVariants.map(term => ({ sku: { contains: term, mode: 'insensitive' as const } })),
                        ...searchVariants.map(term => ({ secondaryCode: { contains: term, mode: 'insensitive' as const } }))
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    secondaryCode: true,
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
                take: 20
            });

            // Ordenar por relevancia: coincidencias exactas primero, luego las que comienzan con el término y con más stock
            products.sort((a, b) => {
                const aNorm = normalize(a.name);
                const bNorm = normalize(b.name);
                const aExact = (aNorm === target || normalize(a.sku || '') === target || normalize(a.secondaryCode || '') === target) ? 1 : 0;
                const bExact = (bNorm === target || normalize(b.sku || '') === target || normalize(b.secondaryCode || '') === target) ? 1 : 0;
                if (aExact !== bExact) return bExact - aExact;

                const aStarts = aNorm.startsWith(target) ? 1 : 0;
                const bStarts = bNorm.startsWith(target) ? 1 : 0;
                if (aStarts !== bStarts) return bStarts - aStarts;

                const aStock = a.stockLots.reduce((acc, l) => acc + Number(l.quantity), 0);
                const bStock = b.stockLots.reduce((acc, l) => acc + Number(l.quantity), 0);
                return bStock - aStock;
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

        case 'consultar_top_clientes': {
            const limit = Math.min(Number(args?.limit ?? 5), 20);
            const whereClause: any = {
                businessId,
                status: { not: 'CANCELLED' },
                deletedAt: null
            };
            let periodoStr = 'Histórico global del negocio';
            if (args?.fromDate || args?.toDate) {
                const { fromStr, toStr, startDate, endDate } = parseDateRange(args?.fromDate, args?.toDate, tzOffset);
                whereClause.createdAt = { gte: startDate, lte: endDate };
                periodoStr = `${fromStr} al ${toStr}`;
            }

            const grouped = await prisma.sale.groupBy({
                by: ['clientId'],
                where: whereClause,
                _sum: { totalAmount: true },
                _count: { id: true },
                orderBy: { _sum: { totalAmount: 'desc' } },
                take: limit
            });

            const clientIds = grouped.map(g => g.clientId);
            const clients = await prisma.client.findMany({
                where: { id: { in: clientIds } },
                select: { id: true, name: true, ci: true, phone: true }
            });
            const clientMap = new Map(clients.map(c => [c.id, c]));

            return {
                data: {
                    periodo: periodoStr,
                    top_clientes: grouped.map(g => {
                        const c = clientMap.get(g.clientId);
                        return {
                            cliente: c?.name || `Cliente #${g.clientId}`,
                            cedula_rif: c?.ci || 'N/A',
                            telefono: c?.phone || 'No registrado',
                            total_comprado_usd: Number(Number(g._sum.totalAmount || 0).toFixed(2)),
                            cantidad_pedidos: g._count.id
                        };
                    })
                }
            };
        }

        case 'consultar_compras_proveedores': {
            const { fromStr, toStr, startDate, endDate } = parseDateRange(args?.fromDate, args?.toDate, tzOffset);

            const purchases = await prisma.purchase.findMany({
                where: {
                    businessId,
                    createdAt: { gte: startDate, lte: endDate }
                },
                include: {
                    supplier: { select: { id: true, nameCompany: true, contactName: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 8
            });

            const agg = await prisma.purchase.aggregate({
                where: {
                    businessId,
                    createdAt: { gte: startDate, lte: endDate }
                },
                _sum: { totalCost: true, remainingBalance: true },
                _count: { id: true }
            });

            return {
                data: {
                    periodo: `${fromStr} al ${toStr}`,
                    total_compras_usd: Number(Number(agg._sum.totalCost || 0).toFixed(2)),
                    saldo_pendiente_a_proveedores_usd: Number(Number(agg._sum.remainingBalance || 0).toFixed(2)),
                    cantidad_facturas_compra: agg._count.id,
                    compras_recientes: purchases.map(p => ({
                        compra_id: p.id,
                        proveedor: p.supplier?.nameCompany || p.supplier?.contactName || 'Proveedor General',
                        monto_total_usd: Number(p.totalCost),
                        saldo_pendiente_usd: Number(p.remainingBalance),
                        condicion: p.conditions,
                        estado_pago: p.paymentStatus,
                        fecha: p.createdAt.toISOString().split('T')[0]
                    }))
                }
            };
        }

        case 'consultar_estado_cajas': {
            const registers = await prisma.cashRegister.findMany({
                where: { businessId },
                include: {
                    member: {
                        select: {
                            user: { select: { id: true, name: true, ci: true } }
                        }
                    }
                },
                orderBy: { openTime: 'desc' },
                take: 6
            });

            return {
                data: {
                    cajas_registradoras: registers.map(r => ({
                        caja_id: r.id,
                        cajero: r.member?.user?.name || 'Usuario',
                        estado: r.status,
                        monto_inicial_usd: Number(r.initialAmount),
                        monto_final_usd: r.finalAmount ? Number(r.finalAmount) : null,
                        hora_apertura: r.openTime.toISOString(),
                        hora_cierre: r.closeTime ? r.closeTime.toISOString() : 'Aún abierta'
                    }))
                }
            };
        }

        case 'consultar_cotizaciones_presupuestos': {
            const { fromStr, toStr, startDate, endDate } = parseDateRange(args?.fromDate, args?.toDate, tzOffset);

            const quotations = await prisma.quotation.findMany({
                where: {
                    businessId,
                    deletedAt: null,
                    createdAt: { gte: startDate, lte: endDate }
                },
                include: {
                    client: { select: { name: true, ci: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 8
            });

            const agg = await prisma.quotation.aggregate({
                where: {
                    businessId,
                    deletedAt: null,
                    createdAt: { gte: startDate, lte: endDate }
                },
                _sum: { totalAmount: true },
                _count: { id: true }
            });

            return {
                data: {
                    periodo: `${fromStr} al ${toStr}`,
                    total_cotizado_usd: Number(Number(agg._sum.totalAmount || 0).toFixed(2)),
                    cantidad_cotizaciones: agg._count.id,
                    cotizaciones_recientes: quotations.map(q => ({
                        recibo_numero: q.receiptNumber,
                        cliente: q.client?.name || 'Cliente Ocasional',
                        monto_total_usd: Number(q.totalAmount),
                        estado: q.status,
                        valido_hasta: q.validUntil ? q.validUntil.toISOString().split('T')[0] : 'Sin fecha límite'
                    }))
                }
            };
        }

        case 'auditar_fugas_y_dinero_dormido': {
            const recentClosedBoxes = await prisma.cashRegister.findMany({
                where: { businessId, status: 'CLOSED' },
                orderBy: { openTime: 'desc' },
                take: 5,
                include: { member: { include: { user: true } } }
            });

            const fortyFiveDaysAgo = new Date(Date.now() - (45 * 24 * 60 * 60_000));
            const recentSaleProductIds = await prisma.saleItem.findMany({
                where: {
                    sale: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        createdAt: { gte: fortyFiveDaysAgo }
                    }
                },
                select: { productId: true },
                distinct: ['productId']
            });
            const soldProductIds = new Set(recentSaleProductIds.map(s => s.productId));

            const products = await prisma.product.findMany({
                where: { businessId, isActive: true },
                select: {
                    id: true,
                    name: true,
                    sku: true,
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

            let capitalCongeladoUSD = 0;
            const itemsDormidos: any[] = [];
            const lowMarginRisk: any[] = [];

            for (const p of products) {
                let totalStock = 0;
                for (const lot of p.stockLots) {
                    const q = Number(lot.quantity);
                    if (q > 0) totalStock += q;
                }

                const cost = Number(p.costPrice);
                const sale = Number(p.salePrice);

                if (totalStock > 0 && !soldProductIds.has(p.id)) {
                    const paralizado = totalStock * cost;
                    capitalCongeladoUSD += paralizado;
                    if (itemsDormidos.length < 8) {
                        itemsDormidos.push({
                            producto: p.name,
                            sku: p.sku || 'S/N',
                            unidades_congeladas: totalStock,
                            costo_unitario_usd: cost,
                            precio_venta_usd: sale,
                            capital_inmovilizado_usd: Number(paralizado.toFixed(2))
                        });
                    }
                }

                if (sale > 0 && cost > 0) {
                    if (sale <= cost || ((sale - cost) / sale) < 0.05) {
                        if (lowMarginRisk.length < 5) {
                            lowMarginRisk.push({
                                producto: p.name,
                                costo_reposicion_usd: cost,
                                precio_venta_actual_usd: sale,
                                margen_pct: Number((((sale - cost) / sale) * 100).toFixed(2))
                            });
                        }
                    }
                }
            }

            return {
                data: {
                    resumen_auditoria: 'Auditoría forense de operaciones, cajas y rotación de inventario completada.',
                    dinero_dormido_total_usd: Number(capitalCongeladoUSD.toFixed(2)),
                    productos_sin_rotacion_45_dias: itemsDormidos,
                    productos_con_margen_critico_o_perdida: lowMarginRisk,
                    cajas_recientes_revisadas: recentClosedBoxes.map(b => ({
                        caja_id: b.id,
                        cajero: b.member?.user?.name || 'Cajero',
                        fecha_apertura: b.openTime.toISOString().split('T')[0],
                        fecha_cierre: b.closeTime ? b.closeTime.toISOString().split('T')[0] : 'N/D',
                        estado: b.status
                    }))
                }
            };
        }

        case 'generar_mensaje_cobranza_whatsapp': {
            const clientSearch = String(args?.clientSearch || '').trim();
            const tone = args?.tone || 'cordial_recordatorio';

            const { exactMatch, candidates } = await findBusinessClientCandidates(businessId, clientSearch, true);

            if (candidates.length === 0) {
                return {
                    data: {
                        status: 'NOT_FOUND',
                        mensaje: `No se encontró ningún cliente registrado que coincida con "${clientSearch}".`
                    }
                };
            }

            if (!exactMatch && candidates.length > 1) {
                const top = candidates.slice(0, 5);
                return {
                    data: {
                        status: 'AMBIGUOUS_CLIENT',
                        mensaje: `Encontré varios clientes que coinciden con "${clientSearch}". ¿A cuál deseas enviarle el mensaje de cobranza?`,
                        candidatos: top.map(c => ({
                            nombre: c.name,
                            cedula: c.ci || 'N/A',
                            telefono: c.phone || 'Sin teléfono',
                            deuda_pendiente_usd: Number(
                                (c.sales?.length
                                    ? c.sales.reduce((acc: number, s: any) => acc + Number(s.remainingBalance), 0)
                                    : Number(c.currentDebt || 0)
                                ).toFixed(2)
                            )
                        }))
                    },
                    suggestedOptions: top.map(c => `Cobranza WhatsApp a ${c.name}`)
                };
            }

            const client = exactMatch || candidates[0];
            const salesPendingUSD = Array.isArray(client.sales) && client.sales.length > 0
                ? client.sales.reduce((acc: number, s: any) => acc + Number(s.remainingBalance), 0)
                : Number(client.currentDebt || 0);
            const totalDeudaUSD = Number(salesPendingUSD.toFixed(2));

            const [business, rateRecord] = await Promise.all([
                prisma.business.findUnique({
                    where: { id: businessId },
                    select: { name: true, currentExchangeRate: true, document: true }
                }),
                resolveBusinessExchangeRate(businessId, prisma).catch(() => null)
            ]);

            const bcvRate = Number(rateRecord?.rate || business?.currentExchangeRate || 0);
            const totalBs = bcvRate > 0 ? Number((totalDeudaUSD * bcvRate).toFixed(2)) : 0;
            const bizName = business?.name || 'nuestra empresa';

            let msg = '';
            if (tone === 'formal_vencido' || totalDeudaUSD > 0) {
                const bsDetail = bcvRate > 0
                    ? ` (equivalente a Bs. ${totalBs.toLocaleString('es-VE')} a tasa oficial BCV de ${bcvRate.toFixed(2)})`
                    : '';
                msg = `Estimado(a) ${client.name}, le saludamos formalmente de ${bizName}. Le recordamos que presenta un saldo pendiente por un total de $${totalDeudaUSD.toFixed(2)} USD${bsDetail}. Agradecemos coordinar su pago a la brevedad para mantener su crédito y récord comercial al día. Quedamos atentos a su comprobante. ¡Muchas gracias!`;
            } else {
                msg = `Hola ${client.name}, te saludamos de ${bizName}. Esperamos te encuentres muy bien. Te escribimos cordialmente para consultar si requieres alguna cotización o pedido. ¡Feliz día!`;
            }

            const cleanPhone = (client.phone || '').replace(/[^0-9]/g, '');
            const waPhone = cleanPhone.startsWith('58') ? cleanPhone : (cleanPhone.startsWith('0') ? '58' + cleanPhone.slice(1) : cleanPhone);
            const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;

            return {
                data: {
                    cliente: client.name,
                    cedula_rif: client.ci,
                    telefono: client.phone || 'Sin número registrado',
                    deuda_total_usd: Number(totalDeudaUSD.toFixed(2)),
                    deuda_total_bs: totalBs,
                    tasa_bcv_aplicada: bcvRate > 0 ? bcvRate : undefined,
                    mensaje_propuesto: msg,
                    enlace_whatsapp: waUrl
                },
                action: {
                    type: 'OPEN_WHATSAPP',
                    label: `📲 Abrir WhatsApp y Enviar a ${client.name}`,
                    url: waUrl
                }
            };
        }

        case 'ejecutar_crear_gasto': {
            const title = String(args?.title || '').trim();
            const rawAmountUSD = args?.amountUSD !== undefined && args?.amountUSD !== null ? Number(args.amountUSD) : NaN;
            const rawAmountVES = args?.amountVES !== undefined && args?.amountVES !== null ? Number(args.amountVES) : NaN;
            const categoryName = String(args?.categoryName || '').trim();
            const confirmed = args?.confirmed === true;

            if (!title) {
                return {
                    data: { status: 'INVALID_ARGS', mensaje: 'Debes indicar el concepto o título del gasto.' }
                };
            }

            const hasUSD = !isNaN(rawAmountUSD) && rawAmountUSD > 0;
            const hasVES = !isNaN(rawAmountVES) && rawAmountVES > 0;

            if (!hasUSD && !hasVES) {
                return {
                    data: { status: 'MISSING_FIELDS', mensaje: `Para registrar "${title}", necesito saber el monto exacto y si fue en dólares ($ USD) o en Bolívares (Bs.).` }
                };
            }

            const activeCategories = await prisma.expenseCategory.findMany({
                where: { businessId, isActive: true },
                orderBy: { name: 'asc' }
            });

            let category = categoryName
                ? activeCategories.find(c => stripAccents(c.name).toLowerCase().includes(stripAccents(categoryName).toLowerCase()))
                : undefined;

            if (!category && !categoryName && activeCategories.length > 0) {
                return {
                    data: {
                        status: 'MISSING_FIELDS',
                        mensaje: '¿En qué categoría deseas clasificar este gasto?',
                        categorias_disponibles: activeCategories.map(c => c.name)
                    },
                    suggestedOptions: activeCategories.slice(0, 5).map(c => `Categoría ${c.name}`)
                };
            }

            const targetCurrency = hasVES ? Currency.VES : Currency.USD;
            const targetAmount = hasVES ? rawAmountVES : rawAmountUSD;
            const rateRecord = await resolveBusinessExchangeRate(businessId, prisma).catch(() => null);

            if (targetCurrency === Currency.VES && (!rateRecord || Number(rateRecord.rate) <= 0)) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: 'No hay tasa de cambio BCV configurada para convertir este gasto en Bolívares a USD.'
                    }
                };
            }

            const equivUSD = targetCurrency === Currency.VES && rateRecord
                ? Number((targetAmount / Number(rateRecord.rate)).toFixed(2))
                : Number(targetAmount.toFixed(2));

            const categoryLabel = category ? category.name : (categoryName || 'Gastos Operativos (se creará nueva)');

            if (!confirmed) {
                const summaryLines = [
                    { label: 'Concepto', value: title },
                    { label: 'Categoría', value: categoryLabel },
                    { label: 'Monto', value: targetCurrency === Currency.VES ? `Bs. ${targetAmount.toFixed(2)} (≈ $${equivUSD.toFixed(2)} USD)` : `$${equivUSD.toFixed(2)} USD` },
                    ...(args?.beneficiary ? [{ label: 'Beneficiario', value: String(args.beneficiary) }] : []),
                    ...(args?.reference ? [{ label: 'Referencia', value: String(args.reference) }] : [])
                ];

                return {
                    data: {
                        status: 'CONFIRMATION_REQUIRED',
                        mensaje: `Resumen del gasto listo para confirmar. Responde si autorizas registrarlo.`,
                        resumen_gasto: {
                            concepto: title,
                            categoria: categoryLabel,
                            moneda: targetCurrency,
                            monto: targetAmount,
                            equivalente_usd: equivUSD
                        }
                    },
                    action: {
                        type: 'ACTION_CONFIRM',
                        label: '✅ Confirmar y Registrar Gasto',
                        summaryLines,
                        totalLabel: targetCurrency === Currency.VES ? `Bs. ${targetAmount.toFixed(2)} ($${equivUSD.toFixed(2)})` : `$${equivUSD.toFixed(2)} USD`,
                        confirmMessage: `Sí, confirmo y autorizo registrar el gasto "${title}".`,
                        cancelMessage: 'Cancelar el registro del gasto.'
                    },
                    suggestedOptions: ['✅ Confirmar gasto', '❌ Cancelar']
                };
            }

            if (!category) {
                category = await prisma.expenseCategory.create({
                    data: { businessId, name: categoryName || 'Gastos Operativos' }
                });
            }

            const member = await resolveActiveMemberForUser(businessId, effectiveUserId)
                || await prisma.businessMember.findFirst({ where: { businessId, isActive: true }, orderBy: { id: 'asc' } });

            if (!member) {
                return { data: { status: 'ERROR', mensaje: 'No se encontró un miembro activo de la empresa para registrar el gasto.' } };
            }

            const expRes = await expenseService.create(businessId, member.id, {
                title,
                categoryId: category.id,
                amount: targetAmount,
                currency: targetCurrency,
                beneficiary: args?.beneficiary ? String(args.beneficiary).trim() : undefined,
                reference: args?.reference ? String(args.reference).trim() : 'Registro Asistente AI'
            });

            if (expRes.status !== 201 && expRes.status !== 200 || !expRes.data) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: expRes.message || 'No se pudo registrar el gasto.'
                    }
                };
            }

            const createdExp: any = expRes.data;
            return {
                data: {
                    status: 'SUCCESS',
                    mensaje: `Gasto registrado con éxito en el sistema.`,
                    gasto_id: createdExp.id,
                    concepto: createdExp.title,
                    moneda: createdExp.currency,
                    monto_original: Number(createdExp.amount),
                    monto_usd: Number(createdExp.amountInUSD),
                    categoria: category.name,
                    fecha: createdExp.expenseDate.toISOString().split('T')[0]
                },
                action: {
                    type: 'NAVIGATE',
                    label: '💸 Ver Gastos Registrados',
                    url: '/expenses'
                }
            };
        }

        case 'ejecutar_cambiar_precio_producto': {
            const search = String(args?.search || '').trim();
            const newPrice = Number(args?.newSalePriceUSD || 0);
            const confirmed = args?.confirmed === true;

            if (!search || isNaN(newPrice) || newPrice <= 0) {
                return {
                    data: { status: 'INVALID_ARGS', mensaje: 'Debe especificar un nombre de producto y un nuevo precio mayor a 0 en USD.' }
                };
            }

            const normTarget = stripAccents(search).toLowerCase().trim();
            const variants = getSearchVariants(search);
            const candidates = await prisma.product.findMany({
                where: {
                    businessId,
                    isActive: true,
                    OR: [
                        ...variants.map(v => ({ name: { contains: v, mode: 'insensitive' as const } })),
                        ...variants.map(v => ({ sku: { contains: v, mode: 'insensitive' as const } }))
                    ]
                },
                take: 10
            });

            if (candidates.length === 0) {
                return {
                    data: {
                        status: 'NOT_FOUND',
                        mensaje: `No se encontró ningún artículo en catálogo que coincida con "${search}".`
                    }
                };
            }

            const exactMatch = candidates.find(p =>
                stripAccents(p.name).toLowerCase().trim() === normTarget
                || stripAccents(p.sku || '').toLowerCase().trim() === normTarget
            );

            if (!exactMatch && candidates.length > 1) {
                const top = candidates.slice(0, 5);
                return {
                    data: {
                        status: 'AMBIGUOUS_PRODUCT',
                        mensaje: `Encontré varios productos que coinciden con "${search}". Especifica cuál deseas actualizar:`,
                        candidatos: top.map(p => ({
                            nombre: p.name,
                            sku: p.sku || 'S/N',
                            precio_actual_usd: Number(p.salePrice),
                            costo_usd: Number(p.costPrice)
                        }))
                    },
                    suggestedOptions: top.map(p => `Cambiar precio de ${p.name} a $${newPrice.toFixed(2)}`)
                };
            }

            const product = exactMatch || candidates[0];
            const oldPrice = Number(product.salePrice);
            const costPrice = Number(product.costPrice);
            const belowCost = newPrice < costPrice;
            const newMargin = newPrice > 0 ? Math.max(0, (newPrice - costPrice) / newPrice) : 0;

            if (!confirmed) {
                return {
                    data: {
                        status: 'CONFIRMATION_REQUIRED',
                        alerta_bajo_costo: belowCost ? `⚠️ ADVERTENCIA: El nuevo precio ($${newPrice.toFixed(2)}) es MENOR al costo de reposición ($${costPrice.toFixed(2)}). Habrá pérdida por unidad.` : undefined,
                        resumen_cambio_precio: {
                            producto: product.name,
                            sku: product.sku || 'S/N',
                            precio_anterior_usd: oldPrice,
                            precio_nuevo_usd: newPrice,
                            costo_usd: costPrice,
                            nuevo_margen_pct: `${(newMargin * 100).toFixed(1)}%`
                        },
                        mensaje: `${belowCost ? '⚠️ ALERTA: El precio nuevo queda POR DEBAJO del costo. ' : ''}Confirma si deseas cambiar el precio de "${product.name}" de $${oldPrice.toFixed(2)} a $${newPrice.toFixed(2)} USD.`
                    },
                    action: {
                        type: 'ACTION_CONFIRM',
                        label: belowCost ? '⚠️ Confirmar Cambio (Bajo Costo)' : '✅ Confirmar Cambio de Precio',
                        summaryLines: [
                            { label: 'Producto', value: product.name },
                            { label: 'Precio actual', value: `$${oldPrice.toFixed(2)} USD` },
                            { label: 'Costo referencial', value: `$${costPrice.toFixed(2)} USD` },
                            { label: 'Nuevo margen', value: `${(newMargin * 100).toFixed(1)}%` }
                        ],
                        totalLabel: `Nuevo PVP: $${newPrice.toFixed(2)} USD`,
                        confirmMessage: `Sí, confirmo cambiar el precio de ${product.name} a ${newPrice.toFixed(2)} USD.`,
                        cancelMessage: 'Cancelar cambio de precio.'
                    },
                    suggestedOptions: ['✅ Confirmar cambio de precio', '❌ Cancelar']
                };
            }

            const updated = await prisma.product.update({
                where: { id: product.id },
                data: {
                    salePrice: newPrice,
                    profitMargin: new Decimal(newMargin.toFixed(4))
                }
            });

            return {
                data: {
                    status: 'SUCCESS',
                    mensaje: `Precio de venta actualizado exitosamente.`,
                    producto: updated.name,
                    sku: updated.sku || 'S/N',
                    precio_anterior_usd: oldPrice,
                    precio_nuevo_usd: Number(updated.salePrice),
                    costo_referencial_usd: costPrice,
                    margen_nuevo: `${(newMargin * 100).toFixed(1)}%`
                },
                action: {
                    type: 'NAVIGATE',
                    label: '🏷️ Ver en Catálogo',
                    url: '/inventory'
                }
            };
        }

        case 'consultar_comisiones_vendedores': {
            const { fromStr, toStr } = parseDateRange(args?.fromDate, args?.toDate, tzOffset);
            const sellerFilter = String(args?.sellerName || '').toLowerCase().trim();

            const res = await commissionReportService.getCommissionReport(businessId, {
                fromDate: args?.fromDate || fromStr,
                toDate: args?.toDate || toStr,
                tzOffset
            });

            if (res.status !== 200 || !res.data) {
                return {
                    data: {
                        status: 'UNAVAILABLE',
                        mensaje: res.message || 'El reporte de comisiones requiere el Plan Premium o no se pudo generar.'
                    }
                };
            }

            const { summary, membersBreakdown } = res.data;

            let filteredMembers = membersBreakdown;
            if (sellerFilter) {
                filteredMembers = membersBreakdown.filter(m => 
                    m.name.toLowerCase().includes(sellerFilter) || 
                    (m.ci && m.ci.toLowerCase().includes(sellerFilter))
                );
            }

            return {
                data: {
                    periodo: `${args?.fromDate || fromStr} al ${args?.toDate || toStr}`,
                    resumen_global: {
                        total_ventas_brutas_usd: summary.totalSalesGross,
                        total_base_neta_usd: summary.totalSalesNetBase,
                        total_comisiones_a_pagar_usd: summary.totalCommissions,
                        total_devoluciones_descontadas_usd: summary.totalRefunds,
                        total_facturas_emitidas: summary.totalInvoices,
                        vendedores_activos: summary.activeSellersCount
                    },
                    desglose_vendedores: filteredMembers.map(m => ({
                        vendedor: m.name,
                        cedula: m.ci || 'N/A',
                        rol: m.roleName,
                        porcentaje_comision: `${m.configuredCommissionPct}%`,
                        facturas_cerradas: m.totalInvoices,
                        ventas_brutas_usd: m.totalSalesGross,
                        base_neta_ajustada_usd: m.totalSalesNetBase,
                        comision_ganada_usd: m.totalCommissionEarned,
                        devoluciones_descontadas_usd: m.totalRefunds
                    })),
                    mensaje: filteredMembers.length === 0 && sellerFilter
                        ? `No se encontraron registros de comisión para el vendedor "${sellerFilter}" en este período.`
                        : undefined
                }
            };
        }

        case 'consultar_reporte_financiero': {
            const { fromStr, toStr } = parseDateRange(args?.fromDate, args?.toDate, tzOffset);
            const res = await financialReportService.getFinancialOverview(businessId, {
                fromDate: args?.fromDate || fromStr,
                toDate: args?.toDate || toStr,
                tzOffset
            });

            if (res.status !== 200 || !res.data) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: res.message || 'No se pudo generar el reporte financiero.'
                    }
                };
            }

            const d = res.data;
            return {
                data: {
                    periodo: `${args?.fromDate || fromStr} al ${args?.toDate || toStr}`,
                    ingresos: {
                        facturacion_bruta_usd: d.billedRevenue,
                        notas_credito_devoluciones_usd: d.returns,
                        ingresos_netos_usd: d.netRevenue,
                        total_ventas: d.salesCount,
                        ticket_promedio_usd: d.avgTicket
                    },
                    costos_y_utilidad_bruta: {
                        costo_mercancia_vendida_cogs_usd: d.costOfGoodsSold,
                        utilidad_bruta_usd: d.grossProfit,
                        margen_bruto_porcentaje: `${(d.grossMarginPct || 0).toFixed(2)}%`
                    },
                    egresos_operativos: {
                        gastos_operativos_usd: d.directExpenses,
                        comisiones_pagadas_vendedores_usd: d.salesCommissions,
                        total_egresos_operativos_usd: d.totalExpenses
                    },
                    resultado_neto: {
                        utilidad_neta_real_usd: d.netProfit,
                        margen_neto_real_porcentaje: `${(d.netMarginPct || 0).toFixed(2)}%`,
                        es_rentable: d.netProfit > 0
                    },
                    comparativa_periodo_anterior: {
                        variacion_ingresos_pct: `${(d.revenueVariation || 0).toFixed(2)}%`,
                        variacion_utilidad_neta_pct: `${(d.profitVariation || 0).toFixed(2)}%`
                    }
                }
            };
        }

        case 'consultar_reporte_almacenes_depositos': {
            const res = await depositsReportService.getOverview(businessId);
            if (res.status !== 200 || !res.data) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: res.message || 'No se pudo consultar el reporte de depósitos.'
                    }
                };
            }

            const potentialProfit = Math.max(0, res.data.totalSale - res.data.totalCost);
            const marginPct = res.data.totalSale > 0 ? ((potentialProfit / res.data.totalSale) * 100) : 0;

            return {
                data: {
                    total_depositos_activos: res.data.totalDepots,
                    unidades_totales_stock: res.data.totalStock,
                    capital_invertido_costo_usd: Number(res.data.totalCost.toFixed(2)),
                    valor_comercial_venta_usd: Number(res.data.totalSale.toFixed(2)),
                    ganancia_proyectada_usd: Number(potentialProfit.toFixed(2)),
                    margen_promedio_proyectado: `${marginPct.toFixed(2)}%`,
                    productos_unicos_almacenados: res.data.totalProducts
                }
            };
        }

        
        case 'ejecutar_abonar_a_cliente': {
            const clientSearch = String(args?.clientSearch || '').trim();
            const rawAmountUSD = args?.amountUSD !== undefined && args?.amountUSD !== null ? Number(args.amountUSD) : NaN;
            const rawAmountVES = args?.amountVES !== undefined && args?.amountVES !== null ? Number(args.amountVES) : NaN;
            const payFullDebt = Boolean(args?.payFullDebt);
            const paymentMethodName = String(args?.paymentMethodName || '').trim();
            const reference = String(args?.reference || 'Abono registrado por Guardián AI').trim();
            const confirmed = args?.confirmed === true;

            if (!clientSearch) {
                return { data: { status: 'ERROR', mensaje: 'Debes indicar el nombre, cédula o teléfono del cliente a abonar.' } };
            }

            // 1. Buscar cliente de la tienda (insensible a tildes/acentos y desambiguando homónimos)
            const { exactMatch, candidates } = await findBusinessClientCandidates(businessId, clientSearch, true);

            if (candidates.length === 0) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: `No se encontró ningún cliente activo en esta tienda que coincida con "${clientSearch}". Verifica el nombre o regístralo primero.`
                    }
                };
            }

            if (!exactMatch && candidates.length > 1) {
                const top = candidates.slice(0, 5);
                return {
                    data: {
                        status: 'AMBIGUOUS_CLIENT',
                        mensaje: `Encontré varios clientes que coinciden con "${clientSearch}". Indica exactamente a cuál se aplica el abono:`,
                        candidatos: top.map(c => ({
                            nombre: c.name,
                            cedula: c.ci || 'N/A',
                            telefono: c.phone || 'S/T',
                            deuda_usd: Number(
                                (c.sales?.length
                                    ? c.sales.reduce((acc: number, s: any) => acc + Number(s.remainingBalance), 0)
                                    : Number(c.currentDebt || 0)
                                ).toFixed(2)
                            )
                        }))
                    },
                    suggestedOptions: top.map(c => `Abonar a ${c.name} (CI: ${c.ci})`)
                };
            }

            const client = exactMatch || candidates[0];

            // 2. Buscar ventas a crédito pendientes (con saldo mayor a 0)
            const pendingSales = await prisma.sale.findMany({
                where: {
                    businessId,
                    clientId: client.id,
                    status: { not: 'CANCELLED' },
                    deletedAt: null,
                    remainingBalance: { gt: 0 }
                },
                orderBy: { createdAt: 'asc' },
                include: {
                    installments: {
                        where: { status: { not: InstallmentStatus.PAID } },
                        orderBy: { dueDate: 'asc' }
                    }
                }
            });

            if (pendingSales.length === 0) {
                return {
                    data: {
                        status: 'SIN_DEUDA',
                        cliente: client.name,
                        cedula_rif: client.ci,
                        deuda_actual_usd: 0,
                        mensaje: `El cliente ${client.name} está al día. No tiene facturas ni cuentas pendientes por cobrar.`
                    }
                };
            }

            // 3. Resolver Tasa de Cambio Oficial de la tienda
            const exchangeRate = await resolveBusinessExchangeRate(businessId, prisma);
            if (!exchangeRate || Number(exchangeRate.rate) <= 0) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: 'No hay una tasa de cambio activa configurada en el sistema para procesar el abono.'
                    }
                };
            }
            const rateDec = new Decimal(exchangeRate.rate);

            // Calcular deuda total real acumulada en facturas pendientes
            const totalPendingDebtDec = pendingSales.reduce(
                (acc, s) => acc.add(new Decimal(s.remainingBalance)),
                new Decimal(0)
            ).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

            // Determinar el monto en USD a abonar (desde amountUSD, amountVES o payFullDebt)
            let targetAmountUSDDec: Decimal;
            let preferredCurrency: 'USD' | 'VES' = 'USD';

            if (payFullDebt && (isNaN(rawAmountUSD) || rawAmountUSD <= 0) && (isNaN(rawAmountVES) || rawAmountVES <= 0)) {
                targetAmountUSDDec = totalPendingDebtDec;
            } else if (!isNaN(rawAmountUSD) && rawAmountUSD > 0) {
                targetAmountUSDDec = new Decimal(rawAmountUSD).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
                preferredCurrency = 'USD';
            } else if (!isNaN(rawAmountVES) && rawAmountVES > 0) {
                targetAmountUSDDec = new Decimal(rawAmountVES).div(rateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
                preferredCurrency = 'VES';
            } else {
                return {
                    data: {
                        status: 'MISSING_FIELDS',
                        cliente: client.name,
                        deuda_pendiente_usd: Number(totalPendingDebtDec.toFixed(2)),
                        mensaje: `${client.name} tiene una deuda pendiente de $${totalPendingDebtDec.toFixed(2)} USD. ¿Cuánto va a abonar (en $ o Bs.) y con qué método de pago?`
                    },
                    suggestedOptions: [
                        `Cancelar deuda completa ($${totalPendingDebtDec.toFixed(2)})`,
                        `Abonar $10 a ${client.name}`
                    ]
                };
            }

            // 4. Exigir método de pago real de esta tienda (cero suposiciones silenciosas)
            const activeMethods = await listActiveStorePaymentMethods(businessId);
            if (!paymentMethodName) {
                return {
                    data: {
                        status: 'MISSING_FIELDS',
                        cliente: client.name,
                        monto_a_abonar_usd: Number(targetAmountUSDDec.toFixed(2)),
                        deuda_actual_usd: Number(totalPendingDebtDec.toFixed(2)),
                        metodos_pago_disponibles: activeMethods.map(m => `${m.name} (${m.currency})`),
                        mensaje: `Para abonar $${targetAmountUSDDec.toFixed(2)} USD a ${client.name} (deuda actual: $${totalPendingDebtDec.toFixed(2)}), ¿con qué método de pago canceló?`
                    },
                    suggestedOptions: activeMethods.slice(0, 6).map(m => m.name)
                };
            }

            const paymentMethod = await resolveStorePaymentMethod(
                businessId,
                paymentMethodName,
                preferredCurrency
            );

            if (!paymentMethod) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: 'No hay métodos de pago activos configurados en la empresa.'
                    }
                };
            }

            // Si el método es COP, obtener tasa COP de la tienda
            let copRateDec = new Decimal(4000);
            if (paymentMethod.currency === 'COP') {
                const biz = await prisma.business.findUnique({ where: { id: businessId } });
                if ((biz as any)?.copExchangeRate && Number((biz as any).copExchangeRate) > 0) {
                    copRateDec = new Decimal((biz as any).copExchangeRate);
                }
            }

            // 5. Buscar caja registradora abierta (priorizando la del usuario que ejecuta)
            const myMember = await resolveActiveMemberForUser(businessId, effectiveUserId);
            let openRegister = myMember ? await prisma.cashRegister.findFirst({
                where: { businessId, memberId: myMember.id, status: CashStatus.OPEN },
                include: { member: { select: { user: { select: { name: true } } } } }
            }) : null;
            if (!openRegister) {
                openRegister = await prisma.cashRegister.findFirst({
                    where: { businessId, status: CashStatus.OPEN },
                    include: { member: { select: { user: { select: { name: true } } } } }
                });
            }

            const previewAppliedUSD = targetAmountUSDDec.gt(totalPendingDebtDec) ? totalPendingDebtDec : targetAmountUSDDec;
            const previewAppliedBs = previewAppliedUSD.mul(rateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            const previewRemainingUSD = totalPendingDebtDec.sub(previewAppliedUSD).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

            if (!confirmed) {
                return {
                    data: {
                        status: 'CONFIRMATION_REQUIRED',
                        mensaje: `Resumen del abono para ${client.name} listo para confirmar.`,
                        resumen_abono: {
                            cliente: client.name,
                            cedula_rif: client.ci,
                            deuda_actual_usd: Number(totalPendingDebtDec.toFixed(2)),
                            monto_abono_usd: Number(previewAppliedUSD.toFixed(2)),
                            monto_abono_bs: Number(previewAppliedBs.toFixed(2)),
                            metodo_pago: `${paymentMethod.name} (${paymentMethod.currency})`,
                            saldo_restante_usd: Number(previewRemainingUSD.toFixed(2)),
                            caja_destino: openRegister ? (openRegister.member?.user?.name || `Caja #${openRegister.id}`) : 'Ingreso directo en Cobranzas'
                        }
                    },
                    action: {
                        type: 'ACTION_CONFIRM',
                        label: '✅ Confirmar y Aplicar Abono',
                        summaryLines: [
                            { label: 'Cliente', value: `${client.name} (${client.ci})` },
                            { label: 'Deuda actual', value: `$${totalPendingDebtDec.toFixed(2)} USD` },
                            { label: 'Método de pago', value: `${paymentMethod.name} (${paymentMethod.currency})` },
                            { label: 'Saldo restante tras abono', value: `$${previewRemainingUSD.toFixed(2)} USD` }
                        ],
                        totalLabel: `Abono: $${previewAppliedUSD.toFixed(2)} USD (Bs. ${previewAppliedBs.toFixed(2)})`,
                        confirmMessage: `Sí, confirmo y autorizo registrar el abono de $${previewAppliedUSD.toFixed(2)} USD a ${client.name} por ${paymentMethod.name}.`,
                        cancelMessage: 'Cancelar el abono.'
                    },
                    suggestedOptions: ['✅ Confirmar abono', '💳 Cambiar método de pago', '❌ Cancelar']
                };
            }

            // 6. Aplicar Abono en Cascada (FIFO) sobre las facturas pendientes
            let remainingToDistributeUSD = targetAmountUSDDec;
            const initialRequestedUSD = targetAmountUSDDec;
            let lastErrorMsg = '';

            const appliedBreakdown: Array<{
                recibo: string;
                ventaId: number;
                montoAplicadoUSD: number;
                montoAplicadoBs: number;
                saldoAnteriorFacturaUSD: number;
                saldoRestanteFacturaUSD: number;
                estadoFinal: string;
            }> = [];

            for (const sale of pendingSales) {
                if (remainingToDistributeUSD.lte(new Decimal(0.01))) break;

                const saleDebtUSD = new Decimal(sale.remainingBalance).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
                const paymentForThisSaleUSD = remainingToDistributeUSD.gte(saleDebtUSD)
                    ? saleDebtUSD
                    : remainingToDistributeUSD;

                // IMPORTANTE: SaleService.addPayment espera data.amount en la moneda nativa del PaymentMethod:
                // - Si paymentMethod.currency === 'USD', data.amount va en USD.
                // - Si paymentMethod.currency === 'VES', data.amount va en Bolívares (VES) porque addPayment divide entre rate.
                // - Si paymentMethod.currency === 'COP', data.amount va en Pesos (COP) porque addPayment divide entre copRate.
                let amountInMethodCurrency: number;
                if (paymentMethod.currency === 'USD') {
                    amountInMethodCurrency = Number(paymentForThisSaleUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
                } else if (paymentMethod.currency === 'COP') {
                    amountInMethodCurrency = Number(paymentForThisSaleUSD.mul(copRateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
                } else {
                    // VES
                    amountInMethodCurrency = Number(paymentForThisSaleUSD.mul(rateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
                }

                const payResult = await saleService.addPayment(businessId, sale.id, {
                    paymentMethodId: paymentMethod.id,
                    amount: amountInMethodCurrency,
                    exchangeRateId: exchangeRate.id,
                    reference: reference,
                    cashRegisterId: openRegister ? openRegister.id : null
                });

                if (payResult.status === 200) {
                    remainingToDistributeUSD = remainingToDistributeUSD.sub(paymentForThisSaleUSD);
                    const payData = payResult.data as any;
                    const realUpdatedBalance = payData?.sale?.remainingBalance !== undefined
                        ? Math.max(0, Number(Number(payData.sale.remainingBalance).toFixed(2)))
                        : Math.max(0, Number(saleDebtUSD.sub(paymentForThisSaleUSD).toFixed(2)));

                    appliedBreakdown.push({
                        recibo: sale.receiptNumber ? `Factura #${sale.receiptNumber}` : `Venta #${sale.id}`,
                        ventaId: sale.id,
                        montoAplicadoUSD: Number(paymentForThisSaleUSD.toFixed(2)),
                        montoAplicadoBs: Number(paymentForThisSaleUSD.mul(rateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)),
                        saldoAnteriorFacturaUSD: Number(saleDebtUSD.toFixed(2)),
                        saldoRestanteFacturaUSD: realUpdatedBalance,
                        estadoFinal: realUpdatedBalance <= 0.05 ? 'TOTALMENTE_PAGADA' : 'ABONADA_PARCIAL'
                    });
                } else {
                    lastErrorMsg = payResult.message || 'No se pudo procesar el abono en la factura.';
                }
            }

            if (appliedBreakdown.length === 0) {
                return {
                    data: {
                        status: 'ERROR',
                        cliente: client.name,
                        mensaje: lastErrorMsg || `No se pudo aplicar el abono a las facturas pendientes de ${client.name}.`
                    }
                };
            }

            const totalAppliedUSD = Number(initialRequestedUSD.sub(remainingToDistributeUSD).toFixed(2));
            const totalAppliedBs = Number(new Decimal(totalAppliedUSD).mul(rateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
            const unappliedExcessUSD = Math.max(0, Number(remainingToDistributeUSD.toFixed(2)));

            const updatedClient = await prisma.client.findUnique({
                where: { id: client.id },
                select: { id: true, name: true, ci: true, phone: true, currentDebt: true }
            });

            const newTotalDebtUSD = Number(Number(updatedClient?.currentDebt || 0).toFixed(2));
            const newTotalDebtBs = Number(new Decimal(newTotalDebtUSD).mul(rateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));

            const action: AiChatAction = {
                type: 'NAVIGATE',
                label: `👁️ Ver Cuenta de ${client.name} en Cuentas por Cobrar`,
                url: '/credits/sales'
            };

            const registerName = openRegister
                ? (openRegister.member?.user?.name ? `Caja de ${openRegister.member.user.name}` : `Caja #${openRegister.id}`)
                : 'Ingreso directo en Cobranzas (Sin caja de mostrador abierta)';

            const excessNotice = unappliedExcessUSD > 0.01
                ? ` Nota: El cliente solo debía ${totalAppliedUSD.toFixed(2)} USD, por lo que su deuda quedó en $0.00 USD (excedente no aplicado: ${unappliedExcessUSD.toFixed(2)} USD).`
                : '';

            return {
                data: {
                    status: 'EXITOSO',
                    cliente: client.name,
                    cedula_rif: client.ci,
                    deuda_anterior_global_usd: Number(totalPendingDebtDec.toFixed(2)),
                    monto_total_abonado_usd: totalAppliedUSD,
                    monto_total_abonado_ves: totalAppliedBs,
                    tasa_bcv_aplicada: Number(rateDec.toFixed(2)),
                    metodo_pago_usado: `${paymentMethod.name} (${paymentMethod.currency})`,
                    deuda_restante_global_usd: newTotalDebtUSD,
                    deuda_restante_global_ves: newTotalDebtBs,
                    caja_registradora_ingresada: registerName,
                    desglose_por_factura: appliedBreakdown,
                    mensaje: `¡Abono procesado con éxito! Se descontaron ${totalAppliedUSD.toFixed(2)} USD (Bs. ${totalAppliedBs.toFixed(2)}) de la deuda de ${client.name} mediante ${paymentMethod.name}. Saldo pendiente actual: ${newTotalDebtUSD.toFixed(2)} USD (Bs. ${newTotalDebtBs.toFixed(2)}).${excessNotice}`
                },
                action
            };
        }

        case 'sugerir_reposicion_compras_proveedores': {
            const daysThreshold = Number(args?.daysThreshold || 7);
            const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

            const products = await prisma.product.findMany({
                where: { businessId, isActive: true },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    minStock: true,
                    costPrice: true,
                    salePrice: true,
                    category: { select: { name: true } },
                    stockLots: { select: { quantity: true } },
                    purchaseItems: {
                        select: {
                            purchase: {
                                select: {
                                    supplier: { select: { id: true, nameCompany: true, contactName: true, phone: true } }
                                }
                            }
                        },
                        orderBy: { id: 'desc' },
                        take: 1
                    }
                }
            });

            const recentSaleItems = await prisma.saleItem.findMany({
                where: {
                    sale: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        deletedAt: null,
                        createdAt: { gte: thirtyDaysAgo }
                    }
                },
                select: {
                    productId: true,
                    quantity: true,
                    productPresentation: {
                        select: { factor: true }
                    }
                }
            });

            const salesByProduct = new Map<number, number>();
            for (const item of recentSaleItems) {
                const factor = item.productPresentation ? Number(item.productPresentation.factor) : 1;
                const effectiveQty = Number(item.quantity) * factor;
                salesByProduct.set(item.productId, (salesByProduct.get(item.productId) || 0) + effectiveQty);
            }

            const suggestions: any[] = [];
            let totalEstimatedInvestmentUSD = 0;

            for (const prod of products) {
                const totalStock = prod.stockLots.reduce((acc, lot) => acc + Number(lot.quantity), 0);
                const sold30d = salesByProduct.get(prod.id) || 0;
                const dailyVelocity = sold30d / 30;
                const daysRemaining = dailyVelocity > 0 ? (totalStock / dailyVelocity) : (totalStock > 0 ? 999 : 0);

                const isCriticallyLow = totalStock <= Number(prod.minStock);
                const isExhaustingSoon = daysRemaining <= daysThreshold && (dailyVelocity > 0 || totalStock === 0);

                if (isCriticallyLow || isExhaustingSoon) {
                    const targetBufferDays = 15;
                    const suggestedUnits = Math.max(
                        Number(prod.minStock) * 2,
                        Math.ceil(dailyVelocity * targetBufferDays)
                    ) || 10;

                    const cost = Number(prod.costPrice || 0);
                    const estimatedCost = Number((suggestedUnits * cost).toFixed(2));
                    totalEstimatedInvestmentUSD += estimatedCost;

                    const supplier = prod.purchaseItems[0]?.purchase?.supplier;

                    suggestions.push({
                        productoId: prod.id,
                        producto: prod.name,
                        sku: prod.sku || 'S/C',
                        stockActual: totalStock,
                        stockMinimo: Number(prod.minStock),
                        ventasUltimos30Dias: sold30d,
                        velocidadDiaria: Number(dailyVelocity.toFixed(1)),
                        diasRestantesEstimados: daysRemaining === 999 ? 'Sin ventas recientes' : Number(daysRemaining.toFixed(1)),
                        cantidadSugeridaPedir: suggestedUnits,
                        costoUnitarioUSD: cost,
                        inversionEstimadaUSD: estimatedCost,
                        proveedor: supplier ? {
                            nombre: supplier.nameCompany,
                            contacto: supplier.contactName,
                            telefono: supplier.phone
                        } : null
                    });
                }
            }

            suggestions.sort((a, b) => {
                const dA = typeof a.diasRestantesEstimados === 'number' ? a.diasRestantesEstimados : 99;
                const dB = typeof b.diasRestantesEstimados === 'number' ? b.diasRestantesEstimados : 99;
                return dA - dB;
            });

            let whatsappDraft = `*SOLICITUD DE REPOSICIÓN DE MERCANCÍA*\nHola estimado proveedor, requerimos cotización/despacho para los siguientes artículos prioritarios:\n\n`;
            suggestions.slice(0, 8).forEach((s, idx) => {
                whatsappDraft += `${idx + 1}. *${s.producto}* (${s.sku}) -> Cantidad: *${s.cantidadSugeridaPedir} unids*\n`;
            });
            whatsappDraft += `\nFavor confirmar disponibilidad y precio. Saludos cordiales.`;

            return {
                data: {
                    status: 'OK',
                    total_articulos_en_riesgo: suggestions.length,
                    inversion_total_estimada_usd: Number(totalEstimatedInvestmentUSD.toFixed(2)),
                    productos_a_reponer: suggestions.slice(0, 15),
                    borrador_mensaje_whatsapp: whatsappDraft
                }
            };
        }

        case 'consultar_resumen_apertura_matutino': {
            const todayUtc = new Date(Date.now() - (tzOffset * 60_000));
            const todayStr = todayUtc.toISOString().split('T')[0];

            const nextWeek = new Date(todayUtc.getTime() + (7 * 24 * 60 * 60 * 1000));
            const upcomingInstallments = await prisma.saleInstallment.findMany({
                where: {
                    sale: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        deletedAt: null
                    },
                    status: { not: InstallmentStatus.PAID },
                    dueDate: { lte: nextWeek }
                },
                include: {
                    sale: {
                        select: {
                            id: true,
                            receiptNumber: true,
                            client: { select: { id: true, name: true, phone: true } }
                        }
                    }
                },
                orderBy: { dueDate: 'asc' }
            });

            const totalCobranzaSemanaUSD = upcomingInstallments.reduce((acc, i) => acc + (Number(i.amount) - Number(i.amountPaid)), 0);
            const cuotasVencidasHoy = upcomingInstallments.filter(i => new Date(i.dueDate) <= todayUtc);
            const totalVencidoHoyUSD = cuotasVencidasHoy.reduce((acc, i) => acc + (Number(i.amount) - Number(i.amountPaid)), 0);

            const sevenDaysAgoStart = new Date(todayUtc.getTime() - (7 * 24 * 60 * 60 * 1000));
            sevenDaysAgoStart.setUTCHours(0, 0, 0, 0);
            const sevenDaysAgoEnd = new Date(todayUtc.getTime() - (7 * 24 * 60 * 60 * 1000));
            sevenDaysAgoEnd.setUTCHours(23, 59, 59, 999);

            const pastSales = await prisma.sale.findMany({
                where: {
                    businessId,
                    status: { not: 'CANCELLED' },
                    deletedAt: null,
                    createdAt: { gte: sevenDaysAgoStart, lte: sevenDaysAgoEnd }
                },
                select: { totalAmount: true }
            });

            const benchmarkVentasSemanaPasada = pastSales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
            const metaSugeridaHoyUSD = Number((benchmarkVentasSemanaPasada * 1.10).toFixed(2));

            const productsWithStock = await prisma.product.findMany({
                where: { businessId, isActive: true },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    stockLots: { select: { quantity: true } }
                }
            });

            const outOfStockProducts = productsWithStock
                .filter(p => p.stockLots.reduce((acc, lot) => acc + Number(lot.quantity), 0) <= 0)
                .slice(0, 5);

            const openRegisters = await prisma.cashRegister.findMany({
                where: { businessId, status: CashStatus.OPEN },
                include: {
                    member: { select: { user: { select: { name: true } } } }
                }
            });

            return {
                data: {
                    fecha_apertura: todayStr,
                    estado_cajas: {
                        cajas_abiertas: openRegisters.length,
                        detalle_cajas: openRegisters.map(c => c.member?.user?.name ? `Caja de ${c.member.user.name}` : `Caja #${c.id}`),
                        recomendacion_caja: openRegisters.length > 0 ? 'Cajas operativas listas para vender.' : 'Atención: No hay cajas abiertas aún. Recuerda realizar la apertura de turno.'
                    },
                    cuentas_por_cobrar_prioritarias: {
                        total_por_cobrar_proximos_7_dias_usd: Number(totalCobranzaSemanaUSD.toFixed(2)),
                        total_vencido_hoy_o_retrasado_usd: Number(totalVencidoHoyUSD.toFixed(2)),
                        cuotas_pendientes_conteo: upcomingInstallments.length,
                        clientes_a_cobrar: upcomingInstallments.slice(0, 5).map(inst => ({
                            cliente: inst.sale.client.name,
                            telefono: inst.sale.client.phone,
                            recibo: inst.sale.receiptNumber ? String(inst.sale.receiptNumber) : `#${inst.sale.id}`,
                            montoPendienteUSD: Number((Number(inst.amount) - Number(inst.amountPaid)).toFixed(2)),
                            vencimiento: inst.dueDate.toISOString().split('T')[0]
                        }))
                    },
                    meta_ventas_del_dia: {
                        ventas_mismo_dia_semana_pasada_usd: Number(benchmarkVentasSemanaPasada.toFixed(2)),
                        meta_sugerida_hoy_usd: metaSugeridaHoyUSD,
                        mensaje_motivacional: `Para superar el ritmo de la semana pasada, tu meta de ventas para hoy son $${metaSugeridaHoyUSD.toFixed(2)} USD.`
                    },
                    alertas_de_inventario: {
                        articulos_agotados_total: outOfStockProducts.length,
                        articulos_muestra: outOfStockProducts.map(p => p.name)
                    }
                }
            };
        }

        case 'ejecutar_crear_producto': {
            const name = String(args?.name || '').trim();
            const costPriceUSD = Number(args?.costPriceUSD);
            const salePriceUSD = Number(args?.salePriceUSD);
            const initialStock = Number(args?.initialStock || 0);
            const sku = args?.sku ? String(args.sku).trim() : `SKU-${Date.now().toString().slice(-6)}`;
            const categoryName = args?.categoryName ? String(args.categoryName).trim() : '';
            const description = args?.description ? String(args.description).trim() : 'Producto registrado por Guardián AI';
            const isExempt = Boolean(args?.isExempt);
            const confirmed = args?.confirmed === true;

            if (!name) return { data: { status: 'ERROR', mensaje: 'Debes indicar el nombre del producto.' } };
            if (isNaN(costPriceUSD) || costPriceUSD < 0) return { data: { status: 'ERROR', mensaje: 'Precio de costo inválido.' } };
            if (isNaN(salePriceUSD) || salePriceUSD <= 0) return { data: { status: 'ERROR', mensaje: 'Precio de venta inválido.' } };

            let category = categoryName ? await prisma.category.findFirst({
                where: { businessId, name: { contains: categoryName, mode: 'insensitive' } }
            }) : null;

            if (!category && !categoryName) {
                category = await prisma.category.findFirst({ where: { businessId } });
            }

            const unit = await prisma.measurementUnit.findFirst({ where: { isActive: true } }) 
                      || await prisma.measurementUnit.findFirst();
            if (!unit) return { data: { status: 'ERROR', mensaje: 'No hay unidades de medida configuradas en la base de datos.' } };

            const tax = isExempt
                ? (await prisma.tax.findFirst({ where: { isActive: true, rate: 0 } }) || await prisma.tax.findFirst({ where: { isActive: true } }))
                : (await prisma.tax.findFirst({ where: { isActive: true, rate: { gt: 0 } } }) || await prisma.tax.findFirst({ where: { isActive: true } }) || await prisma.tax.findFirst());
            if (!tax) return { data: { status: 'ERROR', mensaje: 'No hay tipos de impuesto configurados en la base de datos.' } };

            const primaryDepot = await prisma.depot.findFirst({
                where: { businessId, isActive: true },
                orderBy: { id: 'asc' }
            }) || await prisma.depot.findFirst({ where: { businessId } });

            const margin = salePriceUSD > 0 ? Math.max(0, (salePriceUSD - costPriceUSD) / salePriceUSD) : 0;
            const catLabel = category ? category.name : (categoryName || 'General');

            if (!confirmed) {
                return {
                    data: {
                        status: 'CONFIRMATION_REQUIRED',
                        mensaje: `Previsualización del nuevo producto lista para confirmar.`,
                        resumen_producto: {
                            nombre: name,
                            sku,
                            categoria: catLabel,
                            unidad: unit.name,
                            impuesto: `${tax.name} (${Number(tax.rate)}%)`,
                            costo_usd: costPriceUSD,
                            precio_venta_usd: salePriceUSD,
                            margen_pct: `${(margin * 100).toFixed(1)}%`,
                            stock_inicial: initialStock,
                            almacen: primaryDepot?.name || 'Sin almacén'
                        }
                    },
                    action: {
                        type: 'ACTION_CONFIRM',
                        label: '✅ Confirmar y Crear Producto',
                        summaryLines: [
                            { label: 'Producto', value: name },
                            { label: 'Categoría / Unidad', value: `${catLabel} · ${unit.name}` },
                            { label: 'Impuesto', value: `${tax.name} (${Number(tax.rate)}%)` },
                            { label: 'Costo / Margen', value: `$${costPriceUSD.toFixed(2)} (${(margin * 100).toFixed(1)}%)` },
                            { label: 'Stock inicial', value: `${initialStock} en ${primaryDepot?.name || 'Principal'}` }
                        ],
                        totalLabel: `PVP: $${salePriceUSD.toFixed(2)} USD`,
                        confirmMessage: `Sí, confirmo crear el producto "${name}" con precio $${salePriceUSD.toFixed(2)} USD.`,
                        cancelMessage: 'Cancelar creación de producto.'
                    },
                    suggestedOptions: ['✅ Confirmar creación', '❌ Cancelar']
                };
            }

            if (!category) {
                category = await prisma.category.create({
                    data: { businessId, name: categoryName || 'General', description: 'Categoría principal' }
                });
            }

            let member = effectiveUserId ? await resolveActiveMemberForUser(businessId, effectiveUserId) : null;
            if (!member) {
                member = await prisma.businessMember.findFirst({
                    where: { businessId, isActive: true },
                    orderBy: { id: 'asc' },
                    include: {
                        user: { select: { id: true, name: true } },
                        role: { select: { code: true, name: true } }
                    }
                });
            }
            const memberId = member ? member.id : 1;

            const created = await prisma.$transaction(async (tx) => {
                const prod = await tx.product.create({
                    data: {
                        businessId,
                        name,
                        sku,
                        description,
                        categoryId: category!.id,
                        unitId: unit.id,
                        taxId: tax.id,
                        type: ProductType.SIMPLE,
                        costPrice: new Decimal(costPriceUSD),
                        salePrice: new Decimal(salePriceUSD),
                        profitMargin: new Decimal(margin.toFixed(4)),
                        minStock: 5,
                        isActive: true
                    }
                });

                if (initialStock > 0 && primaryDepot) {
                    const lot = await tx.stockLot.create({
                        data: {
                            productId: prod.id,
                            depotId: primaryDepot.id,
                            quantity: initialStock,
                            expirationDate: new Date('2099-12-31'),
                            lotCost: new Decimal(costPriceUSD)
                        }
                    });

                    await tx.stockMovement.create({
                        data: {
                            businessId,
                            depotId: primaryDepot.id,
                            productId: prod.id,
                            quantity: initialStock,
                            type: MovementType.IN,
                            reason: 'Stock inicial registrado por comando Guardián AI',
                            memberId: memberId,
                            historicalCost: new Decimal(costPriceUSD),
                            stockLotId: lot.id
                        }
                    });
                }

                return prod;
            });

            return {
                data: {
                    status: 'EXITOSO',
                    mensaje: `Producto "${created.name}" creado exitosamente en el inventario.`,
                    producto: {
                        id: created.id,
                        nombre: created.name,
                        sku: created.sku,
                        categoria: category.name,
                        impuesto: `${tax.name} (${Number(tax.rate)}%)`,
                        precio_costo_usd: costPriceUSD,
                        precio_venta_usd: salePriceUSD,
                        margen_ganancia: `${(margin * 100).toFixed(1)}%`,
                        stock_inicial: initialStock,
                        almacen: primaryDepot ? primaryDepot.name : 'Sin almacén'
                    }
                },
                action: {
                    type: 'NAVIGATE',
                    label: '📦 Ver Inventario',
                    url: '/inventory'
                }
            };
        }

        case 'auditar_fraude_y_anulaciones_caja': {
            const defaultDaysAgo = getLocalDateStr(tzOffset, -7);
            const fromDate = args?.fromDate || defaultDaysAgo;
            const toDate = args?.toDate || defaultDate;
            const { startDate, endDate } = parseDateRange(fromDate, toDate, tzOffset);

            const cancelledSales = await prisma.sale.findMany({
                where: {
                    businessId,
                    status: 'CANCELLED',
                    createdAt: { gte: startDate, lte: endDate }
                },
                include: {
                    client: { select: { name: true } },
                    member: { select: { user: { select: { name: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            });

            const totalMontoAnuladoUSD = cancelledSales.reduce((acc, s) => acc + Number(s.totalAmount), 0);

            const creditNotes = await prisma.creditNote.findMany({
                where: {
                    businessId,
                    createdAt: { gte: startDate, lte: endDate }
                },
                include: {
                    sale: { select: { client: { select: { name: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            });

            const totalDevolucionesUSD = creditNotes.reduce((acc, cn) => acc + Number(cn.totalAmount), 0);

            const salesWithDiscount = await prisma.sale.findMany({
                where: {
                    businessId,
                    status: { not: 'CANCELLED' },
                    deletedAt: null,
                    discount: { gt: 0 },
                    createdAt: { gte: startDate, lte: endDate }
                },
                select: {
                    id: true,
                    receiptNumber: true,
                    totalAmount: true,
                    discount: true,
                    createdAt: true,
                    client: { select: { name: true } }
                },
                orderBy: { discount: 'desc' },
                take: 5
            });

            return {
                data: {
                    periodo: `${fromDate} al ${toDate}`,
                    ventas_canceladas_anuladas: {
                        cantidad_total: cancelledSales.length,
                        monto_total_anulado_usd: Number(totalMontoAnuladoUSD.toFixed(2)),
                        detalle_reciente: cancelledSales.slice(0, 8).map(s => ({
                            recibo: s.receiptNumber ? String(s.receiptNumber) : `#${s.id}`,
                            montoUSD: Number(s.totalAmount),
                            fecha: s.createdAt.toISOString().split('T')[0],
                            cliente: s.client?.name || 'Cliente Ocasional',
                            cajero: s.member?.user?.name || 'Cajero'
                        }))
                    },
                    devoluciones_y_notas_credito: {
                        cantidad_total: creditNotes.length,
                        monto_total_devoluciones_usd: Number(totalDevolucionesUSD.toFixed(2)),
                        detalle_reciente: creditNotes.slice(0, 5).map(cn => ({
                            numero: `#${cn.number}`,
                            montoUSD: Number(cn.totalAmount),
                            cliente: cn.sale?.client?.name || 'N/A',
                            motivo: cn.reason || 'Devolución'
                        }))
                    },
                    ventas_con_descuentos_manuales: {
                        cantidad: salesWithDiscount.length,
                        descuentos_destacados: salesWithDiscount.map(s => ({
                            recibo: s.receiptNumber ? String(s.receiptNumber) : `#${s.id}`,
                            descuentoUSD: Number(s.discount),
                            totalFacturaUSD: Number(s.totalAmount),
                            cliente: s.client?.name || 'Cliente Ocasional'
                        }))
                    },
                    veredicto_auditoria: cancelledSales.length > 5 
                        ? 'ALERTA: Se detectó un volumen elevado de anulaciones en el período. Se sugiere auditar turnos de cajeros.'
                        : 'Nivel de riesgo operativo bajo/normal en cajas y facturación.'
                }
            };
        }

        case 'generar_promociones_combos_estancados': {
            const fortyFiveDaysAgo = new Date(Date.now() - (45 * 24 * 60 * 60 * 1000));

            const allProducts = await prisma.product.findMany({
                where: { businessId, isActive: true },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    costPrice: true,
                    salePrice: true,
                    stockLots: { select: { quantity: true } }
                }
            });

            const recentSales = await prisma.saleItem.findMany({
                where: {
                    sale: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        deletedAt: null,
                        createdAt: { gte: fortyFiveDaysAgo }
                    }
                },
                select: { productId: true, quantity: true }
            });

            const activeSoldProductIds = new Set(recentSales.map(s => s.productId));

            const slowMoving = allProducts.filter(p => {
                const totalStock = p.stockLots.reduce((acc, lot) => acc + Number(lot.quantity), 0);
                return totalStock > 0 && !activeSoldProductIds.has(p.id);
            });

            const sales30d = new Map<number, number>();
            for (const s of recentSales) {
                sales30d.set(s.productId, (sales30d.get(s.productId) || 0) + Number(s.quantity));
            }

            const topSellers = allProducts
                .filter(p => (sales30d.get(p.id) || 0) > 0)
                .sort((a, b) => (sales30d.get(b.id) || 0) - (sales30d.get(a.id) || 0))
                .slice(0, 5);

            if (slowMoving.length === 0) {
                return {
                    data: {
                        status: 'SIN_STOCK_ESTANCADO',
                        mensaje: '¡Excelente noticia! Tu inventario tiene alta rotación. No se detectaron productos con más de 45 días sin venderse.'
                    }
                };
            }

            const combos: any[] = [];
            for (let i = 0; i < Math.min(3, slowMoving.length); i++) {
                const cold = slowMoving[i];
                const hot = topSellers[i % topSellers.length] || allProducts.find(p => p.id !== cold.id);

                const coldPrice = Number(cold.salePrice);
                const coldCost = Number(cold.costPrice);
                const hotPrice = hot ? Number(hot.salePrice) : coldPrice;
                const hotCost = hot ? Number(hot.costPrice) : coldCost;

                const originalTotal = coldPrice + (hot ? hotPrice : 0);
                const totalCost = coldCost + (hot ? hotCost : 0);

                const promoPrice = Number((originalTotal * 0.88).toFixed(2));
                const profit = Number((promoPrice - totalCost).toFixed(2));
                const marginPct = promoPrice > 0 ? Number(((profit / promoPrice) * 100).toFixed(1)) : 0;

                const comboTitle = hot ? `Combo Dúo Ahorro: ${hot.name} + ${cold.name}` : `Oferta Especial: ${cold.name}`;
                const copyText = `🔥 ¡OFERTA LIMITADA EN NUESTRA TIENDA! 🔥\n` +
                                `Lleva tu *${comboTitle}*\n` +
                                `❌ Antes: $${originalTotal.toFixed(2)} USD\n` +
                                `✅ Ahora SOLO: *$${promoPrice.toFixed(2)} USD* (Ahorras ${(originalTotal - promoPrice).toFixed(2)}$)\n` +
                                `🏃‍♂️ ¡Válido hasta agotarse la existencia! Visítanos o pide por delivery.`;

                combos.push({
                    comboNumero: i + 1,
                    titulo: comboTitle,
                    productoEstancado: cold.name,
                    productoEstrella: hot ? hot.name : 'Individual',
                    precioOriginalUSD: Number(originalTotal.toFixed(2)),
                    precioPromocionalUSD: promoPrice,
                    ahorroClienteUSD: Number((originalTotal - promoPrice).toFixed(2)),
                    gananciaNetaUSD: profit,
                    margenGanancia: `${marginPct}%`,
                    copyParaRedesYWhatsApp: copyText
                });
            }

            return {
                data: {
                    status: 'COMBOS_GENERADOS',
                    total_productos_estancados_detectados: slowMoving.length,
                    combos_estrategicos: combos
                }
            };
        }

        case 'ejecutar_crear_venta': {
            const rawItems = Array.isArray(args?.items) ? args.items : [];
            const clientSearch = String(args?.clientSearch || '').trim();
            const rawCondition = String(args?.condition || '').trim().toUpperCase();
            const paymentMethodName = String(args?.paymentMethodName || '').trim();
            const depotName = String(args?.depotName || '').trim();
            const discountUSD = Number(args?.discountUSD || 0);
            const reference = String(args?.reference || 'Venta por comando Guardián AI').trim();
            const creditDays = Math.max(1, Number(args?.creditDays || 15));
            const confirmed = args?.confirmed === true;

            if (rawItems.length === 0) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: 'Debes indicar al menos un producto y la cantidad a vender (ej: "Vende 2 Harina Pan").'
                    }
                };
            }

            if (isNaN(discountUSD) || discountUSD < 0) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: 'El descuento global no puede ser negativo.'
                    }
                };
            }

            // 1. Validar Tasa de Cambio
            const currentRateRecord = await resolveBusinessExchangeRate(businessId, prisma);
            if (!currentRateRecord || Number(currentRateRecord.rate) <= 0) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: 'No hay una tasa de cambio configurada en el sistema. Configura la tasa antes de realizar ventas.'
                    }
                };
            }
            const rateDec = new Decimal(currentRateRecord.rate);

            // 2. Validar Miembro y Caja Abierta (priorizando la del usuario actual)
            let cashierMember = await resolveActiveMemberForUser(businessId, effectiveUserId);

            let openRegister = cashierMember ? await prisma.cashRegister.findFirst({
                where: { businessId, memberId: cashierMember.id, status: CashStatus.OPEN }
            }) : null;

            if (!openRegister) {
                openRegister = await prisma.cashRegister.findFirst({
                    where: { businessId, status: CashStatus.OPEN }
                });
                if (openRegister) {
                    cashierMember = await prisma.businessMember.findFirst({
                        where: { id: openRegister.memberId },
                        include: {
                            user: { select: { id: true, name: true } },
                            role: { select: { code: true, name: true } }
                        }
                    });
                }
            }

            if (!openRegister || !cashierMember) {
                return {
                    data: {
                        status: 'CAJA_CERRADA',
                        mensaje: '⚠️ No tienes ninguna caja registradora abierta en este momento. Para realizar ventas (tanto por el punto de venta como por Guardián AI), es obligatorio abrir caja en el módulo de Cajas.',
                        accion_requerida: 'Realizar Apertura de Caja'
                    },
                    action: {
                        type: 'NAVIGATE',
                        label: '🏦 Ir a Apertura de Caja',
                        url: '/cash-register'
                    }
                };
            }

            // 3. Cargar Depósitos Activos y Negocio (configuración fiscal / tasa COP)
            const [activeDepots, business, activeMethods] = await Promise.all([
                prisma.depot.findMany({
                    where: { businessId, isActive: true },
                    orderBy: { id: 'asc' }
                }),
                prisma.business.findUnique({
                    where: { id: businessId },
                    select: { ticketConfig: true, copExchangeRate: true }
                }),
                listActiveStorePaymentMethods(businessId)
            ]);

            if (activeDepots.length === 0) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: 'No se encontró ningún almacén o depósito activo en la empresa.'
                    }
                };
            }

            let selectedDepot = activeDepots[0];
            if (depotName) {
                const normDepot = stripAccents(depotName).toLowerCase().trim();
                const foundDepot = activeDepots.find(d => stripAccents(d.name).toLowerCase().includes(normDepot));
                if (!foundDepot) {
                    return {
                        data: {
                            status: 'DEPOT_NOT_FOUND',
                            mensaje: `No encontré el depósito "${depotName}". Los depósitos activos son: ${activeDepots.map(d => d.name).join(', ')}.`
                        },
                        suggestedOptions: activeDepots.slice(0, 5).map(d => `Despachar desde ${d.name}`)
                    };
                }
                selectedDepot = foundDepot;
            }

            // 4. Buscar y Desambiguar Productos sin elegir al azar
            const normalize = (s: string) => stripAccents(s || '').toLowerCase().trim();
            const processedSaleItems: any[] = [];
            let rawSubTotal = new Decimal(0);
            const itemsWithMeta: Array<{ prod: any; qty: number; unitPrice: Decimal; lineGross: Decimal; depotId: number; depotName: string }> = [];

            for (const item of rawItems) {
                const search = String(item.productSearch || '').trim();
                const qty = Number(item.quantity);

                if (!search || isNaN(qty) || qty <= 0) {
                    return {
                        data: {
                            status: 'INVALID_ARGS',
                            mensaje: 'Cada producto debe tener un nombre válido y una cantidad mayor a 0.'
                        }
                    };
                }

                const searchVariants = getSearchVariants(search);
                const target = normalize(search);

                const candidateProducts = await prisma.product.findMany({
                    where: {
                        businessId,
                        isActive: true,
                        OR: [
                            ...searchVariants.map(term => ({ name: { contains: term, mode: 'insensitive' as const } })),
                            ...searchVariants.map(term => ({ sku: { contains: term, mode: 'insensitive' as const } })),
                            ...searchVariants.map(term => ({ secondaryCode: { contains: term, mode: 'insensitive' as const } }))
                        ]
                    },
                    include: {
                        tax: true,
                        stockLots: {
                            where: {
                                quantity: { gt: 0 },
                                depot: { isActive: true }
                            },
                            include: { depot: { select: { id: true, name: true } } }
                        }
                    }
                });

                if (candidateProducts.length === 0) {
                    return {
                        data: {
                            status: 'PRODUCT_NOT_FOUND',
                            mensaje: `No encontré ningún producto activo con el término "${search}" en el catálogo. Verifica el nombre o código SKU.`
                        }
                    };
                }

                // Buscar coincidencia exacta única por nombre, SKU o código secundario
                const exactMatches = candidateProducts.filter(p =>
                    normalize(p.name) === target
                    || normalize(p.sku || '') === target
                    || normalize(p.secondaryCode || '') === target
                );

                // Si NO hay match exacto y hay múltiples productos candidatos que coinciden -> DESAMBIGUAR con el usuario
                if (exactMatches.length === 0 && candidateProducts.length > 1) {
                    const topCandidates = candidateProducts.slice(0, 6).map(p => {
                        const stockSelected = p.stockLots
                            .filter(l => l.depotId === selectedDepot.id)
                            .reduce((acc, l) => acc + Number(l.quantity), 0);
                        const stockAll = p.stockLots.reduce((acc, l) => acc + Number(l.quantity), 0);
                        return {
                            nombre: p.name,
                            sku: p.sku || 'S/N',
                            precio_usd: Number(p.salePrice),
                            precio_bs: Number(new Decimal(p.salePrice).mul(rateDec).toFixed(2)),
                            stock_deposito_actual: stockSelected,
                            stock_total_empresa: stockAll
                        };
                    });

                    return {
                        data: {
                            status: 'AMBIGUOUS_PRODUCT',
                            termino_buscado: search,
                            mensaje: `Encontré varios productos que coinciden con "${search}". ¿Cuál deseas vender exactamente?`,
                            candidatos: topCandidates
                        },
                        suggestedOptions: topCandidates.slice(0, 5).map(c => c.nombre)
                    };
                }

                const prod = exactMatches.length > 0 ? exactMatches[0] : candidateProducts[0];

                // Evaluar depósito con stock disponible (si el usuario no forzó depósito y el primario no alcanza, buscar en otros activos)
                let itemDepot = selectedDepot;
                let stockInItemDepot = prod.stockLots
                    .filter(l => l.depotId === itemDepot.id)
                    .reduce((acc: number, l: any) => acc + Number(l.quantity), 0);

                if (stockInItemDepot < qty && !depotName && activeDepots.length > 1) {
                    const depotWithEnough = activeDepots.find(d =>
                        prod.stockLots
                            .filter(l => l.depotId === d.id)
                            .reduce((acc: number, l: any) => acc + Number(l.quantity), 0) >= qty
                    );
                    if (depotWithEnough) {
                        itemDepot = depotWithEnough;
                        stockInItemDepot = prod.stockLots
                            .filter(l => l.depotId === itemDepot.id)
                            .reduce((acc: number, l: any) => acc + Number(l.quantity), 0);
                    }
                }

                if (stockInItemDepot < qty) {
                    const otherStock = prod.stockLots.reduce((acc: number, l: any) => acc + Number(l.quantity), 0);
                    return {
                        data: {
                            status: 'STOCK_INSUFICIENTE',
                            mensaje: `Stock insuficiente para "${prod.name}" en ${itemDepot.name}. Solicitaste ${qty} y hay ${stockInItemDepot} disponibles${otherStock > stockInItemDepot ? ` (stock total entre almacenes: ${otherStock})` : ''}.`,
                            producto: prod.name,
                            stock_disponible: stockInItemDepot,
                            solicitado: qty
                        }
                    };
                }

                const customPrice = item.unitPriceUSD !== undefined && item.unitPriceUSD !== null && !isNaN(Number(item.unitPriceUSD)) && Number(item.unitPriceUSD) > 0
                    ? new Decimal(item.unitPriceUSD)
                    : null;
                const unitPrice = customPrice || new Decimal(prod.salePrice);
                const lineGross = unitPrice.mul(qty);
                rawSubTotal = rawSubTotal.add(lineGross);

                itemsWithMeta.push({
                    prod,
                    qty,
                    unitPrice,
                    lineGross,
                    depotId: itemDepot.id,
                    depotName: itemDepot.name
                });
            }

            // 5. Verificar Condición, Cliente y Método de Pago SIN INVENTAR NADA AL AZAR
            const missingRequirements: string[] = [];

            let effectiveCondition: 'CASH' | 'CREDIT' | '' = '';
            if (rawCondition === 'CASH' || rawCondition === 'CONTADO') {
                effectiveCondition = 'CASH';
            } else if (rawCondition === 'CREDIT' || rawCondition === 'CREDITO' || rawCondition === 'CRÉDITO') {
                effectiveCondition = 'CREDIT';
            } else if (paymentMethodName) {
                // Si especificó método de pago explícito (ej. Pago Móvil / Zelle) sin decir crédito, es Contado
                effectiveCondition = 'CASH';
            } else {
                missingRequirements.push('Condición de venta (Contado o Crédito)');
            }

            // Validar Cliente (SIN hacer fallback a orderBy id asc!)
            let client: any = null;
            let willCreateCounterClient = false;
            const normClient = normalize(clientSearch);
            const isExplicitCounter = ['consumidor final', 'mostrador', 'general', 'varios'].includes(normClient);

            if (!clientSearch) {
                missingRequirements.push('Cliente (nombre, cédula o "Consumidor Final")');
            } else if (isExplicitCounter) {
                client = await prisma.client.findFirst({
                    where: {
                        businessId,
                        isActive: true,
                        OR: [
                            { name: { contains: 'Consumidor', mode: 'insensitive' } },
                            { name: { contains: 'Varios', mode: 'insensitive' } },
                            { name: { contains: 'General', mode: 'insensitive' } },
                            { name: { contains: 'Mostrador', mode: 'insensitive' } }
                        ]
                    }
                });
                if (!client) {
                    willCreateCounterClient = true;
                }
            } else {
                const { exactMatch, candidates } = await findBusinessClientCandidates(businessId, clientSearch, false);
                if (candidates.length === 0) {
                    return {
                        data: {
                            status: 'CLIENT_NOT_FOUND',
                            cliente_buscado: clientSearch,
                            mensaje: `No encontré ningún cliente activo llamado "${clientSearch}". Verifica el nombre/cédula o indica si deseas facturarlo a "Consumidor Final".`
                        },
                        suggestedOptions: ['Facturar a Consumidor Final']
                    };
                }
                if (!exactMatch && candidates.length > 1) {
                    const topClients = candidates.slice(0, 5).map(c => ({
                        nombre: c.name,
                        cedula: c.ci || 'N/A',
                        telefono: c.phone || 'S/T',
                        permite_credito: Boolean(c.allowCredit)
                    }));
                    return {
                        data: {
                            status: 'AMBIGUOUS_CLIENT',
                            mensaje: `Encontré varios clientes que coinciden con "${clientSearch}". ¿A cuál le facturamos?`,
                            candidatos: topClients
                        },
                        suggestedOptions: topClients.map(c => `Cliente ${c.nombre}`)
                    };
                }
                client = exactMatch || candidates[0];
            }

            // Validar Método de Pago si es Contado (o si falta condición)
            let paymentMethodUsed: any = null;
            if (effectiveCondition === 'CASH') {
                if (!paymentMethodName) {
                    missingRequirements.push('Método de pago (ej. cuál de los métodos activos de la tienda)');
                } else {
                    // Verificar que realmente exista coincidencia en los métodos de esta tienda
                    const normPM = normalize(paymentMethodName);
                    const hasKeywordOrName = activeMethods.some(m => {
                        const mName = normalize(m.name);
                        return mName.includes(normPM)
                            || normPM.includes(mName)
                            || /(efectivo|pago\s*movil|pagomovil|punto|debito|biopago|zelle|cashea|transferencia|dolar|usd|bolivar|\bbs\b|\bves\b|peso|cop)/.test(normPM);
                    });

                    if (!hasKeywordOrName) {
                        return {
                            data: {
                                status: 'PAYMENT_METHOD_NOT_FOUND',
                                metodo_solicitado: paymentMethodName,
                                metodos_disponibles: activeMethods.map(m => `${m.name} (${m.currency})`),
                                mensaje: `No reconocí el método de pago "${paymentMethodName}" entre los configurados en esta empresa. Elige uno de los métodos activos:`
                            },
                            suggestedOptions: activeMethods.slice(0, 6).map(m => m.name)
                        };
                    }

                    paymentMethodUsed = await resolveStorePaymentMethod(businessId, paymentMethodName, 'USD');
                    if (!paymentMethodUsed) {
                        return {
                            data: {
                                status: 'ERROR',
                                mensaje: 'No hay métodos de pago activos registrados en el sistema.'
                            }
                        };
                    }
                }
            }

            // Si falta cliente, condición o método de pago -> PREGUNTAR con los productos ya cotizados y las opciones reales de la tienda
            if (missingRequirements.length > 0) {
                const draftItemsText = itemsWithMeta.map(it =>
                    `${it.qty}x ${it.prod.name} ($${it.unitPrice.toFixed(2)} c/u)`
                );
                const opts: string[] = [];
                if (!clientSearch) opts.push('👤 Consumidor Final');
                if (effectiveCondition !== 'CREDIT' && !paymentMethodName) {
                    for (const m of activeMethods.slice(0, 4)) {
                        opts.push(`💳 ${m.name}`);
                    }
                    opts.push('📝 Venta a Crédito');
                }

                return {
                    data: {
                        status: 'MISSING_FIELDS',
                        mensaje: `Tengo listos los artículos (${draftItemsText.join(', ')}), pero antes de registrar la venta necesito que me indiques: ${missingRequirements.join(' · ')}.`,
                        articulos_verificados: itemsWithMeta.map(it => ({
                            producto: it.prod.name,
                            cantidad: it.qty,
                            precio_unitario_usd: it.unitPrice.toNumber(),
                            subtotal_usd: it.lineGross.toNumber(),
                            almacen: it.depotName
                        })),
                        subtotal_estimado_usd: rawSubTotal.toNumber(),
                        datos_faltantes: missingRequirements,
                        metodos_pago_tienda: activeMethods.map(m => `${m.name} (${m.currency})`)
                    },
                    suggestedOptions: opts.slice(0, 6)
                };
            }

            // 6. Validar crédito si aplica
            const isCredit = effectiveCondition === 'CREDIT';
            if (isCredit && client && !client.allowCredit) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: `El cliente "${client.name}" no tiene habilitado el cupo para compras a crédito en el sistema.`
                    }
                };
            }

            // 7. Cálculo Exacto de Descuento Prorrateado e Impuestos (100% alineado con SaleService.create)
            const discountDec = new Decimal(discountUSD);
            if (discountDec.gt(rawSubTotal)) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: `El descuento ($${discountDec.toFixed(2)}) no puede ser mayor al subtotal ($${rawSubTotal.toFixed(2)}).`
                    }
                };
            }

            const ticketConfig = (business as any)?.ticketConfig;
            const applyTaxes = !(
                ticketConfig?.showTaxDetails === false
                || ticketConfig?.ticketDesign?.showTaxDetails === false
            );

            let finalSubTotal = new Decimal(0);
            let finalTaxAmount = new Decimal(0);
            const itemsSummary: any[] = [];

            for (const it of itemsWithMeta) {
                const weight = rawSubTotal.gt(0) ? it.lineGross.div(rawSubTotal) : new Decimal(0);
                const lineDiscount = discountDec.mul(weight);
                const lineNetAmount = it.lineGross.sub(lineDiscount);

                let lineTax = new Decimal(0);
                if (applyTaxes) {
                    let taxRate = it.prod.tax?.rate ? new Decimal(it.prod.tax.rate) : new Decimal(0);
                    if (taxRate.gte(1)) taxRate = taxRate.div(100);
                    if (taxRate.gt(0)) {
                        lineTax = lineNetAmount.mul(taxRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
                    }
                }

                finalSubTotal = finalSubTotal.add(lineNetAmount);
                finalTaxAmount = finalTaxAmount.add(lineTax);

                processedSaleItems.push({
                    productId: it.prod.id,
                    quantity: it.qty,
                    price: it.unitPrice,
                    depotId: it.depotId
                });

                itemsSummary.push({
                    producto: it.prod.name,
                    cantidad: it.qty,
                    precio_unitario_usd: it.unitPrice.toNumber(),
                    subtotal_linea_usd: Number(lineNetAmount.toFixed(2)),
                    iva_linea_usd: Number(lineTax.toFixed(2)),
                    almacen: it.depotName
                });
            }

            const totalAmount = finalSubTotal.add(finalTaxAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            const totalVES = totalAmount.mul(rateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

            // Calcular monto en moneda nativa del método elegido (USD, VES o COP)
            let copRateDec = new Decimal(4000);
            if ((business as any)?.copExchangeRate && Number((business as any).copExchangeRate) > 0) {
                copRateDec = new Decimal((business as any).copExchangeRate);
            }

            let payAmount = totalAmount.toNumber();
            let payCurrencyLabel = 'USD';
            if (paymentMethodUsed) {
                if (paymentMethodUsed.currency === 'VES') {
                    payAmount = totalAmount.mul(rateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
                    payCurrencyLabel = `Bs. ${payAmount.toFixed(2)}`;
                } else if (paymentMethodUsed.currency === 'COP') {
                    payAmount = totalAmount.mul(copRateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
                    payCurrencyLabel = `COP ${payAmount.toFixed(2)}`;
                } else {
                    payCurrencyLabel = `$${payAmount.toFixed(2)} USD`;
                }
            }

            const resolvedClientName = client ? client.name : 'Consumidor Final (Mostrador)';
            const primarySaleDepotId = itemsWithMeta[0].depotId;

            // 8. PUERTA OBLIGATORIA DE CONFIRMACIÓN (PRE-VENTA) ANTES DE DESCONTAR STOCK
            if (!confirmed) {
                const itemsText = itemsSummary.map(s => `${s.cantidad}x ${s.producto}`).join(', ');
                const summaryLines = [
                    { label: 'Artículos', value: itemsText },
                    { label: 'Cliente', value: resolvedClientName },
                    { label: 'Almacén', value: itemsWithMeta[0].depotName },
                    { label: 'Condición', value: isCredit ? `CRÉDITO (${creditDays} días)` : 'CONTADO' },
                    {
                        label: isCredit ? 'Vencimiento' : 'Método de pago',
                        value: isCredit ? `${creditDays} días` : `${paymentMethodUsed.name} (${payCurrencyLabel})`
                    },
                    ...(finalTaxAmount.gt(0) ? [{ label: 'IVA incluido/calculado', value: `$${finalTaxAmount.toFixed(2)} USD` }] : []),
                    ...(discountDec.gt(0) ? [{ label: 'Descuento', value: `-$${discountDec.toFixed(2)} USD` }] : [])
                ];

                return {
                    data: {
                        status: 'CONFIRMATION_REQUIRED',
                        mensaje: `Resumen de pre-venta listo para confirmar. Verifica que todos los datos sean exactos antes de emitir el ticket y descontar inventario.`,
                        resumen_preventa: {
                            cliente: resolvedClientName,
                            condicion: isCredit ? 'CRÉDITO' : 'CONTADO',
                            metodo_pago: isCredit ? 'A Crédito' : `${paymentMethodUsed.name} (${paymentMethodUsed.currency})`,
                            almacen: itemsWithMeta[0].depotName,
                            articulos: itemsSummary,
                            subtotal_usd: Number(finalSubTotal.toFixed(2)),
                            impuestos_usd: Number(finalTaxAmount.toFixed(2)),
                            descuento_usd: Number(discountDec.toFixed(2)),
                            total_usd: totalAmount.toNumber(),
                            total_ves: totalVES.toFixed(2),
                            tasa_bcv: Number(rateDec.toFixed(2))
                        }
                    },
                    action: {
                        type: 'ACTION_CONFIRM',
                        label: '✅ Confirmar y Facturar Venta',
                        summaryLines,
                        totalLabel: `Total: $${totalAmount.toFixed(2)} USD (Bs. ${totalVES.toFixed(2)})`,
                        confirmMessage: `Sí, confirmo y autorizo registrar la venta para ${resolvedClientName} (${isCredit ? 'Crédito' : paymentMethodUsed.name}) tal como está en el resumen.`,
                        cancelMessage: 'Cancelar esta venta.'
                    },
                    suggestedOptions: ['✅ Confirmar venta', '💳 Cambiar método de pago', '👤 Cambiar cliente', '❌ Cancelar']
                };
            }

            // 9. Confirmación recibida -> crear Consumidor Final solo si explícitamente autorizado
            if (!client && willCreateCounterClient) {
                client = await prisma.client.create({
                    data: {
                        businessId,
                        name: 'Consumidor Final',
                        ci: 'V-00000000',
                        phone: '0000000000',
                        email: 'consumidor@guardian.com.ve',
                        address: 'Mostrador',
                        allowCredit: false,
                        currentDebt: 0
                    }
                });
            }

            let paymentsDto: any[] = [];
            if (!isCredit && paymentMethodUsed) {
                paymentsDto = [{
                    paymentMethodId: paymentMethodUsed.id,
                    amount: payAmount,
                    reference,
                    exchangeRateId: currentRateRecord.id,
                    cashRegisterId: openRegister.id
                }];
            }

            const saleCreationData: any = {
                clientId: client.id,
                memberId: cashierMember.id,
                sellerMemberId: cashierMember.id,
                exchangeRateId: currentRateRecord.id,
                type: SaleType.RETAIL,
                depotId: primarySaleDepotId,
                discount: discountDec,
                condition: isCredit ? Conditions.CREDIT : Conditions.CASH,
                items: processedSaleItems,
                payments: paymentsDto,
                subTotal: finalSubTotal,
                taxAmount: finalTaxAmount,
                totalAmount: totalAmount
            };

            if (isCredit) {
                saleCreationData.installments = [{
                    number: 1,
                    amount: totalAmount,
                    dueDate: new Date(Date.now() + creditDays * 86400000)
                }];
            }

            const saleRes = await saleService.create(businessId, cashierMember.id, saleCreationData);

            if (saleRes.status !== 201 || !saleRes.data) {
                return {
                    data: {
                        status: 'ERROR',
                        mensaje: `No se pudo procesar la venta: ${saleRes.message}`
                    }
                };
            }

            const saleCreated = saleRes.data as any;

            return {
                data: {
                    status: 'VENTA_COMPLETADA',
                    recibo_numero: saleCreated.receiptNumber,
                    cliente: client.name,
                    cajero: cashierMember.user?.name || 'Cajero de turno',
                    caja_id: openRegister.id,
                    almacen: itemsWithMeta[0].depotName,
                    condicion: isCredit ? 'CRÉDITO' : 'CONTADO',
                    metodo_pago: isCredit ? 'Pendiente por cobrar' : paymentMethodUsed?.name,
                    subtotal_usd: Number(finalSubTotal.toFixed(2)),
                    impuestos_usd: Number(finalTaxAmount.toFixed(2)),
                    descuento_usd: Number(discountDec.toFixed(2)),
                    total_usd: totalAmount.toNumber(),
                    total_ves: totalVES.toFixed(2),
                    tasa_cambio: currentRateRecord.rate,
                    articulos_vendidos: itemsSummary,
                    mensaje: `Venta #${saleCreated.receiptNumber} registrada con éxito a ${client.name} (${isCredit ? 'Crédito' : paymentMethodUsed?.name}). Total: $${totalAmount.toFixed(2)} USD (Bs. ${totalVES.toFixed(2)}). Stock actualizado.`
                },
                action: {
                    type: 'NAVIGATE',
                    label: `🧾 Ver Venta #${saleCreated.receiptNumber}`,
                    url: '/sales'
                }
            };
        }

        default:
            return {
                data: { error: `Herramienta desconocida: ${toolName}` }
            };
    }
}
