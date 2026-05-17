import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Decimal } from '@prisma/client/runtime/client';

// 1. Estilos Base (Extremadamente limpios, sin repetición)
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: 'bold' },
  
  // Contenedor principal de la tabla
  table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { flexDirection: 'row' },
  
  // Estilo base para CUALQUIER celda
  cellBase: { 
    borderStyle: 'solid', 
    borderBottomWidth: 1, 
    borderRightWidth: 1, 
    padding: 5,
    justifyContent: 'center', // Centra verticalmente
    alignItems: 'center'      // Centra horizontalmente
  },
  // Modificador solo para las cabeceras
  cellHeader: { backgroundColor: '#d3d3d3', fontWeight: 'bold', borderBottomWidth: 1, borderRightWidth: 1, padding: 5 },
  
  // Estilo para el cuadrito de verificación (checkbox manual)
  checkbox: { width: 10, height: 10, borderStyle: 'solid', borderWidth: 1, borderColor: '#000' }
});

// ==========================================
// 2. SUBCOMPONENTES (El secreto de la eficiencia)
// ==========================================

// Interfaz para nuestras celdas reutilizables
interface CellProps {
  width: string;
  children?: React.ReactNode;
  isHeader?: boolean;
  align?: 'left' | 'center' | 'right'; // Para alinear descripciones a la izquierda y números al centro
}

const TableCell = ({ width, children, isHeader = false, align = 'center' }: CellProps) => (
  // USO DE ARREGLOS DE ESTILOS: Combinamos el base, el modificador (si es cabecera) y el ancho dinámico
  <View style={[isHeader ? styles.cellHeader : styles.cellBase, { width, alignItems: align === 'left' ? 'flex-start' : 'center' }]}>
    {typeof children === 'string' ? <Text>{children}</Text> : children}
  </View>
);

// Definimos los anchos como constantes para NUNCA equivocarnos y que siempre sumen 100%
const COL_WIDTHS = { code: '15%', desc: '45%', stock: '10%', ok: '10%', missing: '10%', extra: '10%' };

// ==========================================
// 3. COMPONENTE PRINCIPAL
// ==========================================

interface InventoryReportProps {
  businessName: string;
  date: string;
  productsWithStock: { id: number; name: string; sku: string | null | undefined; stock: Decimal; }[];
}

const InventoryReport = ({ businessName, date, productsWithStock }: InventoryReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{businessName}</Text>
        <Text>{date}</Text>
      </View>

      <View style={styles.table}>
        {/* Fila de Cabeceras super limpia */}
        <View style={styles.tableRow}>
          <TableCell width={COL_WIDTHS.code} isHeader>Código</TableCell>
          <TableCell width={COL_WIDTHS.desc} isHeader align="left">Descripción</TableCell>
          <TableCell width={COL_WIDTHS.stock} isHeader>Stock</TableCell>
          <TableCell width={COL_WIDTHS.ok} isHeader>¿ok?</TableCell>
          <TableCell width={COL_WIDTHS.missing} isHeader>Faltan</TableCell>
          <TableCell width={COL_WIDTHS.extra} isHeader>Sobran</TableCell>
        </View>

        {/* Filas Dinámicas mapeadas */}
        {productsWithStock.map((item) => (
          <View style={styles.tableRow} key={item.id}>
            <TableCell width={COL_WIDTHS.code}>{item.sku || '-'}</TableCell>
            <TableCell width={COL_WIDTHS.desc} align="left">{item.name}</TableCell>
            <TableCell width={COL_WIDTHS.stock}>{item.stock.toString()}</TableCell>
            
            {/* Dibujamos el cuadrito en lugar de texto vacío */}
            <TableCell width={COL_WIDTHS.ok}>
                <View style={styles.checkbox} />
            </TableCell>
            
            <TableCell width={COL_WIDTHS.missing}>{/* Vacío intencionalmente */}</TableCell>
            <TableCell width={COL_WIDTHS.extra}>{/* Vacío intencionalmente */}</TableCell>
          </View>
        ))}
      </View>

    </Page>
  </Document>
);

export default InventoryReport;