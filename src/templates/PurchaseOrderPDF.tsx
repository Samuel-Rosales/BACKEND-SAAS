import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

export interface PurchaseOrderPDFProps {
  businessName: string;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessLogo?: string | null;
  businessDocument?: string | null;
  orderNumber: number;
  createdAt: string;
  expectedDeliveryDate?: string | null;
  supplier: {
    nameCompany: string;
    contactName?: string | null;
    rifOrCi?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  depotName?: string | null;
  buyerName?: string;
  items: Array<{
    productName: string;
    presentationName?: string | null;
    quantity: number;
    unitCost: number;
    subTotal: number;
  }>;
  subTotal: number;
  taxAmount: number;
  totalCost: number;
  rate: number;
  notes?: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 12 },
  brand: { width: '55%' },
  businessName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', textTransform: 'uppercase' },
  businessDetails: { fontSize: 8, color: '#4b5563', marginTop: 3 },
  invoiceMeta: { width: '40%', alignItems: 'flex-end' },
  badge: { backgroundColor: '#dbeafe', color: '#1e40af', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4, fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  metaText: { fontSize: 8, color: '#374151', marginBottom: 2 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1e40af', marginBottom: 6, textTransform: 'uppercase' },
  
  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
  infoBox: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  infoLabel: { fontSize: 8, color: '#64748b' },
  infoValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e293b' },

  table: { marginTop: 4, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingVertical: 6, paddingHorizontal: 8 },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 8 },
  td: { fontSize: 8, color: '#1e293b' },
  colDesc: { width: '45%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },

  totalsSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  notesBox: { width: '50%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 8 },
  notesTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155', marginBottom: 3 },
  notesText: { fontSize: 8, color: '#4b5563', lineHeight: 1.3 },
  totalsBox: { width: '45%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 8, color: '#4b5563' },
  totalValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  finalTotal: { borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 4, marginTop: 4 },
  finalTotalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e3a8a' },
  finalTotalValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1e3a8a' },
  vesAmount: { fontSize: 8, color: '#059669', fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 3 },

  footer: { position: 'absolute', bottom: 25, left: 32, right: 32, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 7, color: '#94a3b8' },
  signatures: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 20 },
  signBox: { width: '40%', borderTopWidth: 1, borderTopColor: '#94a3b8', alignItems: 'center', paddingTop: 4 },
  signText: { fontSize: 7, color: '#64748b' }
});

export const PurchaseOrderPDF: React.FC<PurchaseOrderPDFProps> = (props) => {
  const {
    businessName,
    businessAddress,
    businessPhone,
    businessLogo,
    businessDocument,
    orderNumber,
    createdAt,
    expectedDeliveryDate,
    supplier,
    depotName,
    buyerName,
    items,
    subTotal,
    taxAmount,
    totalCost,
    rate,
    notes,
  } = props;

  const fmtUsd = (val: number) => `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtBs = (val: number) => `${Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`;

  const totalVes = Number(totalCost || 0) * Number(rate || 1);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <View style={styles.brand}>
            {businessLogo ? (
              <Image src={businessLogo} style={{ width: 60, height: 40, objectFit: 'contain', marginBottom: 4 }} />
            ) : null}
            <Text style={styles.businessName}>{businessName}</Text>
            {businessDocument ? <Text style={styles.businessDetails}>RIF / Doc: {businessDocument}</Text> : null}
            {businessAddress ? <Text style={styles.businessDetails}>{businessAddress}</Text> : null}
            {businessPhone ? <Text style={styles.businessDetails}>Tel: {businessPhone}</Text> : null}
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.badge}>ORDEN DE COMPRA</Text>
            <Text style={[styles.metaText, { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#1e3a8a' }]}>
              N° OC-{String(orderNumber).padStart(4, '0')}
            </Text>
            <Text style={styles.metaText}>Fecha de Emisión: {createdAt}</Text>
            {expectedDeliveryDate ? (
              <Text style={styles.metaText}>Fecha Entrega Estimada: {expectedDeliveryDate}</Text>
            ) : null}
            <Text style={styles.metaText}>Tasa Ref: {fmtBs(rate)} / USD</Text>
          </View>
        </View>

        {/* DATOS DE PROVEEDOR Y ALMACÉN DESTINO */}
        <View style={styles.infoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.sectionTitle}>Proveedor Solicitado</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Razón Social:</Text>
              <Text style={styles.infoValue}>{supplier.nameCompany}</Text>
            </View>
            {supplier.rifOrCi ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>RIF / Cédula:</Text>
                <Text style={styles.infoValue}>{supplier.rifOrCi}</Text>
              </View>
            ) : null}
            {supplier.contactName ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contacto:</Text>
                <Text style={styles.infoValue}>{supplier.contactName}</Text>
              </View>
            ) : null}
            {supplier.phone ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Teléfono:</Text>
                <Text style={styles.infoValue}>{supplier.phone}</Text>
              </View>
            ) : null}
            {supplier.address ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dirección:</Text>
                <Text style={styles.infoValue}>{supplier.address}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.sectionTitle}>Destino y Autorización</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Almacén Destino:</Text>
              <Text style={styles.infoValue}>{depotName || 'Depósito Principal'}</Text>
            </View>
            {buyerName ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Emitido Por:</Text>
                <Text style={styles.infoValue}>{buyerName}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Condición:</Text>
              <Text style={styles.infoValue}>Sujeto a Recepción y Verificación</Text>
            </View>
          </View>
        </View>

        {/* TABLA DE PRODUCTOS SOLICITADOS */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>DESCRIPCIÓN DEL ARTÍCULO</Text>
            <Text style={[styles.th, styles.colQty]}>CANTIDAD</Text>
            <Text style={[styles.th, styles.colPrice]}>COSTO REF. (USD)</Text>
            <Text style={[styles.th, styles.colTotal]}>SUBTOTAL (USD)</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.td, styles.colDesc]}>
                {item.productName}
                {item.presentationName ? ` (${item.presentationName})` : ''}
              </Text>
              <Text style={[styles.td, styles.colQty]}>{Number(item.quantity).toLocaleString('es-VE')}</Text>
              <Text style={[styles.td, styles.colPrice]}>{fmtUsd(item.unitCost)}</Text>
              <Text style={[styles.td, styles.colTotal]}>{fmtUsd(item.subTotal)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALES Y OBSERVACIONES */}
        <View style={styles.totalsSection}>
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Instrucciones y Observaciones:</Text>
            <Text style={styles.notesText}>
              {notes || 'Favor despachar la mercancía según las cantidades y especificaciones indicadas. Todo ingreso queda sujeto a conteo y verificación de calidad física en el almacén de destino antes de emitir la conformidad de compra.'}
            </Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal Estimado:</Text>
              <Text style={styles.totalValue}>{fmtUsd(subTotal)}</Text>
            </View>
            {Number(taxAmount) > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Impuestos / IVA:</Text>
                <Text style={styles.totalValue}>{fmtUsd(taxAmount)}</Text>
              </View>
            ) : null}
            <View style={[styles.totalRow, styles.finalTotal]}>
              <Text style={styles.finalTotalLabel}>TOTAL ESTIMADO:</Text>
              <Text style={styles.finalTotalValue}>{fmtUsd(totalCost)}</Text>
            </View>
            <Text style={styles.vesAmount}>Equivalente Ref.: {fmtBs(totalVes)}</Text>
          </View>
        </View>

        {/* FIRMAS DE CONFORMIDAD */}
        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text style={styles.signText}>Emitido y Autorizado por el Negocio</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signText}>Conforme Proveedor / Despachador</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Documento generado por Guardián ERP - Plataforma de Gestión Comercial</Text>
          <Text style={styles.footerText}>Página 1 de 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PurchaseOrderPDF;
