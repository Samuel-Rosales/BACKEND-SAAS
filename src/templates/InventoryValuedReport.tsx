import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

type InventoryValuedProduct = {
  id: number;
  name: string;
  sku: string | null;
  unitSymbol?: string;
  currentStock: number;
  costPrice: number;
  salePrice: number;
  profitMargin: number;
  totalCost: number;
  totalSale: number;
};

type InventoryValuedGroup = {
  categoryId: number;
  categoryName: string;
  products: InventoryValuedProduct[];
  subtotalStock: number;
  subtotalCost: number;
  subtotalSale: number;
};

export interface InventoryValuedReportProps {
  businessName: string;
  logoUrl?: string | null;
  date: string;
  search?: string;
  categories: InventoryValuedGroup[];
  grandTotals: {
    totalProducts: number;
    totalStock: number;
    totalCost: number;
    totalSale: number;
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
    marginBottom: 0
  },
  groupBlock: { marginBottom: 12 },
  groupTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: 5,
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  table: { width: '100%', borderLeftWidth: 1, borderTopWidth: 1, borderColor: '#d1d5db' },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 5,
    paddingHorizontal: 4,
    justifyContent: 'center'
  },
  headCell: { backgroundColor: '#f9fafb', fontWeight: 'bold' },
  colProduct: { width: '29%' },
  colStock: { width: '8%', textAlign: 'right' },
  colCost: { width: '11%', textAlign: 'right' },
  colSale: { width: '11%', textAlign: 'right' },
  colMargin: { width: '12%', textAlign: 'right' },
  colTotalCost: { width: '14%', textAlign: 'right' },
  colTotalSale: { width: '15%', textAlign: 'right' },
  productSku: { fontSize: 7, color: '#6b7280', marginTop: 1 },
  subtotal: { flexDirection: 'row', backgroundColor: '#fafafa' },
  subtotalLabel: { width: '29%', fontWeight: 'bold' },
  subtotalCell: { textAlign: 'right', fontWeight: 'bold' },
  totalBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#e5e7eb'
  },
  totalRow: { flexDirection: 'row' },
  totalLabel: { width: '29%', fontWeight: 'bold' },
  totalCell: { fontWeight: 'bold', textAlign: 'right' }
});

const money = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value || 0);

const InventoryValuedReport = ({ businessName, logoUrl, date, search, categories, grandTotals }: InventoryValuedReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image style={styles.logo} src={logoUrl || logoPath} />
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Stock Valorizado</Text>
            <Text style={styles.subtitle}>Solo productos con stock</Text>
            <Text style={styles.business}>{businessName}</Text>
          </View>
        </View>
        <View>
          <Text style={styles.meta}>Fecha: {date}</Text>
          <Text style={styles.meta}>Productos: {grandTotals.totalProducts}</Text>
          {search ? <Text style={styles.meta}>Filtro: {search}</Text> : null}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Inventario valorizado por categoría</Text>

      {categories.map((group) => (
        <View key={group.categoryId} style={styles.groupBlock}>
          <Text style={styles.groupTitle}>Categoría: {group.categoryName}</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.headCell, styles.colProduct]}>Producto</Text>
              <Text style={[styles.cell, styles.headCell, styles.colStock]}>Stock</Text>
              <Text style={[styles.cell, styles.headCell, styles.colCost]}>Costo</Text>
              <Text style={[styles.cell, styles.headCell, styles.colSale]}>Venta</Text>
              <Text style={[styles.cell, styles.headCell, styles.colMargin]}>Margen</Text>
              <Text style={[styles.cell, styles.headCell, styles.colTotalCost]}>Total Costo</Text>
              <Text style={[styles.cell, styles.headCell, styles.colTotalSale]}>Total Venta</Text>
            </View>

            {group.products.map((item) => (
              <View style={styles.row} key={item.id}>
                <View style={[styles.cell, styles.colProduct]}>
                  <Text>{item.name}</Text>
                  <Text style={styles.productSku}>{item.sku || '-'}</Text>
                </View>
                <Text style={[styles.cell, styles.colStock]}>{item.currentStock.toLocaleString('es-VE')}</Text>
                <Text style={[styles.cell, styles.colCost]}>{money(item.costPrice)}</Text>
                <Text style={[styles.cell, styles.colSale]}>{money(item.salePrice)}</Text>
                <Text style={[styles.cell, styles.colMargin]}>{item.profitMargin.toFixed(2)}%</Text>
                <Text style={[styles.cell, styles.colTotalCost]}>{money(item.totalCost)}</Text>
                <Text style={[styles.cell, styles.colTotalSale]}>{money(item.totalSale)}</Text>
              </View>
            ))}

            <View style={styles.subtotal}>
              <Text style={[styles.cell, styles.subtotalLabel]}>Subtotal categoría</Text>
              <Text style={[styles.cell, styles.colStock, styles.subtotalCell]}>{group.subtotalStock.toLocaleString('es-VE')}</Text>
              <Text style={[styles.cell, styles.colCost]}> </Text>
              <Text style={[styles.cell, styles.colSale]}> </Text>
              <Text style={[styles.cell, styles.colMargin]}> </Text>
              <Text style={[styles.cell, styles.colTotalCost, styles.subtotalCell]}>{money(group.subtotalCost)}</Text>
              <Text style={[styles.cell, styles.colTotalSale, styles.subtotalCell]}>{money(group.subtotalSale)}</Text>
            </View>
          </View>
        </View>
      ))}

      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
          <Text style={[styles.cell, styles.totalLabel]}>TOTAL GENERAL</Text>
          <Text style={[styles.cell, styles.colStock, styles.totalCell]}>{grandTotals.totalStock.toLocaleString('es-VE')}</Text>
          <Text style={[styles.cell, styles.colCost]}> </Text>
          <Text style={[styles.cell, styles.colSale]}> </Text>
          <Text style={[styles.cell, styles.colMargin]}> </Text>
          <Text style={[styles.cell, styles.colTotalCost, styles.totalCell]}>{money(grandTotals.totalCost)}</Text>
          <Text style={[styles.cell, styles.colTotalSale, styles.totalCell]}>{money(grandTotals.totalSale)}</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default InventoryValuedReport;
