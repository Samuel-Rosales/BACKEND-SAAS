import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// 1. Definimos los estilos. Observa que es puro Flexbox.
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 16, fontWeight: 'bold' },
  // Estilos de la tabla
  table: { width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { margin: 'auto', flexDirection: 'row' },
  tableColHeader: { width: '20%', borderStyle: 'solid', borderBottomWidth: 1, borderRightWidth: 1, backgroundColor: '#d3d3d3', padding: 5 },
  tableColDescHeader: { width: '40%', borderStyle: 'solid', borderBottomWidth: 1, borderRightWidth: 1, backgroundColor: '#d3d3d3', padding: 5 },
  tableCol: { width: '20%', borderStyle: 'solid', borderBottomWidth: 1, borderRightWidth: 1, padding: 5 },
  tableColDesc: { width: '40%', borderStyle: 'solid', borderBottomWidth: 1, borderRightWidth: 1, padding: 5 },
  tableCellHeader: { margin: 'auto', fontWeight: 'bold' },
  tableCell: { margin: 'auto' }
});
interface InventoryReportProps {
  data: {
    code: string;
    description: string;
    stock: number;
  }[];
  date: string;
}

// 2. El componente recibe la data de Prisma como Props
const InventoryReport = ({ data: inventoryData, date }: InventoryReportProps) => (
  <Document>
    {/* size="A4" y orientation manejan el formato del papel estándar */}
    <Page size="A4" style={styles.page}>
      
      {/* Encabezado: Título y Fecha */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>ALVAREZ RAYSEB F.P</Text>
        <Text>{date}</Text>
      </View>

      {/* Tabla */}
      <View style={styles.table}>
        {/* Fila de Cabeceras */}
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Código</Text></View>
          <View style={styles.tableColDescHeader}><Text style={styles.tableCellHeader}>Descripción</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Stock</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>¿ok?</Text></View>
        </View>

        {/* Filas Dinámicas mapeadas desde la base de datos */}
        {inventoryData.map((item, index) => (
          <View style={styles.tableRow} key={index}>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{item.code}</Text></View>
            <View style={styles.tableColDesc}><Text style={styles.tableCell}>{item.description}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{item.stock}</Text></View>
            {/* Columnas vacías para rellenar a mano, como en tu imagen */}
            <View style={styles.tableCol}><Text style={styles.tableCell}> </Text></View>
          </View>
        ))}
      </View>

    </Page>
  </Document>
);

export default InventoryReport;