import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Client } from "@/services/clientService";

// Register fonts if needed (using default Helvetica for now for better compatibility)
// Font.register({ family: 'Inter', src: 'path/to/font' });

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c', // Primary orange color
    paddingBottom: 10,
  },
  logoSection: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ea580c', // Primary orange color
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 4,
  },
  metaInfo: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 2,
  },
  filterBadge: {
    backgroundColor: '#fff7ed',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  filterText: {
    fontSize: 8,
    color: '#ea580c',
  },
  table: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    height: 30,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
    height: 28,
  },
  tableRowAlternating: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    paddingHorizontal: 6,
    fontSize: 8,
    textAlign: 'left',
  },
  // Specific column styles
  headerCell: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 8,
  },
  // Status badges in PDF
  statusBadge: {
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7,
    textAlign: 'center',
  },
  statusActive: { backgroundColor: '#dcfce7', color: '#166534' },
  statusPending: { backgroundColor: '#fef9c3', color: '#854d0e' },
  statusCompleted: { backgroundColor: '#f3f4f6', color: '#374151' },

  // Money text
  moneyText: {
    fontFamily: 'Helvetica-Bold',
  },
  textGreen: { color: '#16a34a' },
  textRed: { color: '#dc2626' },
  textMuted: { color: '#9ca3af' },

  // Column widths (must sum to 100%)
  colSr: { width: '4%' },
  colName: { width: '14%' },
  colSalesType: { width: '12%' },
  colDate: { width: '10%' },
  colPM: { width: '11%' },
  colPayment: { width: '10%' },
  colReceived: { width: '10%' },
  colPending: { width: '10%' },
  colCounsellor: { width: '11%' },
  colStatus: { width: '8%' },

  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
});

interface ClientReportPDFProps {
  clients: Client[];
  filterDescription?: string;
}

const TableHeader = () => (
  <View style={styles.tableHeader}>
    <Text style={[styles.tableCell, styles.colSr, styles.headerCell]}>#</Text>
    <Text style={[styles.tableCell, styles.colName, styles.headerCell]}>Client Name</Text>
    <Text style={[styles.tableCell, styles.colSalesType, styles.headerCell]}>Sales Type</Text>
    <Text style={[styles.tableCell, styles.colDate, styles.headerCell]}>Enrollment</Text>
    <Text style={[styles.tableCell, styles.colPM, styles.headerCell]}>Product Mgr.</Text>
    <Text style={[styles.tableCell, styles.colPayment, styles.headerCell]}>Total Amt.</Text>
    <Text style={[styles.tableCell, styles.colReceived, styles.headerCell]}>Received</Text>
    <Text style={[styles.tableCell, styles.colPending, styles.headerCell]}>Pending</Text>
    <Text style={[styles.tableCell, styles.colCounsellor, styles.headerCell]}>Counsellor</Text>
    <Text style={[styles.tableCell, styles.colStatus, styles.headerCell]}>Status</Text>
  </View>
);

const StatusBadge = ({ status }: { status: string }) => {
  let badgeStyle = styles.statusCompleted;
  if (status === 'Active') badgeStyle = styles.statusActive;
  if (status === 'Pending') badgeStyle = styles.statusPending;

  return (
    <View style={[styles.tableCell, styles.colStatus]}>
      <View style={[styles.statusBadge, badgeStyle]}>
        <Text>{status}</Text>
      </View>
    </View>
  );
};

export const ClientReportPDF = ({ clients, filterDescription }: ClientReportPDFProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.logoSection}>
          <Text style={styles.companyName}>Pratham International</Text>
          <Text style={styles.reportTitle}>Client Master Report</Text>
        </View>
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>Generated: {new Date().toLocaleString()}</Text>
          <Text style={styles.metaText}>Total Records: {clients.length}</Text>
          {filterDescription && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterText}>Filters: {filterDescription}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <TableHeader />
        {clients.map((client, index) => (
          <View key={client.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlternating : {}]}>
            <Text style={[styles.tableCell, styles.colSr, { color: '#64748b' }]}>{index + 1}</Text>
            <Text style={[styles.tableCell, styles.colName, { fontFamily: 'Helvetica-Bold' }]}>{client.name}</Text>
            <Text style={[styles.tableCell, styles.colSalesType]}>{client.salesType}</Text>
            <Text style={[styles.tableCell, styles.colDate]}>{client.enrollmentDate}</Text>
            <Text style={[styles.tableCell, styles.colPM]}>{client.productManager}</Text>
            <Text style={[styles.tableCell, styles.colPayment]}>₹{client.totalPayment.toLocaleString()}</Text>

            <Text style={[styles.tableCell, styles.colReceived, styles.moneyText, styles.textGreen]}>
              ₹{client.amountReceived.toLocaleString()}
            </Text>

            <Text style={[
              styles.tableCell,
              styles.colPending,
              styles.moneyText,
              client.amountPending > 0 ? styles.textRed : styles.textMuted
            ]}>
              ₹{client.amountPending.toLocaleString()}
            </Text>

            <Text style={[styles.tableCell, styles.colCounsellor]}>{client.counsellor}</Text>
            <StatusBadge status={client.status} />
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Confidential Report - For Internal Use Only</Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </View>
    </Page>
  </Document>
);
