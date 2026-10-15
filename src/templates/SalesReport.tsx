import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

export interface SalePDFItem {
    id: number;
    receiptNumber: number;
    createdAt: string;
    clientName: string;
    clientCi: string;
    sellerName: string;
    conditions: string;
    paymentStatus: string;
    totalAmount: number;
    remainingBalance: number;
    isCashea: boolean;
}

export interface SalesReportPDFProps {
    businessName: string;
    logoUrl?: string | null;
    fromDate: string;
    toDate: string;
    overview: {
        totalSales: number;
        totalIncome: number;
        pendingDebt: number;
        averageTicket: number;
        totalOrders: number;
        casheaIncome?: number;
        casheaTransactions?: number;
    };
    sales: SalePDFItem[];
    totals: {
        totalAmount: number;
        totalCollected: number;
        totalPending: number;
        count: number;
    };
}

const styles = StyleSheet.create({
    page: {
        padding: 24,
        fontSize: 8,
        fontFamily: 'Helvetica',
        color: '#111827',
        backgroundColor: '#ffffff'
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 10,
        marginBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: '#4f46e5'
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    logo: {
        width: 48,
        height: 48,
        objectFit: 'contain'
    },
    titleWrap: {
        flexDirection: 'column'
    },
    title: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#111827'
    },
    subtitle: {
        fontSize: 9,
        color: '#6b7280',
        marginTop: 1
    },
    business: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: '#4f46e5',
        marginTop: 2
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 2
    },
    metaLabel: {
        fontSize: 8,
        color: '#6b7280'
    },
    metaValue: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#111827'
    },

    // KPI Cards
    kpiContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12
    },
    kpiCard: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 4,
        padding: 6
    },
    kpiTitle: {
        fontSize: 7,
        color: '#6b7280',
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    kpiValue: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: '#111827'
    },
    kpiSub: {
        fontSize: 6.5,
        color: '#9ca3af',
        marginTop: 1
    },

    // Table
    tableTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#1f2937',
        marginBottom: 5,
        backgroundColor: '#f3f4f6',
        padding: 4,
        borderRadius: 2
    },
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 2
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        minHeight: 18,
        alignItems: 'center'
    },
    headRow: {
        backgroundColor: '#1f2937',
        borderBottomColor: '#111827'
    },
    cell: {
        paddingVertical: 3,
        paddingHorizontal: 3,
        fontSize: 7.5
    },
    headCell: {
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 7.5
    },

    // Columns
    colIndex: { width: '4%', textAlign: 'center' },
    colReceipt: { width: '8%', fontFamily: 'Helvetica-Bold' },
    colDate: { width: '13%' },
    colClient: { width: '22%' },
    colCi: { width: '10%' },
    colSeller: { width: '12%' },
    colCondition: { width: '9%', textAlign: 'center' },
    colStatus: { width: '10%', textAlign: 'center' },
    colTotal: { width: '12%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },

    // Status Badges
    badgePaid: { color: '#059669', fontFamily: 'Helvetica-Bold' },
    badgePending: { color: '#dc2626', fontFamily: 'Helvetica-Bold' },
    badgePartial: { color: '#d97706', fontFamily: 'Helvetica-Bold' },
    badgeCashea: { color: '#6366f1', fontFamily: 'Helvetica-Bold' },

    // Total Box
    totalBox: {
        marginTop: 8,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 4,
        padding: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    totalGroup: {
        flexDirection: 'column',
        alignItems: 'center'
    },
    totalGroupLabel: {
        fontSize: 7,
        color: '#6b7280',
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase'
    },
    totalGroupValue: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#111827',
        marginTop: 1
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 14,
        left: 24,
        right: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 6,
        fontSize: 7,
        color: '#9ca3af'
    }
});

const money = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

const formatDate = (isoString: string) => {
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('es-VE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoString;
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'PAID': return 'Cobrada';
        case 'PENDING': return 'Por Cobrar';
        case 'PARTIAL': return 'Abono Parcial';
        default: return status;
    }
};

const getStatusStyle = (status: string) => {
    switch (status) {
        case 'PAID': return styles.badgePaid;
        case 'PENDING': return styles.badgePending;
        case 'PARTIAL': return styles.badgePartial;
        default: return {};
    }
};

const SalesReportPDF: React.FC<SalesReportPDFProps> = ({
    businessName,
    logoUrl,
    fromDate,
    toDate,
    overview,
    sales,
    totals
}) => (
    <Document>
        <Page size="A4" orientation="landscape" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image style={styles.logo} src={logoUrl || logoPath} />
                    <View style={styles.titleWrap}>
                        <Text style={styles.title}>Reporte Oficial de Ventas</Text>
                        <Text style={styles.subtitle}>Detalle transaccional, estados de cobro y conciliación</Text>
                        <Text style={styles.business}>{businessName}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.metaLabel}>Período Consultado:</Text>
                    <Text style={styles.metaValue}>{fromDate} al {toDate}</Text>
                    <Text style={styles.metaLabel}>Fecha de Emisión:</Text>
                    <Text style={styles.metaValue}>{new Date().toLocaleDateString('es-VE')} {new Date().toLocaleTimeString('es-VE')}</Text>
                    <Text style={styles.metaLabel}>Total Transacciones: {totals.count}</Text>
                </View>
            </View>

            {/* KPI Cards */}
            <View style={styles.kpiContainer}>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiTitle}>Ventas Totales</Text>
                    <Text style={styles.kpiValue}>{money(overview.totalSales)}</Text>
                    <Text style={styles.kpiSub}>Facturación neta del período</Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiTitle}>Ingreso Real</Text>
                    <Text style={[styles.kpiValue, { color: '#059669' }]}>{money(overview.totalIncome)}</Text>
                    <Text style={styles.kpiSub}>Cobrado efectivamente en caja</Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiTitle}>Ventas Cashea</Text>
                    <Text style={[styles.kpiValue, { color: '#4f46e5' }]}>{money(overview.casheaIncome || 0)}</Text>
                    <Text style={styles.kpiSub}>{overview.casheaTransactions || 0} compras financiadas</Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiTitle}>Cuentas por Cobrar</Text>
                    <Text style={[styles.kpiValue, { color: overview.pendingDebt > 0 ? '#dc2626' : '#6b7280' }]}>
                        {money(overview.pendingDebt)}
                    </Text>
                    <Text style={styles.kpiSub}>Saldo pendiente clientes</Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiTitle}>Ticket Promedio</Text>
                    <Text style={styles.kpiValue}>{money(overview.averageTicket)}</Text>
                    <Text style={styles.kpiSub}>Promedio sobre {overview.totalOrders} órdenes</Text>
                </View>
            </View>

            {/* Table */}
            <Text style={styles.tableTitle}>
                Detalle Transaccional de Ventas ({sales.length} registros incluidos)
            </Text>

            <View style={styles.table}>
                <View style={[styles.row, styles.headRow]}>
                    <Text style={[styles.cell, styles.headCell, styles.colIndex]}>#</Text>
                    <Text style={[styles.cell, styles.headCell, styles.colReceipt]}>Recibo</Text>
                    <Text style={[styles.cell, styles.headCell, styles.colDate]}>Fecha / Hora</Text>
                    <Text style={[styles.cell, styles.headCell, styles.colClient]}>Cliente</Text>
                    <Text style={[styles.cell, styles.headCell, styles.colCi]}>Cédula/RIF</Text>
                    <Text style={[styles.cell, styles.headCell, styles.colSeller]}>Vendedor</Text>
                    <Text style={[styles.cell, styles.headCell, styles.colCondition]}>Condición</Text>
                    <Text style={[styles.cell, styles.headCell, styles.colStatus]}>Estado</Text>
                    <Text style={[styles.cell, styles.headCell, styles.colTotal]}>Total Venta</Text>
                </View>

                {sales.map((s, idx) => (
                    <View style={[styles.row, { backgroundColor: idx % 2 === 1 ? '#f9fafb' : '#ffffff' }]} key={s.id || idx}>
                        <Text style={[styles.cell, styles.colIndex]}>{idx + 1}</Text>
                        <Text style={[styles.cell, styles.colReceipt]}>#{s.receiptNumber}</Text>
                        <Text style={[styles.cell, styles.colDate]}>{formatDate(s.createdAt)}</Text>
                        <Text style={[styles.cell, styles.colClient]}>{s.clientName}</Text>
                        <Text style={[styles.cell, styles.colCi]}>{s.clientCi || '-'}</Text>
                        <Text style={[styles.cell, styles.colSeller]}>{s.sellerName}</Text>
                        <Text style={[styles.cell, styles.colCondition]}>
                            {s.conditions === 'CREDIT' ? 'Crédito' : 'Contado'}
                            {s.isCashea ? ' (Cashea)' : ''}
                        </Text>
                        <Text style={[styles.cell, styles.colStatus, getStatusStyle(s.paymentStatus)]}>
                            {getStatusLabel(s.paymentStatus)}
                        </Text>
                        <Text style={[styles.cell, styles.colTotal]}>{money(s.totalAmount)}</Text>
                    </View>
                ))}
            </View>

            {/* Totals Summary */}
            <View style={styles.totalBox}>
                <View style={styles.totalGroup}>
                    <Text style={styles.totalGroupLabel}>Ventas Listadas</Text>
                    <Text style={styles.totalGroupValue}>{totals.count} transacciones</Text>
                </View>
                <View style={styles.totalGroup}>
                    <Text style={styles.totalGroupLabel}>Total Facturado</Text>
                    <Text style={styles.totalGroupValue}>{money(totals.totalAmount)}</Text>
                </View>
                <View style={styles.totalGroup}>
                    <Text style={styles.totalGroupLabel}>Total Cobrado</Text>
                    <Text style={[styles.totalGroupValue, { color: '#059669' }]}>{money(totals.totalCollected)}</Text>
                </View>
                <View style={styles.totalGroup}>
                    <Text style={styles.totalGroupLabel}>Saldo por Cobrar</Text>
                    <Text style={[styles.totalGroupValue, { color: totals.totalPending > 0 ? '#dc2626' : '#111827' }]}>
                        {money(totals.totalPending)}
                    </Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer} fixed>
                <Text>Guardián ERP — Sistema Integral de Gestión Empresarial</Text>
                <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
            </View>
        </Page>
    </Document>
);

export default SalesReportPDF;
