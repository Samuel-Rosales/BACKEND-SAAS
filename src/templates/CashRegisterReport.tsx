import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

// ── Types ──────────────────────────────────────────────────────────────────

type PaymentMethodSummary = {
    method: string;
    type: string;
    currency?: string;
    isCashea?: boolean;
    transactions: number;
    amountUSD: number;
    amountVES?: number;
    amountCOP?: number;
    percentage?: number;
};

type CashRegisterDetail = {
    id: string;
    status: string;
    openTime: string;
    closeTime: string;
    initialAmount: number;
    finalAmount: number;
    collectedUSD?: number;
    collectedVES?: number;
    collectedCOP?: number;
    collectedCasheaUSD?: number;
    salesCount: number;
    difference: number;
};

type SellerReport = {
    id: string;
    name: string;
    ci: string;
    enableCopCurrency?: boolean;
    totalSales: number;
    totalUSD: number;
    totalVES: number;
    totalCOP?: number;
    totalCasheaUSD?: number;
    casheaTransactions?: number;
    methodsUSD?: PaymentMethodSummary[];
    methodsVES?: PaymentMethodSummary[];
    methodsCOP?: PaymentMethodSummary[];
    methodsCashea?: PaymentMethodSummary[];
    articlesCount: number;
    registers: CashRegisterDetail[];
};

export interface CashRegisterReportProps {
    businessName: string;
    logoUrl?: string | null;
    enableCopCurrency?: boolean;
    dateRange: { from: string; to: string };
    sellerFilter?: string | null;
    overview: {
        enableCopCurrency?: boolean;
        openRegisters: number;
        closedRegisters: number;
        totalUSD: number;
        totalVES: number;
        totalCOP?: number;
        totalCasheaUSD?: number;
        casheaTransactions?: number;
        salesCount: number;
        activeSellers: number;
        initialCashUSD: number;
        finalCashUSD: number;
        payoutsUSD: number;
        methods: PaymentMethodSummary[];
        methodsUSD?: PaymentMethodSummary[];
        methodsVES?: PaymentMethodSummary[];
        methodsCOP?: PaymentMethodSummary[];
        methodsCashea?: PaymentMethodSummary[];
    };
    sellers: SellerReport[];
    includeEmployeesBreakdown?: boolean;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const C = {
    black: '#0a0a0a',
    dark: '#1a1a2e',
    accent: '#1d3557',
    accentLight: '#457b9d',
    tableHead: '#2c3e50',
    tableHeadText: '#ffffff',
    tableAlt: '#f5f7fa',
    border: '#c8d0db',
    borderLight: '#dde3eb',
    text: '#1a1a2e',
    muted: '#5a6373',
    faint: '#8392a5',
    white: '#ffffff',
    subtotalBg: '#eaf0f6',
    totalBg: '#d0dce8',
    red: '#c0392b',
    green: '#1a6b3a',
    indigo: '#3730a3',
    indigoBg: '#eef2ff',
    indigoBorder: '#c7d2fe',
    amber: '#92400e',
    amberBg: '#fffbeb',
    emeraldBg: '#ecfdf5',
    neutral: '#2c3e50',
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 32,
        paddingBottom: 40,
        paddingHorizontal: 32,
        fontSize: 9,
        fontFamily: 'Helvetica',
        color: C.text,
        backgroundColor: '#ffffff',
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: C.accent,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logo: { width: 48, height: 48 },
    headerTitles: { flexDirection: 'column', gap: 2 },
    reportTitle: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: C.accent, letterSpacing: 0.5 },
    reportSubtitle: { fontSize: 8.5, color: C.accentLight, marginTop: 2 },
    businessName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.black, marginTop: 4 },

    headerRight: { alignItems: 'flex-end', gap: 3 },
    metaLabel: { fontSize: 7.5, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
    metaValue: { fontSize: 8.5, color: C.text, fontFamily: 'Helvetica-Bold' },
    metaRow: { flexDirection: 'column', alignItems: 'flex-end', marginBottom: 2 },

    // ── Section titles ──
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: C.accent,
    },
    sectionTitle: {
        fontSize: 9.5,
        fontFamily: 'Helvetica-Bold',
        color: C.accent,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    subSectionTitle: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.accent,
        marginTop: 8,
        marginBottom: 4,
        textTransform: 'uppercase',
    },

    // ── Summary two-column table ──
    summaryGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 4,
    },
    summaryColumn: {
        flex: 1,
        borderWidth: 1,
        borderColor: C.border,
    },
    summaryRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    summaryRowLast: {
        flexDirection: 'row',
    },
    summaryLabel: {
        flex: 1.4,
        paddingVertical: 5,
        paddingHorizontal: 7,
        fontSize: 8,
        color: C.muted,
        backgroundColor: C.tableAlt,
        borderRightWidth: 1,
        borderRightColor: C.borderLight,
    },
    summaryValue: {
        flex: 1,
        paddingVertical: 5,
        paddingHorizontal: 7,
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.text,
        textAlign: 'right',
    },
    summaryValueAccent: {
        flex: 1,
        paddingVertical: 5,
        paddingHorizontal: 7,
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.green,
        textAlign: 'right',
    },
    summaryValueIndigo: {
        flex: 1,
        paddingVertical: 5,
        paddingHorizontal: 7,
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.indigo,
        textAlign: 'right',
    },

    // ── Generic table ──
    table: { width: '100%', borderWidth: 1, borderColor: C.border, marginBottom: 6 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight },
    tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight, backgroundColor: C.tableAlt },
    tableHead: { flexDirection: 'row', backgroundColor: C.tableHead },
    tableHeadIndigo: { flexDirection: 'row', backgroundColor: C.indigo },
    tableHeadCell: {
        paddingVertical: 5,
        paddingHorizontal: 6,
        color: C.tableHeadText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        letterSpacing: 0.3,
    },
    tableCell: {
        paddingVertical: 4,
        paddingHorizontal: 6,
        fontSize: 8.5,
        color: C.text,
        borderRightWidth: 1,
        borderRightColor: C.borderLight,
    },
    tableCellLast: {
        paddingVertical: 4,
        paddingHorizontal: 6,
        fontSize: 8.5,
        color: C.text,
    },
    tableTotalRow: {
        flexDirection: 'row',
        backgroundColor: C.totalBg,
        borderTopWidth: 1.5,
        borderTopColor: C.accentLight,
    },
    tableTotalRowIndigo: {
        flexDirection: 'row',
        backgroundColor: C.indigoBg,
        borderTopWidth: 1.5,
        borderTopColor: C.indigoBorder,
    },
    tableTotalCell: {
        paddingVertical: 5,
        paddingHorizontal: 6,
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.accent,
        borderRightWidth: 1,
        borderRightColor: C.border,
    },
    tableTotalCellLast: {
        paddingVertical: 5,
        paddingHorizontal: 6,
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.accent,
    },

    // Payment methods columns
    colPayMethod: { flex: 4.2 },
    colPayTx:     { flex: 1.5, textAlign: 'right' },
    colPayAmt:    { flex: 2.8, textAlign: 'right' },
    colPayPct:    { flex: 1.5, textAlign: 'right' },

    // Seller block
    sellerBlock: { marginTop: 10, marginBottom: 4 },
    sellerHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        backgroundColor: C.accent,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginBottom: 0,
    },
    sellerNameText: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.white },
    sellerCiText: { fontSize: 7.5, color: '#a8c8e8', marginTop: 1 },
    sellerTotalText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#a8e8a8', textAlign: 'right' },
    sellerSalesText: { fontSize: 7.5, color: '#c8dce8', textAlign: 'right', marginTop: 1 },

    // Seller 3-column breakdown (USD, VES, Cashea)
    sellerBreakdownGrid: {
        flexDirection: 'row',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: C.border,
        backgroundColor: '#fafbfc',
    },
    sellerBreakdownCol: {
        flex: 1,
        paddingVertical: 5,
        paddingHorizontal: 7,
        borderRightWidth: 1,
        borderRightColor: C.borderLight,
    },
    sellerBreakdownColLast: {
        flex: 1,
        paddingVertical: 5,
        paddingHorizontal: 7,
        backgroundColor: C.indigoBg,
    },
    sellerBreakdownTitleUSD: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: C.green,
        textTransform: 'uppercase',
        marginBottom: 3,
        paddingBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    sellerBreakdownTitleVES: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: C.amber,
        textTransform: 'uppercase',
        marginBottom: 3,
        paddingBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    sellerBreakdownTitleCOP: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: '#2563eb',
        textTransform: 'uppercase',
        marginBottom: 3,
        paddingBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    sellerBreakdownTitleCashea: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: C.indigo,
        textTransform: 'uppercase',
        marginBottom: 3,
        paddingBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: C.indigoBorder,
    },
    sellerMethodLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 1.5,
    },
    sellerMethodName: {
        fontSize: 7.5,
        color: C.muted,
        flex: 1,
        paddingRight: 6,
    },
    sellerMethodVal: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: C.text,
        textAlign: 'right',
        flexShrink: 0,
    },
    sellerSubtotalLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingTop: 3,
        borderTopWidth: 1,
        borderTopColor: C.border,
    },
    sellerSubtotalLabel: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: C.text,
        flex: 1,
        paddingRight: 6,
    },
    sellerSubtotalValueUSD: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.green,
        textAlign: 'right',
        flexShrink: 0,
    },
    sellerSubtotalValueVES: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.amber,
        textAlign: 'right',
        flexShrink: 0,
    },
    sellerSubtotalValueCOP: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: '#2563eb',
        textAlign: 'right',
        flexShrink: 0,
    },
    sellerSubtotalValueCashea: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.indigo,
        textAlign: 'right',
        flexShrink: 0,
    },

    // Cash register table columns
    colRegId:     { flex: 1.1 },
    colRegStatus: { flex: 0.9, textAlign: 'center' },
    colRegOpen:   { flex: 1.8, textAlign: 'center' },
    colRegClose:  { flex: 1.8, textAlign: 'center' },
    colRegSales:  { flex: 0.7, textAlign: 'right' },
    colRegInit:   { flex: 1.1, textAlign: 'right' },
    colRegUSD:    { flex: 1.3, textAlign: 'right' },
    colRegVES:    { flex: 1.4, textAlign: 'right' },
    colRegCOP:    { flex: 1.4, textAlign: 'right' },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 32,
        right: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: C.borderLight,
        paddingTop: 5,
    },
    footerText: { fontSize: 7, color: C.faint },
});

// ── Helpers ────────────────────────────────────────────────────────────────

const usd = (v: number) => {
    const isNeg = v < 0;
    const absVal = Math.abs(v || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (isNeg ? '-' : '') + 'USD ' + absVal;
};

const ves = (v: number) => {
    const isNeg = v < 0;
    const absVal = Math.abs(v || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (isNeg ? '-' : '') + absVal + ' Bs.';
};

const cop = (v: number) => {
    const isNeg = v < 0;
    const absVal = Math.abs(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return (isNeg ? '-' : '') + 'COP ' + absVal;
};

const fmtDT = (iso: string) => {
    if (!iso || iso === '—') return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleString('es-VE', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
};

const statusLabel = (s: string) => s === 'OPEN' ? 'Abierta' : 'Cerrada';

// ── Component ──────────────────────────────────────────────────────────────

const CashRegisterReport = ({
    businessName,
    logoUrl,
    enableCopCurrency,
    dateRange,
    sellerFilter,
    overview,
    sellers,
    includeEmployeesBreakdown = true,
}: CashRegisterReportProps) => {
    const showCOP = Boolean(enableCopCurrency ?? overview.enableCopCurrency);
    const methodsUSD = overview.methodsUSD ?? overview.methods.filter(m => !m.isCashea && (m.currency === 'USD' || (m.amountUSD > 0 && !(m.amountVES && m.amountVES > 0) && !(m.amountCOP && m.amountCOP > 0))));
    const methodsVES = overview.methodsVES ?? overview.methods.filter(m => !m.isCashea && (m.currency === 'VES' || (m.amountVES && m.amountVES > 0)));
    const methodsCOP = showCOP ? (overview.methodsCOP ?? overview.methods.filter(m => !m.isCashea && (m.currency === 'COP' || (m.amountCOP && m.amountCOP > 0)))) : [];
    const methodsCashea = overview.methodsCashea ?? overview.methods.filter(m => m.isCashea);
    const totalCasheaUSD = overview.totalCasheaUSD ?? methodsCashea.reduce((acc, m) => acc + (m.amountUSD || 0), 0);
    const totalCOP = showCOP ? (overview.totalCOP ?? methodsCOP.reduce((acc, m) => acc + (m.amountCOP || 0), 0)) : 0;

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* ══ HEADER ══════════════════════════════════════════════════ */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image src={logoUrl || logoPath} style={styles.logo} />
                        <View style={styles.headerTitles}>
                            <Text style={styles.reportTitle}>REPORTE DE CAJA</Text>
                            <Text style={styles.reportSubtitle}>
                                {sellerFilter
                                    ? `Filtrado por empleado: ${sellerFilter}`
                                    : 'Informe general de turnos y conciliación de pagos por moneda nativa'}
                            </Text>
                            <Text style={styles.businessName}>{businessName}</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Período</Text>
                            <Text style={styles.metaValue}>{dateRange.from}  —  {dateRange.to}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Fecha de emisión</Text>
                            <Text style={styles.metaValue}>{new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                        </View>
                    </View>
                </View>

                {/* ══ I. RESUMEN EJECUTIVO ═════════════════════════════════════ */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>I. Resumen General</Text>
                </View>

                <View style={styles.summaryGrid}>
                    {/* Left column */}
                    <View style={styles.summaryColumn}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Cajas abiertas</Text>
                            <Text style={styles.summaryValue}>{overview.openRegisters}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Cajas cerradas</Text>
                            <Text style={styles.summaryValue}>{overview.closedRegisters}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Vendedores activos</Text>
                            <Text style={styles.summaryValue}>{overview.activeSellers}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>N° de ventas</Text>
                            <Text style={styles.summaryValue}>{overview.salesCount}</Text>
                        </View>
                        <View style={styles.summaryRowLast}>
                            <Text style={styles.summaryLabel}>Financiamiento de Cashea (Aparte)</Text>
                            <Text style={styles.summaryValueIndigo}>{usd(totalCasheaUSD)}</Text>
                        </View>
                    </View>

                    {/* Right column */}
                    <View style={styles.summaryColumn}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total recaudado en Dólares (USD)</Text>
                            <Text style={styles.summaryValueAccent}>{usd(overview.totalUSD)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total recaudado en Bolívares (Bs.)</Text>
                            <Text style={styles.summaryValue}>{ves(overview.totalVES)}</Text>
                        </View>
                        {showCOP && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total recaudado en Pesos (COP)</Text>
                                <Text style={styles.summaryValue}>{cop(totalCOP)}</Text>
                            </View>
                        )}
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Efectivo inicial (USD)</Text>
                            <Text style={styles.summaryValue}>{usd(overview.initialCashUSD)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Efectivo final estimado (USD)</Text>
                            <Text style={styles.summaryValue}>{usd(overview.finalCashUSD)}</Text>
                        </View>
                        <View style={styles.summaryRowLast}>
                            <Text style={styles.summaryLabel}>Devoluciones en efectivo</Text>
                            <Text style={styles.summaryValue}>{usd(overview.payoutsUSD)}</Text>
                        </View>
                    </View>
                </View>

                {/* ══ II. CONCILIACIÓN DE MÉTODOS DE PAGO (POR MONEDA Y CASHEA APARTE) ══ */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>II. Conciliación de Métodos de Pago</Text>
                </View>

                {/* II.A: Desglose en Dólares (USD - Sin Cashea) */}
                <Text style={styles.subSectionTitle}>1. Desglose de Ingresos en Dólares (USD — Efectivo / Zelle / Divisas)</Text>
                <View style={styles.table}>
                    <View style={styles.tableHead}>
                        <Text style={[styles.tableHeadCell, styles.colPayMethod]}>Método de Pago en Dólares</Text>
                        <Text style={[styles.tableHeadCell, styles.colPayTx]}>Transacciones</Text>
                        <Text style={[styles.tableHeadCell, styles.colPayAmt]}>Monto Recibido (USD)</Text>
                        <Text style={[styles.tableHeadCell, styles.colPayPct]}>% del Total USD</Text>
                    </View>
                    {methodsUSD.length === 0 ? (
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCellLast, { flex: 1, color: C.muted }]}>Sin cobros registrados en métodos en Dólares (USD) en este período.</Text>
                        </View>
                    ) : (
                        methodsUSD.map((m, i) => (
                            <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={i}>
                                <Text style={[styles.tableCell, styles.colPayMethod]}>{m.method}</Text>
                                <Text style={[styles.tableCell, styles.colPayTx]}>{m.transactions}</Text>
                                <Text style={[styles.tableCell, styles.colPayAmt, { fontFamily: 'Helvetica-Bold', color: C.green }]}>{usd(m.amountUSD)}</Text>
                                <Text style={[styles.tableCellLast, styles.colPayPct]}>{(m.percentage ?? 0).toFixed(2)}%</Text>
                            </View>
                        ))
                    )}
                    <View style={styles.tableTotalRow}>
                        <Text style={[styles.tableTotalCell, styles.colPayMethod]}>TOTAL RECAUDADO EN DÓLARES (USD)</Text>
                        <Text style={[styles.tableTotalCell, styles.colPayTx]}>
                            {methodsUSD.reduce((a, m) => a + m.transactions, 0)}
                        </Text>
                        <Text style={[styles.tableTotalCell, styles.colPayAmt, { color: C.green }]}>{usd(overview.totalUSD)}</Text>
                        <Text style={[styles.tableTotalCellLast, styles.colPayPct]}>100.00%</Text>
                    </View>
                </View>

                {/* II.B: Desglose en Bolívares (Bs.) */}
                <Text style={styles.subSectionTitle}>2. Desglose de Ingresos en Bolívares (Bs. — Punto de Venta / Pago Móvil / Efectivo Bs)</Text>
                <View style={styles.table}>
                    <View style={styles.tableHead}>
                        <Text style={[styles.tableHeadCell, styles.colPayMethod]}>Método de Pago en Bolívares</Text>
                        <Text style={[styles.tableHeadCell, styles.colPayTx]}>Transacciones</Text>
                        <Text style={[styles.tableHeadCell, styles.colPayAmt]}>Monto Recibido (Bs.)</Text>
                        <Text style={[styles.tableHeadCell, styles.colPayPct]}>% del Total Bs.</Text>
                    </View>
                    {methodsVES.length === 0 ? (
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCellLast, { flex: 1, color: C.muted }]}>Sin cobros registrados en métodos en Bolívares (Bs.) en este período.</Text>
                        </View>
                    ) : (
                        methodsVES.map((m, i) => (
                            <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={i}>
                                <Text style={[styles.tableCell, styles.colPayMethod]}>{m.method}</Text>
                                <Text style={[styles.tableCell, styles.colPayTx]}>{m.transactions}</Text>
                                <Text style={[styles.tableCell, styles.colPayAmt, { fontFamily: 'Helvetica-Bold', color: C.amber }]}>{ves(m.amountVES ?? 0)}</Text>
                                <Text style={[styles.tableCellLast, styles.colPayPct]}>{(m.percentage ?? 0).toFixed(2)}%</Text>
                            </View>
                        ))
                    )}
                    <View style={styles.tableTotalRow}>
                        <Text style={[styles.tableTotalCell, styles.colPayMethod]}>TOTAL RECAUDADO EN BOLÍVARES (Bs.)</Text>
                        <Text style={[styles.tableTotalCell, styles.colPayTx]}>
                            {methodsVES.reduce((a, m) => a + m.transactions, 0)}
                        </Text>
                        <Text style={[styles.tableTotalCell, styles.colPayAmt, { color: C.amber }]}>{ves(overview.totalVES)}</Text>
                        <Text style={[styles.tableTotalCellLast, styles.colPayPct]}>100.00%</Text>
                    </View>
                </View>

                {showCOP ? (
                    <>
                        {/* II.C: Desglose en Pesos Colombianos (COP) */}
                        <Text style={styles.subSectionTitle}>3. Desglose de Ingresos en Pesos Colombianos (COP — Efectivo / Transferencias)</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHead}>
                                <Text style={[styles.tableHeadCell, styles.colPayMethod]}>Método de Pago en Pesos</Text>
                                <Text style={[styles.tableHeadCell, styles.colPayTx]}>Transacciones</Text>
                                <Text style={[styles.tableHeadCell, styles.colPayAmt]}>Monto Recibido (COP)</Text>
                                <Text style={[styles.tableHeadCell, styles.colPayPct]}>% del Total COP</Text>
                            </View>
                            {methodsCOP.length === 0 ? (
                                <View style={styles.tableRow}>
                                    <Text style={[styles.tableCellLast, { flex: 1, color: C.muted }]}>Sin cobros registrados en métodos en Pesos Colombianos (COP) en este período.</Text>
                                </View>
                            ) : (
                                methodsCOP.map((m, i) => (
                                    <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={i}>
                                        <Text style={[styles.tableCell, styles.colPayMethod]}>{m.method}</Text>
                                        <Text style={[styles.tableCell, styles.colPayTx]}>{m.transactions}</Text>
                                        <Text style={[styles.tableCell, styles.colPayAmt, { fontFamily: 'Helvetica-Bold', color: '#2563eb' }]}>{cop(m.amountCOP ?? 0)}</Text>
                                        <Text style={[styles.tableCellLast, styles.colPayPct]}>{(m.percentage ?? 0).toFixed(2)}%</Text>
                                    </View>
                                ))
                            )}
                            <View style={styles.tableTotalRow}>
                                <Text style={[styles.tableTotalCell, styles.colPayMethod]}>TOTAL RECAUDADO EN PESOS (COP)</Text>
                                <Text style={[styles.tableTotalCell, styles.colPayTx]}>
                                    {methodsCOP.reduce((a, m) => a + m.transactions, 0)}
                                </Text>
                                <Text style={[styles.tableTotalCell, styles.colPayAmt, { color: '#2563eb' }]}>{cop(totalCOP)}</Text>
                                <Text style={[styles.tableTotalCellLast, styles.colPayPct]}>100.00%</Text>
                            </View>
                        </View>

                        {/* II.D: Sección Aparte — Financiamiento de Cashea */}
                        <Text style={[styles.subSectionTitle, { color: C.indigo }]}>4. Sección Aparte: Financiamiento de Cashea (No entra en Efectivo USD, Bolívares ni Pesos)</Text>
                    </>
                ) : (
                    /* II.C Clásico: Sección Aparte — Financiamiento de Cashea */
                    <Text style={[styles.subSectionTitle, { color: C.indigo }]}>3. Sección Aparte: Financiamiento de Cashea (No entra en Efectivo USD ni en Bolívares)</Text>
                )}
                <View style={[styles.table, { borderColor: C.indigoBorder }]}>
                    <View style={styles.tableHeadIndigo}>
                        <Text style={[styles.tableHeadCell, styles.colPayMethod]}>Concepto de Financiamiento</Text>
                        <Text style={[styles.tableHeadCell, styles.colPayTx]}>Operaciones</Text>
                        <Text style={[styles.tableHeadCell, styles.colPayAmt]}>Monto Financiado</Text>
                        <Text style={[styles.tableHeadCell, styles.colPayPct]}>Participación</Text>
                    </View>
                    {methodsCashea.length === 0 ? (
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCellLast, { flex: 1, color: C.muted }]}>Sin operaciones de Financiamiento de Cashea en este período.</Text>
                        </View>
                    ) : (
                        methodsCashea.map((m, i) => (
                            <View style={styles.tableRow} key={i}>
                                <Text style={[styles.tableCell, styles.colPayMethod, { fontFamily: 'Helvetica-Bold', color: C.indigo }]}>Financiamiento de Cashea</Text>
                                <Text style={[styles.tableCell, styles.colPayTx]}>{m.transactions}</Text>
                                <Text style={[styles.tableCell, styles.colPayAmt, { fontFamily: 'Helvetica-Bold', color: C.indigo }]}>{usd(m.amountUSD)}</Text>
                                <Text style={[styles.tableCellLast, styles.colPayPct]}>100.00%</Text>
                            </View>
                        ))
                    )}
                    <View style={styles.tableTotalRowIndigo}>
                        <Text style={[styles.tableTotalCell, styles.colPayMethod, { color: C.indigo }]}>TOTAL FINANCIAMIENTO DE CASHEA</Text>
                        <Text style={[styles.tableTotalCell, styles.colPayTx, { color: C.indigo }]}>
                            {methodsCashea.reduce((a, m) => a + m.transactions, 0)}
                        </Text>
                        <Text style={[styles.tableTotalCell, styles.colPayAmt, { color: C.indigo }]}>{usd(totalCasheaUSD)}</Text>
                        <Text style={[styles.tableTotalCellLast, styles.colPayPct, { color: C.indigo }]}>100.00%</Text>
                    </View>
                </View>

                {includeEmployeesBreakdown !== false && sellers.length > 0 && (
                <>
{/* ══ III. DESGLOSE POR VENDEDOR ═══════════════════════════════ */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>III. Desglose por Empleado</Text>
                </View>

                {sellers.map((seller) => {
                    const sUSD = seller.methodsUSD ?? [];
                    const sVES = seller.methodsVES ?? [];
                    const sCOP = showCOP ? (seller.methodsCOP ?? []) : [];
                    const sTotalCOP = showCOP ? (seller.totalCOP ?? sCOP.reduce((a, m) => a + (m.amountCOP || 0), 0)) : 0;
                    const sCashea = seller.methodsCashea ?? [];
                    const sTotalCashea = seller.totalCasheaUSD ?? sCashea.reduce((a, m) => a + (m.amountUSD || 0), 0);

                    return (
                        <View key={seller.id} style={styles.sellerBlock} wrap={false}>
                            {/* Seller header bar */}
                            <View style={styles.sellerHeaderRow}>
                                <View>
                                    <Text style={styles.sellerNameText}>{seller.name}</Text>
                                    <Text style={styles.sellerCiText}>CI: {seller.ci ?? '—'}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.sellerTotalText}>
                                        {showCOP ? (
                                            `USD: ${usd(seller.totalUSD)} | Bs: ${ves(seller.totalVES)} | COP: ${cop(sTotalCOP)}${sTotalCashea > 0 ? ` | Cashea: ${usd(sTotalCashea)}` : ''}`
                                        ) : (
                                            `Dólares: ${usd(seller.totalUSD)}  |  Bolívares: ${ves(seller.totalVES)}${sTotalCashea > 0 ? `  |  Cashea: ${usd(sTotalCashea)}` : ''}`
                                        )}
                                    </Text>
                                    <Text style={styles.sellerSalesText}>
                                        {seller.totalSales} ventas · {seller.articlesCount} artículos vendidos
                                    </Text>
                                </View>
                            </View>

                            {/* Column Breakdown */}
                            <View style={styles.sellerBreakdownGrid}>
                                {/* Col 1: Dólares (USD) */}
                                <View style={styles.sellerBreakdownCol}>
                                    <Text style={styles.sellerBreakdownTitleUSD}>¿Cómo llegamos a los Dólares (USD)?</Text>
                                    {sUSD.length === 0 ? (
                                        <Text style={styles.sellerMethodName}>Sin pagos en USD</Text>
                                    ) : (
                                        sUSD.map((m, idx) => (
                                            <View style={styles.sellerMethodLine} key={idx}>
                                                <Text style={styles.sellerMethodName}>• {m.method} ({m.transactions})</Text>
                                                <Text style={styles.sellerMethodVal}>{usd(m.amountUSD)}</Text>
                                            </View>
                                        ))
                                    )}
                                    <View style={styles.sellerSubtotalLine}>
                                        <Text style={styles.sellerSubtotalLabel}>Total en USD:</Text>
                                        <Text style={styles.sellerSubtotalValueUSD}>{usd(seller.totalUSD)}</Text>
                                    </View>
                                </View>

                                {/* Col 2: Bolívares (Bs.) */}
                                <View style={styles.sellerBreakdownCol}>
                                    <Text style={styles.sellerBreakdownTitleVES}>¿Cómo llegamos a los Bolívares (Bs.)?</Text>
                                    {sVES.length === 0 ? (
                                        <Text style={styles.sellerMethodName}>Sin pagos en Bolívares</Text>
                                    ) : (
                                        sVES.map((m, idx) => (
                                            <View style={styles.sellerMethodLine} key={idx}>
                                                <Text style={styles.sellerMethodName}>• {m.method} ({m.transactions})</Text>
                                                <Text style={styles.sellerMethodVal}>{ves(m.amountVES ?? 0)}</Text>
                                            </View>
                                        ))
                                    )}
                                    <View style={styles.sellerSubtotalLine}>
                                        <Text style={styles.sellerSubtotalLabel}>Total en Bs.:</Text>
                                        <Text style={styles.sellerSubtotalValueVES}>{ves(seller.totalVES)}</Text>
                                    </View>
                                </View>

                                {showCOP && (
                                    /* Col 3: Pesos Colombianos (COP) */
                                    <View style={styles.sellerBreakdownCol}>
                                        <Text style={styles.sellerBreakdownTitleCOP}>¿Cómo llegamos a los Pesos (COP)?</Text>
                                        {sCOP.length === 0 ? (
                                            <Text style={styles.sellerMethodName}>Sin pagos en COP</Text>
                                        ) : (
                                            sCOP.map((m, idx) => (
                                                <View style={styles.sellerMethodLine} key={idx}>
                                                    <Text style={styles.sellerMethodName}>• {m.method} ({m.transactions})</Text>
                                                    <Text style={styles.sellerMethodVal}>{cop(m.amountCOP ?? 0)}</Text>
                                                </View>
                                            ))
                                        )}
                                        <View style={styles.sellerSubtotalLine}>
                                            <Text style={styles.sellerSubtotalLabel}>Total en COP:</Text>
                                            <Text style={styles.sellerSubtotalValueCOP}>{cop(sTotalCOP)}</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Cashea (Aparte) */}
                                <View style={styles.sellerBreakdownColLast}>
                                    <Text style={styles.sellerBreakdownTitleCashea}>Sección Aparte: Cashea</Text>
                                    {sCashea.length === 0 ? (
                                        <Text style={styles.sellerMethodName}>Sin financiamiento Cashea</Text>
                                    ) : (
                                        sCashea.map((m, idx) => (
                                            <View style={styles.sellerMethodLine} key={idx}>
                                                <Text style={styles.sellerMethodName}>• Financiamiento de Cashea ({m.transactions})</Text>
                                                <Text style={styles.sellerMethodVal}>{usd(m.amountUSD)}</Text>
                                            </View>
                                        ))
                                    )}
                                    <View style={[styles.sellerSubtotalLine, { borderTopColor: C.indigoBorder }]}>
                                        <Text style={[styles.sellerSubtotalLabel, { color: C.indigo }]}>Total Cashea:</Text>
                                        <Text style={styles.sellerSubtotalValueCashea}>{usd(sTotalCashea)}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Cash registers table for this seller */}
                            {seller.registers.length > 0 && (
                                <View style={[styles.table, { borderTopWidth: 0, marginBottom: 0 }]}>
                                    <View style={styles.tableHead}>
                                        <Text style={[styles.tableHeadCell, styles.colRegId]}>Turno</Text>
                                        <Text style={[styles.tableHeadCell, styles.colRegStatus, { textAlign: 'center' }]}>Estado</Text>
                                        <Text style={[styles.tableHeadCell, styles.colRegOpen, { textAlign: 'center' }]}>Apertura</Text>
                                        <Text style={[styles.tableHeadCell, styles.colRegClose, { textAlign: 'center' }]}>Cierre</Text>
                                        <Text style={[styles.tableHeadCell, styles.colRegSales, { textAlign: 'right' }]}>Ventas</Text>
                                        <Text style={[styles.tableHeadCell, styles.colRegInit, { textAlign: 'right' }]}>Inicial</Text>
                                        <Text style={[styles.tableHeadCell, styles.colRegUSD, { textAlign: 'right' }]}>Cobrado (USD)</Text>
                                        {showCOP ? (
                                            <>
                                                <Text style={[styles.tableHeadCell, styles.colRegVES, { textAlign: 'right' }]}>Cobrado (Bs.)</Text>
                                                <Text style={[styles.tableHeadCell, styles.colRegCOP, { textAlign: 'right' }]}>Cobrado (COP)</Text>
                                            </>
                                        ) : (
                                            <Text style={[styles.tableHeadCell, styles.colRegVES, { textAlign: 'right' }]}>Cobrado (Bs.)</Text>
                                        )}
                                    </View>

                                    {seller.registers.map((reg, ri) => (
                                        <View
                                            style={ri % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                                            key={reg.id}
                                        >
                                            <Text style={[styles.tableCell, styles.colRegId]}>{reg.id}</Text>
                                            <Text style={[styles.tableCell, styles.colRegStatus]}>{statusLabel(reg.status)}</Text>
                                            <Text style={[styles.tableCell, styles.colRegOpen]}>{fmtDT(reg.openTime)}</Text>
                                            <Text style={[styles.tableCell, styles.colRegClose]}>{fmtDT(reg.closeTime)}</Text>
                                            <Text style={[styles.tableCell, styles.colRegSales]}>{reg.salesCount}</Text>
                                            <Text style={[styles.tableCell, styles.colRegInit]}>{usd(reg.initialAmount)}</Text>
                                            <Text style={[styles.tableCell, styles.colRegUSD, { color: C.green, fontFamily: 'Helvetica-Bold' }]}>
                                                {usd(reg.collectedUSD ?? 0)}
                                            </Text>
                                            {showCOP ? (
                                                <>
                                                    <Text style={[styles.tableCell, styles.colRegVES, { color: C.amber, fontFamily: 'Helvetica-Bold' }]}>
                                                        {ves(reg.collectedVES ?? 0)}
                                                    </Text>
                                                    <Text style={[styles.tableCellLast, styles.colRegCOP, { color: '#2563eb', fontFamily: 'Helvetica-Bold' }]}>
                                                        {cop(reg.collectedCOP ?? 0)}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text style={[styles.tableCellLast, styles.colRegVES, { color: C.amber, fontFamily: 'Helvetica-Bold' }]}>
                                                    {ves(reg.collectedVES ?? 0)}
                                                </Text>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    );
                })}

                                </>
            )}

            {/* ══ FOOTER ══════════════════════════════════════════════════ */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        {businessName} · Reporte de Caja · {dateRange.from} — {dateRange.to}
                    </Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
};

export default CashRegisterReport;
