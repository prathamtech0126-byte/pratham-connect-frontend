import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Client } from "@/services/clientService";
import { extractProductData } from "@/utils/pdfExport";

interface ClientWithDetails extends Client {
  payments?: any[];
  productPayments?: any[];
  rawClient?: any;
  saleType?: {
    saleTypeId?: number;
    saleType?: string;
    amount?: string;
    isCoreProduct?: boolean;
  };
}

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 15,
    fontSize: 6,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
    paddingBottom: 8,
  },
  logoSection: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ea580c',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 2,
  },
  metaInfo: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 6,
    color: '#666666',
    marginBottom: 1,
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    minHeight: 20,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
    minHeight: 18,
  },
  tableRowAlternating: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    paddingHorizontal: 2,
    fontSize: 5,
    textAlign: 'left',
    overflow: 'hidden',
  },
  headerCell: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 5,
  },
  moneyText: {
    fontFamily: 'Helvetica-Bold',
  },
  textGreen: { color: '#16a34a' },
  textRed: { color: '#dc2626' },
  textMuted: { color: '#9ca3af' },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 5,
  },
  footerText: {
    fontSize: 5,
    color: '#94a3b8',
  },
  // Column widths - very small to fit all columns
  colSr: { width: '1.5%' },
  colName: { width: '4%' },
  colEnrollment: { width: '2.5%' },
  colTotalPayment: { width: '2.5%' },
  colAmountReceived: { width: '2.5%' },
  colAmountPending: { width: '2.5%' },
  colCoreSales: { width: '1.5%' },
  colSalesType: { width: '3%' },
  colCounsellor: { width: '3%' },
  colProduct: { width: '2.5%' }, // For all product columns
  colStage: { width: '2%' },
});

interface ClientDetailsPDFProps {
  clients: ClientWithDetails[];
}

const TableHeader = () => (
  <View style={styles.tableHeader}>
    <Text style={[styles.tableCell, styles.colSr, styles.headerCell]}>#</Text>
    <Text style={[styles.tableCell, styles.colName, styles.headerCell]}>Name</Text>
    <Text style={[styles.tableCell, styles.colEnrollment, styles.headerCell]}>Enroll Date</Text>
    <Text style={[styles.tableCell, styles.colTotalPayment, styles.headerCell]}>Total</Text>
    <Text style={[styles.tableCell, styles.colAmountReceived, styles.headerCell]}>Received</Text>
    <Text style={[styles.tableCell, styles.colAmountPending, styles.headerCell]}>Pending</Text>
    <Text style={[styles.tableCell, styles.colCoreSales, styles.headerCell]}>Core</Text>
    <Text style={[styles.tableCell, styles.colSalesType, styles.headerCell]}>Sales Type</Text>
    <Text style={[styles.tableCell, styles.colCounsellor, styles.headerCell]}>Counsellor</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Fin & Emp</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Fin Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>India Emp</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>India Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>IELTS</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>IELTS Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Loan</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Loan Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Lawyer</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Lawyer Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Part-time</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Part Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>NOC</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>NOC Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>TRV</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>TRV Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Marriage</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Marriage Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Marriage Cert</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Insurance</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Ins Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Air Ticket</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Ticket Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Rel Affidavit</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Affidavit Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>SIM Plan</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>SIM Card</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Beacon</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>CAD</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Judicial</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Judicial Date</Text>
    <Text style={[styles.tableCell, styles.colProduct, styles.headerCell]}>Stage</Text>
  </View>
);

const formatAmount = (amount: number | string | undefined): string => {
  if (!amount || amount === 0 || amount === '') return '';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '';
  return `₹${numAmount.toLocaleString()}`;
};

const formatDate = (date: string | undefined): string => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return date;
  }
};

export const ClientDetailsPDF = ({ clients }: ClientDetailsPDFProps) => {
  // Prepare client data with product information
  const clientData = clients.map((client, index) => {
    const productData = extractProductData(client.productPayments);
    const saleType = client.saleType || (client as any).saleType;
    const isCoreProduct = saleType?.isCoreProduct ?? true;

    // Handle counsellor - can be object or string
    const counsellorObj = client.counsellor as any;
    const counsellorName = (typeof counsellorObj === 'object' && counsellorObj?.name)
      ? counsellorObj.name
      : (typeof client.counsellor === 'string' ? client.counsellor : "N/A");

    const totalCad = productData.beaconAccount?.amount || 0;

    return {
      index: index + 1,
      name: client.name || "N/A",
      enrollmentDate: client.enrollmentDate || "N/A",
      totalPayment: client.totalPayment || 0,
      amountReceived: client.amountReceived || 0,
      amountPending: client.amountPending || 0,
      coreSales: isCoreProduct ? "Yes" : "No",
      salesType: client.salesType || "N/A",
      counsellor: counsellorName,
      financeAndEmployment: formatAmount(productData.financeAndEmployment?.amount),
      financeAndEmploymentDate: formatDate(productData.financeAndEmployment?.date),
      indianSideEmployment: formatAmount(productData.indianSideEmployment?.amount),
      indianSideEmploymentDate: formatDate(productData.indianSideEmployment?.date),
      ieltsEnrollment: formatAmount(productData.ieltsEnrollment?.amount),
      ieltsDate: formatDate(productData.ieltsEnrollment?.date),
      loan: formatAmount(productData.loan?.amount),
      loanDate: formatDate(productData.loan?.date),
      lawyerCharges: formatAmount(productData.lawyerRefusal?.amount),
      lawyerDate: formatDate(productData.lawyerRefusal?.date),
      partTime: formatAmount(productData.partTimeEmployment?.amount),
      partTimeDate: formatDate(productData.partTimeEmployment?.date),
      noc: formatAmount(productData.nocArrangement?.amount),
      nocDate: formatDate(productData.nocArrangement?.date),
      trv: formatAmount(productData.trvExtension?.amount),
      trvDate: formatDate(productData.trvExtension?.date),
      marriage: formatAmount(productData.marriagePhoto?.amount),
      marriageDate: formatDate(productData.marriagePhoto?.date),
      marriageCert: formatAmount(productData.marriageCert?.amount),
      insurance: formatAmount(productData.insurance?.amount),
      insuranceDate: formatDate(productData.insurance?.date),
      airTicket: formatAmount(productData.airTicket?.amount),
      airTicketDate: formatDate(productData.airTicket?.date),
      relationshipAffidavit: formatAmount(productData.relationshipAffidavit?.amount),
      affidavitDate: formatDate(productData.relationshipAffidavit?.date),
      simPlan: typeof productData.simPlan?.amount === 'string' ? productData.simPlan.amount : '',
      simCard: productData.simCard?.date ? "Yes" : "",
      beacon: formatAmount(productData.beaconAccount?.amount),
      cad: totalCad ? `CAD ${Number(totalCad).toLocaleString()}` : "",
      judicial: formatAmount(productData.judicialReview?.amount),
      judicialDate: formatDate(productData.judicialReview?.date),
      stage: client.stage || "N/A",
    };
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>Pratham International</Text>
            <Text style={styles.reportTitle}>Client Details Report</Text>
          </View>
          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>Generated: {new Date().toLocaleString()}</Text>
            <Text style={styles.metaText}>Total Records: {clients.length}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <TableHeader />
          {clientData.map((data, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlternating : {}]}>
              <Text style={[styles.tableCell, styles.colSr]}>{data.index}</Text>
              <Text style={[styles.tableCell, styles.colName, { fontFamily: 'Helvetica-Bold' }]}>{data.name}</Text>
              <Text style={[styles.tableCell, styles.colEnrollment]}>{data.enrollmentDate}</Text>
              <Text style={[styles.tableCell, styles.colTotalPayment]}>{formatAmount(data.totalPayment)}</Text>
              <Text style={[styles.tableCell, styles.colAmountReceived, styles.moneyText, styles.textGreen]}>
                {formatAmount(data.amountReceived)}
              </Text>
              <Text style={[styles.tableCell, styles.colAmountPending, styles.moneyText, data.amountPending > 0 ? styles.textRed : styles.textMuted]}>
                {formatAmount(data.amountPending)}
              </Text>
              <Text style={[styles.tableCell, styles.colCoreSales]}>{data.coreSales}</Text>
              <Text style={[styles.tableCell, styles.colSalesType]}>{data.salesType}</Text>
              <Text style={[styles.tableCell, styles.colCounsellor]}>{data.counsellor}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.financeAndEmployment}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.financeAndEmploymentDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.indianSideEmployment}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.indianSideEmploymentDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.ieltsEnrollment}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.ieltsDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.loan}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.loanDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.lawyerCharges}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.lawyerDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.partTime}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.partTimeDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.noc}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.nocDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.trv}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.trvDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.marriage}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.marriageDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.marriageCert}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.insurance}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.insuranceDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.airTicket}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.airTicketDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.relationshipAffidavit}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.affidavitDate}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.simPlan}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.simCard}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.beacon}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.cad}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.judicial}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{data.judicialDate}</Text>
              <Text style={[styles.tableCell, styles.colStage]}>{data.stage}</Text>
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
};
