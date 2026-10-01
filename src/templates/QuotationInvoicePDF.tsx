import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

export interface QuotationInvoicePDFProps {
  businessName: string;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessLogo?: string | null;
  receiptNumber: number;
  createdAt: string;
  validUntil?: string | null;
  client: {
    name: string;
    ciOrRif?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  sellerName?: string;
  items: Array<{
    productName: string;
    presentationName?: string | null;
    quantity: number;
    unitPrice: number;
    subTotal: number;
  }>;
  subTotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  rate: number;
  notes?: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 12 },
  brand: { width: '55%' },
  businessName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', textTransform: 'uppercase' },
  businessDetails: { fontSize: 8, color: '#4b5563', marginTop: 3 },
  invoiceMeta: { width: '40%', alignItems: 'flex-end' },
  badge: { backgroundColor: '#dbeafe', color: '#1e40af', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4, fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  metaText: { fontSize: 8, color: '#374151', marginBottom: 2 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1e40af', marginBottom: 6, textTransform: 'uppercase' },
  clientBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 10, marginBottom: 16 },
  clientRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  clientLabel: { fontSize: 8, color: '#64748b' },
  clientValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  table: { marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingVertical: 6, paddingHorizontal: 8 },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 8 },
  td: { fontSize: 8, color: '#1e293b' },
  colDesc: { width: '45%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totalsBox: { width: '45%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 8, color: '#475569' },
  totalVal: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#cbd5e1' },
  grandTotalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1e40af' },
  grandTotalVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1e40af' },
  notesBox: { marginTop: 16, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, backgroundColor: '#fffbeb' },
  notesTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 2 },
  notesText: { fontSize: 8, color: '#78350f' },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, textAlign: 'center', fontSize: 7, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8 },
});

export const QuotationInvoicePDF: React.FC<QuotationInvoicePDFProps> = (props) => {
  const totalVes = props.totalAmount * props.rate;
  return (
    <Document title={`Cotizacion-${props.receiptNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.businessName}>{props.businessName}</Text>
            {props.businessAddress ? <Text style={styles.businessDetails}>{props.businessAddress}</Text> : null}
            {props.businessPhone ? <Text style={styles.businessDetails}>Tel: {props.businessPhone}</Text> : null}
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.badge}>PRESUPUESTO #{String(props.receiptNumber).padStart(4, '0')}</Text>
            <Text style={styles.metaText}>Fecha: {props.createdAt}</Text>
            {props.validUntil ? <Text style={styles.metaText}>Válida hasta: {props.validUntil}</Text> : null}
            {props.sellerName ? <Text style={styles.metaText}>Asesor: {props.sellerName}</Text> : null}
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.clientBox}>
          <Text style={styles.sectionTitle}>Datos del Cliente</Text>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Nombre / Razón Social:</Text>
            <Text style={styles.clientValue}>{props.client.name}</Text>
          </View>
          {props.client.ciOrRif ? (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Cédula / RIF:</Text>
              <Text style={styles.clientValue}>{props.client.ciOrRif}</Text>
            </View>
          ) : null}
          {props.client.phone ? (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Teléfono:</Text>
              <Text style={styles.clientValue}>{props.client.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Tabla de Artículos */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.th, styles.colQty]}>Cant.</Text>
            <Text style={[styles.th, styles.colPrice]}>Precio Unit. ($)</Text>
            <Text style={[styles.th, styles.colTotal]}>Subtotal ($)</Text>
          </View>
          {props.items.map((item, idx) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={[styles.td, styles.colDesc]}>
                {item.productName} {item.presentationName ? `(${item.presentationName})` : ''}
              </Text>
              <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.colPrice]}>${item.unitPrice.toFixed(2)}</Text>
              <Text style={[styles.td, styles.colTotal]}>${item.subTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalVal}>${props.subTotal.toFixed(2)}</Text>
            </View>
            {props.discount > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Descuento:</Text>
                <Text style={styles.totalVal}>-${props.discount.toFixed(2)}</Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA:</Text>
              <Text style={styles.totalVal}>${props.taxAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total USD:</Text>
              <Text style={styles.grandTotalVal}>${props.totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Bs. (Tasa {props.rate.toFixed(2)}):</Text>
              <Text style={styles.totalVal}>Bs. {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        {/* Notas */}
        {props.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Notas / Condiciones:</Text>
            <Text style={styles.notesText}>{props.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <Text style={styles.footer}>
          Documento proforma emitido por {props.businessName}. Precios sujetos a cambio según tasa oficial del día.
        </Text>
      </Page>
    </Document>
  );
};

export default QuotationInvoicePDF;
