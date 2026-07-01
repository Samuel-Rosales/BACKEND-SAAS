import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

// ── Types ──────────────────────────────────────────────────────────────────

interface InstallmentItem {
    number: number;
    amount: number;
    amountPaid: number;
    dueDate: string;
    status: string;
}

interface DebtorItem {
    clientName: string;
    clientPhone?: string;
    receiptNumber: string;
    createdAt: string;
    totalAmount: number;
    remainingBalance: number;
    status: string;
    installments: InstallmentItem[];
}

interface CollectionsOverview {
    totalToCollect: number;
    totalCollected: number;
    debtorsCount: number;
    overdueInstallmentsCount: number;
    expectedInPeriod: number;
}

export interface CollectionsReportProps {
    businessName: string;
    logoUrl?: string | null;
    dateRange: { from: string; to: string };
    overview: CollectionsOverview;
    debtors: DebtorItem[];
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
    amber: '#b45309',
    blue: '#2563eb',
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

    // Header
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

    // Sections
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

    // KPI Grid
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

    // Debtors Table
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

    // Column widths (flex-based)
    colClient:    { flex: 2.5 },
    colReceipt:   { flex: 1.5 },
    colDate:      { flex: 1.5 },
    colTotal:     { flex: 1.5, textAlign: 'right' },
    colPaid:      { flex: 1.5, textAlign: 'right' },
    colRemaining: { flex: 1.5, textAlign: 'right' },
    colStatus:    { flex: 1.2, textAlign: 'center' },
    colNextDue:   { flex: 1.8, textAlign: 'center' },

    // Installments sub-table
    instBlock: {
        marginLeft: 16,
        marginVertical: 3,
        borderLeftWidth: 2,
        borderLeftColor: C.accentLight,
        paddingLeft: 6,
    },
    instRow: { flexDirection: 'row', paddingVertical: 2 },
    instText: { fontSize: 7, color: C.muted },
    instTextBold: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.text },

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

const fmtDate = (iso: string) => {
    if (!iso || iso === '—') return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
};

const statusLabel = (s: string) => {
    switch (s) {
        case 'PAID': return 'Pagado';
        case 'PARTIAL': return 'Parcial';
        case 'PENDING': return 'Pendiente';
        case 'OVERDUE': return 'Vencida';
        default: return s;
    }
};

const statusColor = (s: string) => {
    switch (s) {
        case 'PAID': return C.green;
        case 'PARTIAL': return C.blue;
        case 'PENDING': return C.amber;
        case 'OVERDUE': return C.red;
        default: return C.neutral;
    }
};

// ── Component ──────────────────────────────────────────────────────────────

const CollectionsReport = ({
    businessName,
    logoUrl,
    dateRange,
    overview,
    debtors,
}: CollectionsReportProps) => {

    const o = overview;

    // Totals for the debtors table
    const totalDebt = debtors.reduce((s, d) => s + d.remainingBalance, 0);
    const totalSaleAmount = debtors.reduce((s, d) => s + d.totalAmount, 0);
    const totalPaid = debtors.reduce((s, d) => s + (d.totalAmount - d.remainingBalance), 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* ══ HEADER ══════════════════════════════════════════════════ */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image src={logoUrl || logoPath} style={styles.logo} />
                        <View style={styles.headerTitles}>
                            <Text style={styles.reportTitle}>REPORTE DE COBRANZA</Text>
                            <Text style={styles.reportSubtitle}>
                                Cuentas por cobrar y estado de cuotas
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

                {/* ══ I. RESUMEN DE COBRANZA ═══════════════════════════════════ */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>I. Resumen de Cobranza</Text>
                </View>

                <View style={styles.kpiGrid}>
                    <View style={styles.kpiColumn}>
                        <View style={styles.kpiRow}>
                            <Text style={styles.kpiLabel}>Total por cobrar</Text>
                            <Text style={[styles.kpiValue, { color: C.red }]}>{usd(o.totalToCollect)}</Text>
                        </View>
                        <View style={styles.kpiRow}>
                            <Text style={styles.kpiLabel}>Total cobrado (periodo)</Text>
                            <Text style={[styles.kpiValue, { color: C.green }]}>{usd(o.totalCollected)}</Text>
                        </View>
                        <View style={styles.kpiRowLast}>
                            <Text style={styles.kpiLabel}>Esperado en periodo</Text>
                            <Text style={[styles.kpiValue, { color: C.blue }]}>{usd(o.expectedInPeriod)}</Text>
                        </View>
                    </View>

                    <View style={styles.kpiColumn}>
                        <View style={styles.kpiRow}>
                            <Text style={styles.kpiLabel}>Clientes deudores</Text>
                            <Text style={[styles.kpiValue, { color: C.amber }]}>{o.debtorsCount}</Text>
                        </View>
                        <View style={styles.kpiRow}>
                            <Text style={styles.kpiLabel}>Cuotas vencidas</Text>
                            <Text style={[styles.kpiValue, { color: C.red }]}>{o.overdueInstallmentsCount}</Text>
                        </View>
                        <View style={styles.kpiRowLast}>
                            <Text style={styles.kpiLabel}>Efectividad de cobro</Text>
                            <Text style={[styles.kpiValue, { color: o.expectedInPeriod > 0 && o.totalCollected >= o.expectedInPeriod ? C.green : C.amber }]}>
                                {o.expectedInPeriod > 0 ? ((o.totalCollected / o.expectedInPeriod) * 100).toFixed(1) + '%' : '—'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ══ II. DETALLE DE CLIENTES CON DEUDA ════════════════════════ */}
                {debtors.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>II. Detalle de Clientes con Deuda</Text>
                        </View>

                        <View style={styles.table}>
                            <View style={styles.tableHead}>
                                <Text style={[styles.tableHeadCell, styles.colClient]}>Cliente</Text>
                                <Text style={[styles.tableHeadCell, styles.colReceipt]}>Factura</Text>
                                <Text style={[styles.tableHeadCell, styles.colDate]}>Fecha</Text>
                                <Text style={[styles.tableHeadCell, styles.colTotal, { textAlign: 'right' }]}>Total Venta</Text>
                                <Text style={[styles.tableHeadCell, styles.colPaid, { textAlign: 'right' }]}>Pagado</Text>
                                <Text style={[styles.tableHeadCell, styles.colRemaining, { textAlign: 'right' }]}>Pendiente</Text>
                                <Text style={[styles.tableHeadCell, styles.colStatus, { textAlign: 'center' }]}>Estado</Text>
                                <Text style={[styles.tableHeadCell, styles.colNextDue, { textAlign: 'center' }]}>Prox. Cuota</Text>
                            </View>

                            {debtors.map((d, i) => {
                                const paidAmount = d.totalAmount - d.remainingBalance;
                                const pendingInst = d.installments.filter(inst => inst.status === 'PENDING' || inst.status === 'PARTIAL');
                                const nextInst = pendingInst[0];

                                return (
                                    <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={`${d.receiptNumber}-${i}`}>
                                        <Text style={[styles.tableCell, styles.colClient]}>{d.clientName}</Text>
                                        <Text style={[styles.tableCell, styles.colReceipt]}>#{d.receiptNumber}</Text>
                                        <Text style={[styles.tableCell, styles.colDate]}>{fmtDate(d.createdAt)}</Text>
                                        <Text style={[styles.tableCell, styles.colTotal]}>{usd(d.totalAmount)}</Text>
                                        <Text style={[styles.tableCell, styles.colPaid, { color: C.green }]}>{usd(paidAmount)}</Text>
                                        <Text style={[styles.tableCell, styles.colRemaining, { color: C.red, fontFamily: 'Helvetica-Bold' }]}>{usd(d.remainingBalance)}</Text>
                                        <Text style={[styles.tableCell, styles.colStatus, { color: statusColor(d.status), fontFamily: 'Helvetica-Bold' }]}>{statusLabel(d.status)}</Text>
                                        <Text style={[styles.tableCellLast, styles.colNextDue]}>
                                            {nextInst ? `#${nextInst.number} — ${fmtDate(nextInst.dueDate)}` : '—'}
                                        </Text>
                                    </View>
                                );
                            })}

                            {/* Totals row */}
                            <View style={styles.tableTotalRow}>
                                <Text style={[styles.tableTotalCell, styles.colClient]}>TOTALES ({debtors.length} registros)</Text>
                                <Text style={[styles.tableTotalCell, styles.colReceipt]}></Text>
                                <Text style={[styles.tableTotalCell, styles.colDate]}></Text>
                                <Text style={[styles.tableTotalCell, styles.colTotal]}>{usd(totalSaleAmount)}</Text>
                                <Text style={[styles.tableTotalCell, styles.colPaid, { color: C.green }]}>{usd(totalPaid)}</Text>
                                <Text style={[styles.tableTotalCell, styles.colRemaining, { color: C.red }]}>{usd(totalDebt)}</Text>
                                <Text style={[styles.tableTotalCell, styles.colStatus]}></Text>
                                <Text style={[styles.tableTotalCellLast, styles.colNextDue]}></Text>
                            </View>
                        </View>
                    </>
                )}

                {debtors.length === 0 && (
                    <View style={{ marginTop: 20, padding: 16, textAlign: 'center' }}>
                        <Text style={{ fontSize: 9, color: C.muted }}>No se encontraron clientes con deuda en el periodo seleccionado.</Text>
                    </View>
                )}

                {/* ══ FOOTER ══════════════════════════════════════════════════ */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        {businessName} · Reporte de Cobranza · {dateRange.from} — {dateRange.to}
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

export default CollectionsReport;
