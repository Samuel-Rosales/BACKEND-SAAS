import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

type DepotLot = {
  id: number;
  quantity: number;
  lotCost: number;
  expirationDate: string;
  totalCost: number;
};

type DepotProduct = {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  totalCost: number;
  totalSale: number;
  lots: DepotLot[];
};

type DepotData = {
  id: number;
  name: string;
  location: string;
  products: DepotProduct[];
  subtotalStock: number;
  subtotalCost: number;
  subtotalSale: number;
};

export interface DepositsReportProps {
  businessName: string;
  logoUrl?: string | null;
  date: string;
  depots: DepotData[];
  grandTotals: {
    totalDepots: number;
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
  depotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e5e7eb',
    padding: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginTop: 10,
    marginBottom: 0
  },
  depotTitle: { fontSize: 11, fontWeight: 'bold' },
  depotLocation: { fontSize: 9, color: '#4b5563' },
  table: { width: '100%', borderLeftWidth: 1, borderTopWidth: 1, borderColor: '#d1d5db' },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 4,
    paddingHorizontal: 3,
    justifyContent: 'center'
  },
  headCell: { backgroundColor: '#f9fafb', fontWeight: 'bold' },
  colProduct: { width: '24%' },
  colCategory: { width: '12%' },
  colLot: { width: '8%', textAlign: 'center' },
  colQty: { width: '10%', textAlign: 'right' },
  colLotCost: { width: '12%', textAlign: 'right' },
  colExpiration: { width: '12%', textAlign: 'center' },
  colTotalCost: { width: '11%', textAlign: 'right' },
  colTotalSale: { width: '11%', textAlign: 'right' },
  productSku: { fontSize: 7, color: '#6b7280', marginTop: 1 },
  subtotal: { flexDirection: 'row', backgroundColor: '#fafafa' },
  subtotalLabel: { width: '24%', fontWeight: 'bold' },
  subtotalCell: { fontWeight: 'bold', textAlign: 'right' },
  grandTotalBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#e5e7eb'
  },
  grandTotalRow: { flexDirection: 'row' },
  grandTotalLabel: { width: '46%', fontWeight: 'bold' },
  grandTotalCell: { fontWeight: 'bold', textAlign: 'right' }
});

const money = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value || 0);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DepositsReportPDF = ({ businessName, logoUrl, date, depots, grandTotals }: DepositsReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image style={styles.logo} src={logoUrl || logoPath} />
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Reporte de Depósitos</Text>
            <Text style={styles.subtitle}>Desglose de inventario por depósito</Text>
            <Text style={styles.business}>{businessName}</Text>
          </View>
        </View>
        <View>
          <Text style={styles.meta}>Fecha: {date}</Text>
          <Text style={styles.meta}>Depósitos: {grandTotals.totalDepots}</Text>
        </View>
      </View>

      {depots.map((depot) => (
        <View key={depot.id} style={{ marginBottom: 10 }} wrap={false}>
          <View style={styles.depotHeader}>
            <View>
              <Text style={styles.depotTitle}>{depot.name}</Text>
              <Text style={styles.depotLocation}>{depot.location}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 9 }}>{depot.products.length} productos</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold' }}>Valor: {money(depot.subtotalSale)}</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.headCell, styles.colProduct]}>Producto</Text>
              <Text style={[styles.cell, styles.headCell, styles.colCategory]}>Categoría</Text>
              <Text style={[styles.cell, styles.headCell, styles.colLot]}>Lote</Text>
              <Text style={[styles.cell, styles.headCell, styles.colQty]}>Cantidad</Text>
              <Text style={[styles.cell, styles.headCell, styles.colLotCost]}>Costo Lote</Text>
              <Text style={[styles.cell, styles.headCell, styles.colExpiration]}>Vencimiento</Text>
              <Text style={[styles.cell, styles.headCell, styles.colTotalCost]}>Total Costo</Text>
              <Text style={[styles.cell, styles.headCell, styles.colTotalSale]}>Total Venta</Text>
            </View>

            {depot.products.map((product) =>
              product.lots.map((lot, li) => (
                <View style={styles.row} key={`${product.id}-${lot.id}`}>
                  {li === 0 ? (
                    <View style={[styles.cell, styles.colProduct]}>
                      <Text>{product.name}</Text>
                      <Text style={styles.productSku}>{product.sku}</Text>
                    </View>
                  ) : (
                    <View style={[styles.cell, styles.colProduct]}><Text></Text></View>
                  )}
                  {li === 0 ? (
                    <Text style={[styles.cell, styles.colCategory]}>{product.category}</Text>
                  ) : (
                    <Text style={[styles.cell, styles.colCategory]}></Text>
                  )}
                  <Text style={[styles.cell, styles.colLot]}>L{li + 1}</Text>
                  <Text style={[styles.cell, styles.colQty]}>{lot.quantity.toLocaleString('es-VE')} {product.unit}</Text>
                  <Text style={[styles.cell, styles.colLotCost]}>{money(lot.lotCost)}</Text>
                  <Text style={[styles.cell, styles.colExpiration]}>{formatDate(lot.expirationDate)}</Text>
                  <Text style={[styles.cell, styles.colTotalCost]}>{money(lot.totalCost)}</Text>
                  {li === 0 ? (
                    <Text style={[styles.cell, styles.colTotalSale]}>{money(product.totalSale)}</Text>
                  ) : (
                    <Text style={[styles.cell, styles.colTotalSale]}></Text>
                  )}
                </View>
              ))
            )}

            <View style={styles.subtotal}>
              <Text style={[styles.cell, styles.subtotalLabel]}>Subtotal {depot.name}</Text>
              <Text style={[styles.cell, styles.colCategory]}></Text>
              <Text style={[styles.cell, styles.colLot]}></Text>
              <Text style={[styles.cell, styles.colQty, styles.subtotalCell]}>{depot.subtotalStock.toLocaleString('es-VE')}</Text>
              <Text style={[styles.cell, styles.colLotCost]}></Text>
              <Text style={[styles.cell, styles.colExpiration]}></Text>
              <Text style={[styles.cell, styles.colTotalCost, styles.subtotalCell]}>{money(depot.subtotalCost)}</Text>
              <Text style={[styles.cell, styles.colTotalSale, styles.subtotalCell]}>{money(depot.subtotalSale)}</Text>
            </View>
          </View>
        </View>
      ))}

      <View style={styles.grandTotalBox}>
        <View style={styles.grandTotalRow}>
          <Text style={[styles.cell, styles.grandTotalLabel]}>TOTAL GENERAL</Text>
          <Text style={[styles.cell, styles.colQty, styles.grandTotalCell]}>{grandTotals.totalStock.toLocaleString('es-VE')}</Text>
          <Text style={[styles.cell, styles.colLotCost]}></Text>
          <Text style={[styles.cell, styles.colExpiration]}></Text>
          <Text style={[styles.cell, styles.colTotalCost, styles.grandTotalCell]}>{money(grandTotals.totalCost)}</Text>
          <Text style={[styles.cell, styles.colTotalSale, styles.grandTotalCell]}>{money(grandTotals.totalSale)}</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default DepositsReportPDF;
