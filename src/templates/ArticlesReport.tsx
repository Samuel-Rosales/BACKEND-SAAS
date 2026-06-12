import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

type ArticleProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
};

export interface ArticlesReportProps {
  businessName: string;
  logoUrl?: string | null;
  fromDate: string;
  toDate: string;
  products: ArticleProduct[];
  totals: {
    totalUnits: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
  };
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica', color: '#111827' },
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#e5e7eb',
    padding: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 6
  },
  table: { width: '100%', borderLeftWidth: 1, borderTopWidth: 1, borderColor: '#d1d5db' },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 5,
    paddingHorizontal: 3,
    justifyContent: 'center'
  },
  headCell: { backgroundColor: '#f9fafb', fontWeight: 'bold' },
  colRank: { width: '5%', textAlign: 'center' },
  colProduct: { width: '22%' },
  colCategory: { width: '14%' },
  colUnits: { width: '9%', textAlign: 'right' },
  colRevenue: { width: '14%', textAlign: 'right' },
  colCost: { width: '14%', textAlign: 'right' },
  colProfit: { width: '12%', textAlign: 'right' },
  colMargin: { width: '10%', textAlign: 'right' },
  productSku: { fontSize: 7, color: '#6b7280', marginTop: 1 },
  totalBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#e5e7eb'
  },
  totalRow: { flexDirection: 'row' },
  totalLabel: { width: '41%', fontWeight: 'bold' },
  totalCell: { fontWeight: 'bold', textAlign: 'right' },
  profitPositive: { color: '#059669' },
  profitNegative: { color: '#dc2626' }
});

const money = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value || 0);

const ArticlesReportPDF = ({ businessName, logoUrl, fromDate, toDate, products, totals }: ArticlesReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image style={styles.logo} src={logoUrl || logoPath} />
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Reporte de Artículos</Text>
            <Text style={styles.subtitle}>Ranking por ventas y ganancia</Text>
            <Text style={styles.business}>{businessName}</Text>
          </View>
        </View>
        <View>
          <Text style={styles.meta}>Desde: {fromDate}</Text>
          <Text style={styles.meta}>Hasta: {toDate}</Text>
          <Text style={styles.meta}>Artículos: {products.length}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ranking de artículos por unidades vendidas</Text>

      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headCell, styles.colRank]}>#</Text>
          <Text style={[styles.cell, styles.headCell, styles.colProduct]}>Artículo</Text>
          <Text style={[styles.cell, styles.headCell, styles.colCategory]}>Categoría</Text>
          <Text style={[styles.cell, styles.headCell, styles.colUnits]}>Unid.</Text>
          <Text style={[styles.cell, styles.headCell, styles.colRevenue]}>Ingreso</Text>
          <Text style={[styles.cell, styles.headCell, styles.colCost]}>Costo</Text>
          <Text style={[styles.cell, styles.headCell, styles.colProfit]}>Ganancia</Text>
          <Text style={[styles.cell, styles.headCell, styles.colMargin]}>Margen</Text>
        </View>

        {products.map((item, index) => (
          <View style={styles.row} key={item.id}>
            <Text style={[styles.cell, styles.colRank]}>{index + 1}</Text>
            <View style={[styles.cell, styles.colProduct]}>
              <Text>{item.name}</Text>
              <Text style={styles.productSku}>{item.sku || '-'}</Text>
            </View>
            <Text style={[styles.cell, styles.colCategory]}>{item.category}</Text>
            <Text style={[styles.cell, styles.colUnits]}>{item.totalUnitsSold.toLocaleString('es-VE')}</Text>
            <Text style={[styles.cell, styles.colRevenue]}>{money(item.totalRevenue)}</Text>
            <Text style={[styles.cell, styles.colCost]}>{money(item.totalCost)}</Text>
            <Text style={[styles.cell, styles.colProfit, item.netProfit >= 0 ? styles.profitPositive : styles.profitNegative]}>
              {money(item.netProfit)}
            </Text>
            <Text style={[styles.cell, styles.colMargin, item.profitMargin >= 0 ? styles.profitPositive : styles.profitNegative]}>
              {item.profitMargin.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
          <Text style={[styles.cell, styles.totalLabel]}>TOTALES</Text>
          <Text style={[styles.cell, styles.colUnits, styles.totalCell]}>{totals.totalUnits.toLocaleString('es-VE')}</Text>
          <Text style={[styles.cell, styles.colRevenue, styles.totalCell]}>{money(totals.totalRevenue)}</Text>
          <Text style={[styles.cell, styles.colCost, styles.totalCell]}>{money(totals.totalCost)}</Text>
          <Text style={[styles.cell, styles.colProfit, styles.totalCell, totals.totalProfit >= 0 ? styles.profitPositive : styles.profitNegative]}>
            {money(totals.totalProfit)}
          </Text>
          <Text style={[styles.cell, styles.colMargin]}>
            {totals.totalCost > 0 ? ((totals.totalProfit / totals.totalCost) * 100).toFixed(1) : '0.0'}%
          </Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default ArticlesReportPDF;
