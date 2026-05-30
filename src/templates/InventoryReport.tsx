import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Decimal } from '@prisma/client/runtime/client';
import path from 'path';

const logoPath = path.resolve(__dirname, '../assets/logo.png');

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#111827'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitleWrap: { flexDirection: 'column' },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
  logo: { width: 56, height: 56, marginRight: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 10, color: '#4b5563', marginTop: 2 },
  businessName: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  date: { fontSize: 9, color: '#4b5563' },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#e5e7eb',
    padding: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 0
  },
  table: { width: '100%', borderLeftWidth: 1, borderTopWidth: 1, borderColor: '#d1d5db' },
  tableRow: { flexDirection: 'row' },

  cellBase: {
    borderStyle: 'solid',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cellHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderRightWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 6
  },

  checkbox: { width: 18, height: 18, borderStyle: 'solid', borderWidth: 1.5, borderColor: '#d1d5db' },
  obsLine: { height: 18, borderBottomWidth: 1, borderBottomColor: '#ccc', marginTop: 4 }

});

interface CellProps {
  width: string;
  children?: React.ReactNode;
  isHeader?: boolean;
  align?: 'left' | 'center' | 'right';
}

const TableCell = ({ width, children, isHeader = false, align = 'center' }: CellProps) => (
  <View style={[isHeader ? styles.cellHeader : styles.cellBase, { width, alignItems: align === 'left' ? 'flex-start' : 'center' }]}>
    {typeof children === 'string' ? <Text>{children}</Text> : children}
  </View>
);

const COL_WIDTHS = { code: '14%', desc: '35%', stock: '10%', min: '8%', ok: '11%', missing: '11%', extra: '11%' };

interface InventoryReportProps {
  businessName: string;
  logoUrl?: string | null;
  date: string;
  productsWithStock: { id: number; name: string; sku: string | null | undefined; stock: Decimal; minStock: number; }[];
}

const InventoryReport = ({ businessName, logoUrl, date, productsWithStock }: InventoryReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>

      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Image style={styles.logo} src={logoUrl || logoPath} />
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Control de Stock</Text>
            <Text style={styles.subtitle}>Conteo Físico de Inventario</Text>
            <Text style={styles.businessName}>{businessName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.date}>Fecha: {date}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Productos a contar</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <TableCell width={COL_WIDTHS.code} isHeader>Código</TableCell>
          <TableCell width={COL_WIDTHS.desc} isHeader align="left">Producto</TableCell>
          <TableCell width={COL_WIDTHS.stock} isHeader>Stock</TableCell>
          <TableCell width={COL_WIDTHS.min} isHeader>Mín</TableCell>
          <TableCell width={COL_WIDTHS.ok} isHeader>OK</TableCell>
          <TableCell width={COL_WIDTHS.missing} isHeader>Faltan</TableCell>
          <TableCell width={COL_WIDTHS.extra} isHeader>Sobran</TableCell>
        </View>

        {productsWithStock.map((item) => (
          <View style={styles.tableRow} key={item.id}>
            <TableCell width={COL_WIDTHS.code}>{item.sku || '-'}</TableCell>
            <TableCell width={COL_WIDTHS.desc} align="left">{item.name}</TableCell>
            <TableCell width={COL_WIDTHS.stock}>{item.stock.toString()}</TableCell>
            <TableCell width={COL_WIDTHS.min}>{item.minStock ?? '-'}</TableCell>
            <TableCell width={COL_WIDTHS.ok}><View style={styles.checkbox} /></TableCell>
            <TableCell width={COL_WIDTHS.missing}><View /></TableCell>
            <TableCell width={COL_WIDTHS.extra}><View /></TableCell>
          </View>
        ))}
      </View>

    </Page>
  </Document>
);

export default InventoryReport;
