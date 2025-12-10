import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Client } from "@/services/clientService";

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 24,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 4,
    fontSize: 8,
    textAlign: 'left',
  },
  // Column widths (must sum to 100%)
  colSr: { width: '5%' },
  colName: { width: '15%' },
  colSalesType: { width: '12%' },
  colDate: { width: '10%' },
  colPM: { width: '12%' },
  colPayment: { width: '10%' },
  colReceived: { width: '10%' },
  colPending: { width: '10%' },
  colCounsellor: { width: '10%' },
  colStatus: { width: '6%' },
});

interface ClientReportPDFProps {
  clients: Client[];
  filterDescription?: string;
}

export const ClientReportPDF = ({ clients, filterDescription }: ClientReportPDFProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Client Report</Text>
        <Text style={styles.subtitle}>
          Generated on {new Date().toLocaleDateString()} {filterDescription ? `| ${filterDescription}` : ''}
        </Text>
      </View>

      <View style={styles.table}>
        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.colSr]}>Sr No</Text>
          <Text style={[styles.tableCell, styles.colName]}>Name</Text>
          <Text style={[styles.tableCell, styles.colSalesType]}>Sales Type</Text>
          <Text style={[styles.tableCell, styles.colDate]}>Enroll. Date</Text>
          <Text style={[styles.tableCell, styles.colPM]}>Product Manager</Text>
          <Text style={[styles.tableCell, styles.colPayment]}>Total</Text>
          <Text style={[styles.tableCell, styles.colReceived]}>Received</Text>
          <Text style={[styles.tableCell, styles.colPending]}>Pending</Text>
          <Text style={[styles.tableCell, styles.colCounsellor]}>Counsellor</Text>
          <Text style={[styles.tableCell, styles.colStatus]}>Status</Text>
        </View>

        {/* Table Body */}
        {clients.map((client, index) => (
          <View key={client.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colSr]}>{index + 1}</Text>
            <Text style={[styles.tableCell, styles.colName]}>{client.name}</Text>
            <Text style={[styles.tableCell, styles.colSalesType]}>{client.salesType}</Text>
            <Text style={[styles.tableCell, styles.colDate]}>{client.enrollmentDate}</Text>
            <Text style={[styles.tableCell, styles.colPM]}>{client.productManager}</Text>
            <Text style={[styles.tableCell, styles.colPayment]}>{client.totalPayment.toLocaleString()}</Text>
            <Text style={[styles.tableCell, styles.colReceived]}>{client.amountReceived.toLocaleString()}</Text>
            <Text style={[styles.tableCell, styles.colPending]}>{client.amountPending.toLocaleString()}</Text>
            <Text style={[styles.tableCell, styles.colCounsellor]}>{client.counsellor}</Text>
            <Text style={[styles.tableCell, styles.colStatus]}>{client.status}</Text>
          </View>
        ))}
      </View>
      
      <Text style={{ fontSize: 8, color: '#999', marginTop: 10, textAlign: 'center' }}>
        Total Clients: {clients.length}
      </Text>
    </Page>
  </Document>
);
