import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

// ── Types ──────────────────────────────────────────────────────────────────

type PaymentMethodSummary = {
    method: string;
    type: string;
    transactions: number;
    amountUSD: number;
    percentage: number;
};

type CashRegisterDetail = {
    id: string;
    status: string;
    openTime: string;
    closeTime: string;
    initialAmount: number;
    finalAmount: number;
    salesCount: number;
    difference: number;
};

type SellerReport = {
    id: string;
    name: string;
    ci: string;
    totalSales: number;
    totalUSD: number;
    totalVES: number;
    articlesCount: number;
    registers: CashRegisterDetail[];
};

export interface CashRegisterReportProps {
    businessName: string;
    logoUrl?: string | null;
    dateRange: { from: string; to: string };
    sellerFilter?: string | null;
    overview: {
        openRegisters: number;
        closedRegisters: number;
        totalUSD: number;
        totalVES: number;
        salesCount: number;
        activeSellers: number;
        initialCashUSD: number;
        finalCashUSD: number;
        payoutsUSD: number;
        methods: PaymentMethodSummary[];
    };
    sellers: SellerReport[];
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

    // ── Section titles ──
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
    sectionLine: { flex: 1, height: 0 },

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
        color: C.accent,
        textAlign: 'right',
    },

    // ── Generic table ──
    table: { width: '100%', borderWidth: 1, borderColor: C.border },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight },
    tableRowLast: { flexDirection: 'row' },
    tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight, backgroundColor: C.tableAlt },
    tableHead: { flexDirection: 'row', backgroundColor: C.tableHead },
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

    // Payment methods columns — flex-based proportions to avoid padding overflow
    colPayMethod: { flex: 4.2 },
    colPayTx:     { flex: 1.7, textAlign: 'right' },
    colPayAmt:    { flex: 2.6, textAlign: 'right' },
    colPayPct:    { flex: 1.5, textAlign: 'right' },

    // Seller block
    sellerBlock: { marginTop: 12, marginBottom: 2 },
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
    sellerTotalText: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#a8e8a8', textAlign: 'right' },
    sellerSalesText: { fontSize: 7.5, color: '#c8dce8', textAlign: 'right', marginTop: 1 },

    // Seller summary mini-table
    sellerSummaryTable: {
        flexDirection: 'row',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: C.border,
        backgroundColor: C.subtotalBg,
    },
    sellerSummaryCell: {
        flex: 1,
        paddingVertical: 4,
        paddingHorizontal: 7,
        fontSize: 7.5,
        color: C.muted,
        borderRightWidth: 1,
        borderRightColor: C.borderLight,
    },
    sellerSummaryValue: {
        fontFamily: 'Helvetica-Bold',
        color: C.text,
        fontSize: 8.5,
        marginTop: 1,
    },
    sellerSummaryCellLast: {
        flex: 1,
        paddingVertical: 4,
        paddingHorizontal: 7,
        fontSize: 7.5,
        color: C.muted,
    },

    // Cash register table columns — flex-based proportions to avoid padding overflow
    colRegId:     { flex: 1.2 },
    colRegStatus: { flex: 1.0, textAlign: 'center' },
    colRegOpen:   { flex: 2.0, textAlign: 'center' },
    colRegClose:  { flex: 2.0, textAlign: 'center' },
    colRegSales:  { flex: 0.8, textAlign: 'right' },
    colRegInit:   { flex: 1.4, textAlign: 'right' },
    colRegDiff:   { flex: 1.6, textAlign: 'right' },

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

const num = (v: number) => new Intl.NumberFormat('es-VE').format(v || 0);

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
    dateRange,
    sellerFilter,
    overview,
    sellers,
}: CashRegisterReportProps) => (
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
                                : 'Informe general de turnos y conciliación de pagos'}
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
                    <View style={styles.summaryRowLast}>
                        <Text style={styles.summaryLabel}>N° de ventas</Text>
                        <Text style={styles.summaryValue}>{overview.salesCount}</Text>
                    </View>
                </View>

                {/* Right column */}
                <View style={styles.summaryColumn}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total recaudado (USD)</Text>
                        <Text style={styles.summaryValueAccent}>{usd(overview.totalUSD)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total recaudado (VES)</Text>
                        <Text style={styles.summaryValue}>{num(overview.totalVES)} Bs.</Text>
                    </View>
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

            {/* ══ II. CONCILIACIÓN DE MÉTODOS DE PAGO ═════════════════════ */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>II. Conciliación de Métodos de Pago</Text>
            </View>

            <View style={styles.table}>
                <View style={styles.tableHead}>
                    <Text style={[styles.tableHeadCell, styles.colPayMethod]}>Método de Pago</Text>
                    <Text style={[styles.tableHeadCell, styles.colPayTx, { textAlign: 'right' }]}>Transacciones</Text>
                    <Text style={[styles.tableHeadCell, styles.colPayAmt, { textAlign: 'right' }]}>Monto (USD)</Text>
                    <Text style={[styles.tableHeadCell, styles.colPayPct, { textAlign: 'right' }]}>Participación</Text>
                </View>

                {overview.methods.map((m, i) => (
                    <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={i}>
                        <Text style={[styles.tableCell, styles.colPayMethod]}>{m.method}</Text>
                        <Text style={[styles.tableCell, styles.colPayTx]}>{m.transactions}</Text>
                        <Text style={[styles.tableCell, styles.colPayAmt]}>{usd(m.amountUSD)}</Text>
                        <Text style={[styles.tableCellLast, styles.colPayPct]}>{m.percentage.toFixed(2)}%</Text>
                    </View>
                ))}

                <View style={styles.tableTotalRow}>
                    <Text style={[styles.tableTotalCell, styles.colPayMethod]}>TOTAL GENERAL</Text>
                    <Text style={[styles.tableTotalCell, styles.colPayTx]}>
                        {overview.methods.reduce((a, m) => a + m.transactions, 0)}
                    </Text>
                    <Text style={[styles.tableTotalCell, styles.colPayAmt]}>{usd(overview.totalUSD)}</Text>
                    <Text style={[styles.tableTotalCellLast, styles.colPayPct]}>100.00%</Text>
                </View>
            </View>

            {/* ══ III. DESGLOSE POR VENDEDOR ═══════════════════════════════ */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>III. Desglose por Empleado</Text>
            </View>

            {sellers.map((seller) => (
                <View key={seller.id} style={styles.sellerBlock} wrap={false}>
                    {/* Seller header bar */}
                    <View style={styles.sellerHeaderRow}>
                        <View>
                            <Text style={styles.sellerNameText}>{seller.name}</Text>
                            <Text style={styles.sellerCiText}>CI: {seller.ci ?? '—'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.sellerTotalText}>{usd(seller.totalUSD)}</Text>
                            <Text style={styles.sellerSalesText}>
                                {seller.totalSales} ventas · {seller.articlesCount} artículos
                            </Text>
                        </View>
                    </View>

                    {/* Seller summary row */}
                    <View style={styles.sellerSummaryTable}>
                        <View style={styles.sellerSummaryCell}>
                            <Text>Total en USD</Text>
                            <Text style={styles.sellerSummaryValue}>{usd(seller.totalUSD)}</Text>
                        </View>
                        <View style={styles.sellerSummaryCell}>
                            <Text>Total en VES</Text>
                            <Text style={styles.sellerSummaryValue}>{num(seller.totalVES)} Bs.</Text>
                        </View>
                        <View style={styles.sellerSummaryCell}>
                            <Text>N° Ventas</Text>
                            <Text style={styles.sellerSummaryValue}>{seller.totalSales}</Text>
                        </View>
                        <View style={styles.sellerSummaryCellLast}>
                            <Text>Artículos</Text>
                            <Text style={styles.sellerSummaryValue}>{seller.articlesCount}</Text>
                        </View>
                    </View>

                    {/* Cash registers (turnos) */}
                    {seller.registers.length > 0 && (
                        <View style={[styles.table, { borderTopWidth: 0 }]}>
                            <View style={styles.tableHead}>
                                <Text style={[styles.tableHeadCell, styles.colRegId]}>Turno</Text>
                                <Text style={[styles.tableHeadCell, styles.colRegStatus, { textAlign: 'center' }]}>Estado</Text>
                                <Text style={[styles.tableHeadCell, styles.colRegOpen, { textAlign: 'center' }]}>Apertura</Text>
                                <Text style={[styles.tableHeadCell, styles.colRegClose, { textAlign: 'center' }]}>Cierre</Text>
                                <Text style={[styles.tableHeadCell, styles.colRegSales, { textAlign: 'right' }]}>Ventas</Text>
                                <Text style={[styles.tableHeadCell, styles.colRegInit, { textAlign: 'right' }]}>Inicial</Text>
                                <Text style={[styles.tableHeadCell, styles.colRegDiff, { textAlign: 'right' }]}>Diferencia</Text>
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
                                    <Text style={[styles.tableCellLast, styles.colRegDiff, { color: reg.difference < 0 ? C.red : reg.difference > 0 ? C.green : C.neutral, fontFamily: 'Helvetica-Bold' }]}>
                                        {reg.difference > 0 ? '+' : ''}{usd(reg.difference)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            ))}

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

export default CashRegisterReport;
