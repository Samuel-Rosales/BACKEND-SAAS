import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

// ── Types ──────────────────────────────────────────────────────────────────

interface ProductMarginItem {
    productId: number;
    productName: string;
    categoryName: string;
    unitsSold: number;
    totalRevenue: number;
    totalCost: number;
    realProfit: number;
    configuredMargin: number;
    realMargin: number;
    marginDeviation: number;
}

interface FinancialOverview {
    grossRevenue: number;
    returns: number;
    netRevenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    grossMarginPct: number;
    totalExpenses: number;
    netProfit: number;
    netMarginPct: number;
    salesCount: number;
    purchasesCount: number;
    avgTicket: number;
    revenueVariation: number;
    expensesVariation: number;
    profitVariation: number;
}

export interface FinancialReportProps {
    businessName: string;
    logoUrl?: string | null;
    dateRange: { from: string; to: string };
    overview: FinancialOverview;
    products: ProductMarginItem[];
}

// ── Colors ─────────────────────────────────────────────────────────────────

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
    neutral: '#2c3e50',
};

// ── Styles ─────────────────────────────────────────────────────────────────

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
        marginBottom: 20,
        paddingBottom: 14,
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

    // ── Sections ──
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
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

    // ── P&L Table ──
    plTable: { width: '100%', borderWidth: 1, borderColor: C.border },
    plRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight },
    plRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight, backgroundColor: C.tableAlt },
    plRowTotal: { flexDirection: 'row', backgroundColor: C.totalBg, borderTopWidth: 1.5, borderTopColor: C.accentLight },
    plRowSubtotal: { flexDirection: 'row', backgroundColor: C.subtotalBg, borderBottomWidth: 1, borderBottomColor: C.border },
    plLabel: {
        flex: 5,
        paddingVertical: 5,
        paddingHorizontal: 8,
        fontSize: 8.5,
        color: C.text,
    },
    plLabelIndent: {
        flex: 5,
        paddingVertical: 5,
        paddingLeft: 20,
        paddingRight: 8,
        fontSize: 8.5,
        color: C.muted,
    },
    plLabelBold: {
        flex: 5,
        paddingVertical: 5,
        paddingHorizontal: 8,
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.accent,
    },
    plAmount: {
        flex: 2.5,
        paddingVertical: 5,
        paddingHorizontal: 8,
        fontSize: 8.5,
        textAlign: 'right',
        borderLeftWidth: 1,
        borderLeftColor: C.borderLight,
    },
    plAmountBold: {
        flex: 2.5,
        paddingVertical: 5,
        paddingHorizontal: 8,
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'right',
        borderLeftWidth: 1,
        borderLeftColor: C.borderLight,
        color: C.accent,
    },
    plPct: {
        flex: 1.5,
        paddingVertical: 5,
        paddingHorizontal: 8,
        fontSize: 8,
        textAlign: 'right',
        color: C.muted,
        borderLeftWidth: 1,
        borderLeftColor: C.borderLight,
    },
    plPctBold: {
        flex: 1.5,
        paddingVertical: 5,
        paddingHorizontal: 8,
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'right',
        color: C.accent,
        borderLeftWidth: 1,
        borderLeftColor: C.borderLight,
    },

    // ── KPIs Grid ──
    kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    kpiColumn: { flex: 1, borderWidth: 1, borderColor: C.border },
    kpiRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight },
    kpiRowLast: { flexDirection: 'row' },
    kpiLabel: {
        flex: 1.4,
        paddingVertical: 5,
        paddingHorizontal: 7,
        fontSize: 8,
        color: C.muted,
        backgroundColor: C.tableAlt,
        borderRightWidth: 1,
        borderRightColor: C.borderLight,
    },
    kpiValue: {
        flex: 1,
        paddingVertical: 5,
        paddingHorizontal: 7,
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: C.text,
        textAlign: 'right',
    },

    // ── Products Table ──
    table: { width: '100%', borderWidth: 1, borderColor: C.border },
    tableHead: { flexDirection: 'row', backgroundColor: C.tableHead },
    tableHeadCell: {
        paddingVertical: 5,
        paddingHorizontal: 5,
        color: C.tableHeadText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 7.5,
        letterSpacing: 0.3,
    },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight },
    tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight, backgroundColor: C.tableAlt },
    tableCell: {
        paddingVertical: 4,
        paddingHorizontal: 5,
        fontSize: 8,
        color: C.text,
        borderRightWidth: 1,
        borderRightColor: C.borderLight,
    },
    tableCellLast: {
        paddingVertical: 4,
        paddingHorizontal: 5,
        fontSize: 8,
        color: C.text,
    },
    tableTotalRow: {
        flexDirection: 'row',
        backgroundColor: C.totalBg,
        borderTopWidth: 1.5,
        borderTopColor: C.accentLight,
    },
    tableTotalCell: {
        paddingVertical: 5,
        paddingHorizontal: 5,
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: C.accent,
        borderRightWidth: 1,
        borderRightColor: C.border,
    },
    tableTotalCellLast: {
        paddingVertical: 5,
        paddingHorizontal: 5,
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: C.accent,
    },

    // Product columns — flex-based
    colProdName:   { flex: 3.0 },
    colProdCat:    { flex: 1.8 },
    colProdUnits:  { flex: 1.0, textAlign: 'center' },
    colProdRev:    { flex: 1.5, textAlign: 'right' },
    colProdCost:   { flex: 1.5, textAlign: 'right' },
    colProdProfit: { flex: 1.5, textAlign: 'right' },
    colProdCfg:    { flex: 1.2, textAlign: 'right' },
    colProdReal:   { flex: 1.2, textAlign: 'right' },
    colProdDev:    { flex: 1.2, textAlign: 'right' },

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

const pct = (v: number) => `${v.toFixed(1)}%`;

const variation = (v: number) => {
    if (v === 0) return '0.0%';
    return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
};

// ── Component ──────────────────────────────────────────────────────────────

const FinancialReport = ({
    businessName,
    logoUrl,
    dateRange,
    overview,
    products,
}: FinancialReportProps) => {

    const o = overview;
    const netRevenue = o.netRevenue;
    const pctOf = (v: number) => netRevenue > 0 ? pct((v / netRevenue) * 100) : '—';
    const cogsPct = netRevenue > 0 ? (o.costOfGoodsSold / netRevenue) * 100 : 0;
    const expPct = netRevenue > 0 ? (o.totalExpenses / netRevenue) * 100 : 0;

    // Product summary totals
    const prodTotalRevenue = products.reduce((s, p) => s + p.totalRevenue, 0);
    const prodTotalCost = products.reduce((s, p) => s + p.totalCost, 0);
    const prodTotalProfit = products.reduce((s, p) => s + p.realProfit, 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* ══ HEADER ══════════════════════════════════════════════════ */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image src={logoUrl || logoPath} style={styles.logo} />
                        <View style={styles.headerTitles}>
                            <Text style={styles.reportTitle}>REPORTE FINANCIERO GENERAL</Text>
                            <Text style={styles.reportSubtitle}>
                                Estado de resultados consolidado y analisis de margenes
                            </Text>
                            <Text style={styles.businessName}>{businessName}</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Periodo</Text>
                            <Text style={styles.metaValue}>{dateRange.from}  —  {dateRange.to}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Fecha de emision</Text>
                            <Text style={styles.metaValue}>{new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                        </View>
                    </View>
                </View>

                {/* ══ I. ESTADO DE RESULTADOS (P&L) ═══════════════════════════ */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>I. Estado de Resultados</Text>
                </View>

                <View style={styles.plTable}>
                    {/* Header row */}
                    <View style={styles.tableHead}>
                        <Text style={[styles.tableHeadCell, { flex: 5 }]}>Concepto</Text>
                        <Text style={[styles.tableHeadCell, { flex: 2.5, textAlign: 'right' }]}>Monto (USD)</Text>
                        <Text style={[styles.tableHeadCell, { flex: 1.5, textAlign: 'right' }]}>% Ingresos</Text>
                    </View>

                    {/* Ingresos Brutos */}
                    <View style={styles.plRow}>
                        <Text style={styles.plLabel}>Ingresos Brutos por Ventas</Text>
                        <Text style={styles.plAmount}>{usd(o.grossRevenue)}</Text>
                        <Text style={styles.plPct}>100.0%</Text>
                    </View>

                    {/* (-) Devoluciones */}
                    <View style={styles.plRowAlt}>
                        <Text style={styles.plLabelIndent}>(-) Devoluciones y Notas de Credito</Text>
                        <Text style={[styles.plAmount, { color: C.red }]}>({usd(o.returns)})</Text>
                        <Text style={styles.plPct}>{pctOf(o.returns)}</Text>
                    </View>

                    {/* = Ingresos Netos */}
                    <View style={styles.plRowSubtotal}>
                        <Text style={styles.plLabelBold}>= Ingresos Netos</Text>
                        <Text style={styles.plAmountBold}>{usd(o.netRevenue)}</Text>
                        <Text style={styles.plPctBold}>100.0%</Text>
                    </View>

                    {/* (-) Costo de Ventas */}
                    <View style={styles.plRow}>
                        <Text style={styles.plLabelIndent}>(-) Costo de Ventas (COGS)</Text>
                        <Text style={[styles.plAmount, { color: C.red }]}>({usd(o.costOfGoodsSold)})</Text>
                        <Text style={styles.plPct}>{pct(cogsPct)}</Text>
                    </View>

                    {/* = Utilidad Bruta */}
                    <View style={styles.plRowSubtotal}>
                        <Text style={styles.plLabelBold}>= Utilidad Bruta</Text>
                        <Text style={[styles.plAmountBold, { color: o.grossProfit >= 0 ? C.green : C.red }]}>{usd(o.grossProfit)}</Text>
                        <Text style={styles.plPctBold}>{pct(o.grossMarginPct)}</Text>
                    </View>

                    {/* (-) Gastos Operativos */}
                    <View style={styles.plRowAlt}>
                        <Text style={styles.plLabelIndent}>(-) Gastos Operativos (Compras)</Text>
                        <Text style={[styles.plAmount, { color: C.red }]}>({usd(o.totalExpenses)})</Text>
                        <Text style={styles.plPct}>{pct(expPct)}</Text>
                    </View>

                    {/* = UTILIDAD NETA */}
                    <View style={styles.plRowTotal}>
                        <Text style={styles.plLabelBold}>= UTILIDAD NETA</Text>
                        <Text style={[styles.plAmountBold, { color: o.netProfit >= 0 ? C.green : C.red }]}>{usd(o.netProfit)}</Text>
                        <Text style={styles.plPctBold}>{pct(o.netMarginPct)}</Text>
                    </View>
                </View>

                {/* ══ II. INDICADORES CLAVE ════════════════════════════════════ */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>II. Indicadores Clave</Text>
                </View>

                <View style={styles.kpiGrid}>
                    {/* Left column — Operational */}
                    <View style={styles.kpiColumn}>
                        <View style={styles.kpiRow}>
                            <Text style={styles.kpiLabel}>Ventas completadas</Text>
                            <Text style={styles.kpiValue}>{o.salesCount}</Text>
                        </View>
                        <View style={styles.kpiRow}>
                            <Text style={styles.kpiLabel}>Compras recibidas</Text>
                            <Text style={styles.kpiValue}>{o.purchasesCount}</Text>
                        </View>
                        <View style={styles.kpiRowLast}>
                            <Text style={styles.kpiLabel}>Ticket promedio</Text>
                            <Text style={styles.kpiValue}>{usd(o.avgTicket)}</Text>
                        </View>
                    </View>

                    {/* Right column — Margins & Variations */}
                    <View style={styles.kpiColumn}>
                        <View style={styles.kpiRow}>
                            <Text style={styles.kpiLabel}>Var. ingresos vs anterior</Text>
                            <Text style={[styles.kpiValue, { color: o.revenueVariation >= 0 ? C.green : C.red }]}>{variation(o.revenueVariation)}</Text>
                        </View>
                        <View style={styles.kpiRow}>
                            <Text style={styles.kpiLabel}>Var. gastos vs anterior</Text>
                            <Text style={[styles.kpiValue, { color: o.expensesVariation <= 0 ? C.green : C.red }]}>{variation(o.expensesVariation)}</Text>
                        </View>
                        <View style={styles.kpiRowLast}>
                            <Text style={styles.kpiLabel}>Var. utilidad vs anterior</Text>
                            <Text style={[styles.kpiValue, { color: o.profitVariation >= 0 ? C.green : C.red }]}>{variation(o.profitVariation)}</Text>
                        </View>
                    </View>
                </View>

                {/* ══ III. ANÁLISIS DE MÁRGENES POR PRODUCTO ═══════════════════ */}
                {products.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>III. Analisis de Margenes por Producto</Text>
                        </View>

                        <View style={styles.table}>
                            <View style={styles.tableHead}>
                                <Text style={[styles.tableHeadCell, styles.colProdName]}>Producto</Text>
                                <Text style={[styles.tableHeadCell, styles.colProdCat]}>Categoria</Text>
                                <Text style={[styles.tableHeadCell, styles.colProdUnits, { textAlign: 'center' }]}>Uds.</Text>
                                <Text style={[styles.tableHeadCell, styles.colProdRev, { textAlign: 'right' }]}>Ingreso</Text>
                                <Text style={[styles.tableHeadCell, styles.colProdCost, { textAlign: 'right' }]}>Costo</Text>
                                <Text style={[styles.tableHeadCell, styles.colProdProfit, { textAlign: 'right' }]}>Ganancia</Text>
                                <Text style={[styles.tableHeadCell, styles.colProdCfg, { textAlign: 'right' }]}>M. Cfg.</Text>
                                <Text style={[styles.tableHeadCell, styles.colProdReal, { textAlign: 'right' }]}>M. Real</Text>
                                <Text style={[styles.tableHeadCell, styles.colProdDev, { textAlign: 'right' }]}>Desv.</Text>
                            </View>

                            {products.map((p, i) => (
                                <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={p.productId}>
                                    <Text style={[styles.tableCell, styles.colProdName]}>{p.productName}</Text>
                                    <Text style={[styles.tableCell, styles.colProdCat]}>{p.categoryName}</Text>
                                    <Text style={[styles.tableCell, styles.colProdUnits]}>{p.unitsSold}</Text>
                                    <Text style={[styles.tableCell, styles.colProdRev]}>{usd(p.totalRevenue)}</Text>
                                    <Text style={[styles.tableCell, styles.colProdCost]}>{usd(p.totalCost)}</Text>
                                    <Text style={[styles.tableCell, styles.colProdProfit, { color: p.realProfit >= 0 ? C.green : C.red, fontFamily: 'Helvetica-Bold' }]}>{usd(p.realProfit)}</Text>
                                    <Text style={[styles.tableCell, styles.colProdCfg]}>{pct(p.configuredMargin)}</Text>
                                    <Text style={[styles.tableCell, styles.colProdReal, { color: p.realMargin >= 0 ? C.green : C.red, fontFamily: 'Helvetica-Bold' }]}>{pct(p.realMargin)}</Text>
                                    <Text style={[styles.tableCellLast, styles.colProdDev, { color: p.marginDeviation >= 0 ? C.green : C.red, fontFamily: 'Helvetica-Bold' }]}>
                                        {p.marginDeviation > 0 ? '+' : ''}{pct(p.marginDeviation)}
                                    </Text>
                                </View>
                            ))}

                            {/* Totals row */}
                            <View style={styles.tableTotalRow}>
                                <Text style={[styles.tableTotalCell, styles.colProdName]}>TOTALES</Text>
                                <Text style={[styles.tableTotalCell, styles.colProdCat]}></Text>
                                <Text style={[styles.tableTotalCell, styles.colProdUnits]}>
                                    {products.reduce((s, p) => s + p.unitsSold, 0)}
                                </Text>
                                <Text style={[styles.tableTotalCell, styles.colProdRev]}>{usd(prodTotalRevenue)}</Text>
                                <Text style={[styles.tableTotalCell, styles.colProdCost]}>{usd(prodTotalCost)}</Text>
                                <Text style={[styles.tableTotalCell, styles.colProdProfit, { color: prodTotalProfit >= 0 ? C.green : C.red }]}>{usd(prodTotalProfit)}</Text>
                                <Text style={[styles.tableTotalCell, styles.colProdCfg]}></Text>
                                <Text style={[styles.tableTotalCell, styles.colProdReal]}></Text>
                                <Text style={[styles.tableTotalCellLast, styles.colProdDev]}></Text>
                            </View>
                        </View>
                    </>
                )}

                {/* ══ FOOTER ══════════════════════════════════════════════════ */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        {businessName} · Reporte Financiero General · {dateRange.from} — {dateRange.to}
                    </Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
};

export default FinancialReport;
