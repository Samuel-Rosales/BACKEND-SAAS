import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

type PurchaseGroupedReportItem = {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalCost: number;
};

type PurchaseGroupedReportGroup = {
  groupId: number;
  groupName: string;
  items: PurchaseGroupedReportItem[];
  subtotalQuantity: number;
  subtotalCost: number;
};

export interface PurchaseGroupedReportProps {
  businessName: string;
  logoUrl?: string | null;
  dateRange: { from: string; to: string };
  groupByLabel: string;
  groups: PurchaseGroupedReportGroup[];
  grandTotals: { totalQuantity: number; totalCost: number };
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#111827'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 56, height: 56 },
  titleWrap: { flexDirection: 'column' },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 10, color: '#4b5563', marginTop: 2 },
  business: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  meta: { fontSize: 9, color: '#4b5563', textAlign: 'right' },
  groupBlock: { marginBottom: 14 },
  groupTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#e5e7eb',
    padding: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 0
  },
  table: { width: '100%', borderLeftWidth: 1, borderTopWidth: 1, borderColor: '#d1d5db' },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 6,
    justifyContent: 'center'
  },
  headCell: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold'
  },
  colProduct: { width: '60%' },
  colQty: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  subtotal: {
    flexDirection: 'row',
    backgroundColor: '#fafafa'
  },
  subtotalLabel: { width: '60%', fontWeight: 'bold' },
  subtotalValue: { width: '20%', textAlign: 'right', fontWeight: 'bold' },
  grandTotal: {
    marginTop: 10,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#e5e7eb',
    flexDirection: 'row'
  },
  grandTotalLabel: { width: '60%', fontWeight: 'bold' },
  grandTotalValue: { width: '20%', textAlign: 'right', fontWeight: 'bold' },
});

const money = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value || 0);

const PurchaseGroupedReport = ({ businessName, logoUrl, dateRange, groupByLabel, groups, grandTotals }: PurchaseGroupedReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image src={logoUrl || logoPath} style={styles.logo} />
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Reporte de Compras</Text>
            <Text style={styles.subtitle}>Agrupado por {groupByLabel}</Text>
            <Text style={styles.business}>{businessName}</Text>
          </View>
        </View>
        <View>
          <Text style={styles.meta}>Desde: {dateRange.from}</Text>
          <Text style={styles.meta}>Hasta: {dateRange.to}</Text>
          <Text style={styles.meta}>Generado: {new Date().toLocaleDateString('es-VE')}</Text>
        </View>
      </View>

      {groups.map((group) => (
        <View key={group.groupId} style={styles.groupBlock}>
          <Text style={styles.groupTitle}>{groupByLabel}: {group.groupName}</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.headCell, styles.colProduct]}>Producto</Text>
              <Text style={[styles.cell, styles.headCell, styles.colQty]}>Cantidad</Text>
              <Text style={[styles.cell, styles.headCell, styles.colTotal]}>Total</Text>
            </View>

            {group.items.map((item) => (
              <View style={styles.row} key={item.productId}>
                <Text style={[styles.cell, styles.colProduct]}>{item.productName}</Text>
                <Text style={[styles.cell, styles.colQty]}>{item.totalQuantity.toLocaleString('es-VE')}</Text>
                <Text style={[styles.cell, styles.colTotal]}>{money(item.totalCost)}</Text>
              </View>
            ))}

            <View style={styles.subtotal}>
              <Text style={[styles.cell, styles.subtotalLabel]}>Subtotal {groupByLabel.toLowerCase()}</Text>
              <Text style={[styles.cell, styles.subtotalValue]}>{group.subtotalQuantity.toLocaleString('es-VE')}</Text>
              <Text style={[styles.cell, styles.subtotalValue]}>{money(group.subtotalCost)}</Text>
            </View>
          </View>
        </View>
      ))}

      <View style={styles.grandTotal}>
        <Text style={[styles.cell, styles.grandTotalLabel]}>TOTAL GENERAL</Text>
        <Text style={[styles.cell, styles.grandTotalValue]}>{grandTotals.totalQuantity.toLocaleString('es-VE')}</Text>
        <Text style={[styles.cell, styles.grandTotalValue]}>{money(grandTotals.totalCost)}</Text>
      </View>
    </Page>
  </Document>
);

export default PurchaseGroupedReport;
