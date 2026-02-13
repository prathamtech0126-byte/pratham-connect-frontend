import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Client } from "@/services/clientService";

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

/**
 * Helper function to extract product data from productPayments array
 * Now includes invoiceNo and remarks for each product
 */
const extractProductData = (productPayments: any[] = []) => {
  const productMap: Record<string, { amount: string | number; date: string; invoiceNo: string; remarks: string; serviceName?: string }> = {};

  if (!productPayments || productPayments.length === 0) {
    return productMap;
  }

  productPayments.forEach((product: any) => {
    // Support both camelCase and snake_case (API may use either)
    const productName = (product.productName ?? product.product_name ?? '').toString().trim();
    if (!productName) return;

    const entity = product.entity;
    const entityType = product.entityType ?? product.entity_type;
    const invoiceNo = product.invoiceNo ?? product.invoice_no ?? '';
    const remarks = product.remarks ?? '';

    // Handle IELTS_ENROLLMENT first (can be either master_only or entity-based)
    if (productName === 'IELTS_ENROLLMENT') {
      if (entity && typeof entity === 'object') {
        // Entity-based IELTS (has entity - check for ielts_id type or any entity with amount/enrollmentDate)
        productMap['ieltsEnrollment'] = {
          amount: entity.amount ? Number(entity.amount) : (product.amount ? Number(product.amount) : 0),
          date: entity.enrollmentDate || product.paymentDate || product.enrollmentDate || '',
          invoiceNo: invoiceNo || product.invoiceNo || '',
          remarks: remarks || entity.remarks || product.remarks || ''
        };
      } else if (entityType === 'master_only' || product.amount || product.paymentDate) {
        // Master-only IELTS (amount/date in productPayment)
        const amount = product.amount ? Number(product.amount) : 0;
        const date = product.paymentDate || product.enrollmentDate || '';
        productMap['ieltsEnrollment'] = { amount, date, invoiceNo, remarks };
      }
      return; // Skip to next product
    }

    // Handle master_only products: amount/date in productPayment.
    // Also accept when entityType is missing but product has amount/paymentDate (API may not send entityType).
    const paymentDate = product.paymentDate ?? product.payment_date;
    const isMasterOnlyStyle =
      entityType === 'master_only' ||
      (!entity && (product.amount != null || paymentDate != null));

    if (isMasterOnlyStyle) {
      const amount = product.amount != null ? Number(product.amount) : 0;
      const date = paymentDate || product.enrollmentDate || product.enrollment_date || '';

      switch (productName) {
        case 'ALL_FINANCE_EMPLOYEMENT':
        case 'ALL_FINANCE_EMPLOYMENT': // alternate spelling
          productMap['financeAndEmployment'] = { amount, date, invoiceNo, remarks };
          break;
        case 'INDIAN_SIDE_EMPLOYEMENT':
        case 'INDIAN_SIDE_EMPLOYMENT': // alternate spelling
          productMap['indianSideEmployment'] = { amount, date, invoiceNo, remarks };
          break;
        // IELTS_ENROLLMENT is handled above, skip here
        case 'LOAN_DETAILS':
          productMap['loan'] = {
            amount,
            date: product.disbursementDate ?? product.disbursement_date ?? date,
            invoiceNo,
            remarks
          };
          break;
        case 'LAWYER_REFUSAL_CHARGE':
          productMap['lawyerRefusal'] = { amount, date, invoiceNo, remarks };
          break;
        case 'ONSHORE_PART_TIME_EMPLOYEMENT':
          productMap['partTimeEmployment'] = { amount, date, invoiceNo, remarks };
          break;
        case 'NOC_LEVEL_JOB_ARRANGEMENT':
          productMap['nocArrangement'] = { amount, date, invoiceNo, remarks };
          break;
        case 'TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION':
          productMap['trvExtension'] = { amount, date, invoiceNo, remarks };
          break;
        case 'MARRIAGE_PHOTO_FOR_COURT_MARRIAGE':
          productMap['marriagePhoto'] = { amount, date, invoiceNo, remarks };
          break;
        case 'MARRIAGE_PHOTO_CERTIFICATE':
          productMap['marriageCert'] = { amount, date, invoiceNo, remarks };
          break;
        case 'RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT':
          productMap['relationshipAffidavit'] = { amount, date, invoiceNo, remarks };
          break;
        case 'JUDICAL_REVIEW_CHARGE':
          productMap['judicialReview'] = { amount, date, invoiceNo, remarks };
          break;
        case 'SPONSOR_CHARGES':
          productMap['sponsorCharges'] = { amount, date, invoiceNo, remarks };
          break;
        case 'REFUSAL_CHARGES':
          productMap['refusalCharges'] = { amount, date, invoiceNo, remarks };
          break;
        case 'KIDS_STUDY_PERMIT':
          productMap['kidsStudyPermit'] = { amount, date, invoiceNo, remarks };
          break;
        case 'CANADA_FUND':
          productMap['canadaFund'] = { amount, date, invoiceNo, remarks };
          break;
        case 'EMPLOYMENT_VERIFICATION_CHARGES':
          productMap['employmentVerificationCharges'] = { amount, date, invoiceNo, remarks };
          break;
        case 'ADDITIONAL_AMOUNT_STATEMENT_CHARGES':
          productMap['additionalAmountStatementCharges'] = { amount, date, invoiceNo, remarks };
          break;
      }
    }
    // Handle entity-based products (API sends entityType e.g. allFinance_id, visaextension_id, newSell_id, ielts_id)
    else if (entity && typeof entity === 'object') {
      // ALL_FINANCE_EMPLOYEMENT with entity (entityType: allFinance_id) – amount/date in entity
      if (productName === 'ALL_FINANCE_EMPLOYEMENT' || productName === 'ALL_FINANCE_EMPLOYMENT') {
        productMap['financeAndEmployment'] = {
          amount: entity.amount != null ? Number(entity.amount) : 0,
          date: entity.paymentDate ?? entity.payment_date ?? '',
          invoiceNo: invoiceNo || entity.invoiceNo || entity.invoice_no || '',
          remarks: remarks || entity.remarks || ''
        };
        return;
      }
      // TRV with entity (entityType: visaextension_id) – amount/extensionDate in entity
      if (productName === 'TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION') {
        productMap['trvExtension'] = {
          amount: entity.amount != null ? Number(entity.amount) : 0,
          date: entity.extensionDate ?? entity.extension_date ?? '',
          invoiceNo: invoiceNo || entity.invoiceNo || entity.invoice_no || '',
          remarks: remarks || entity.remarks || ''
        };
        return;
      }
      // OTHER_NEW_SELL with entity (entityType: newSell_id) – serviceName, amount, sellDate in entity
      if (productName === 'OTHER_NEW_SELL') {
        productMap['otherProduct'] = {
          amount: entity.amount != null ? Number(entity.amount) : 0,
          date: entity.sellDate ?? entity.sell_date ?? '',
          invoiceNo: invoiceNo || entity.invoiceNo || entity.invoice_no || '',
          remarks: remarks || entity.remarks || '',
          serviceName: entity.serviceName ?? entity.service_name ?? ''
        };
        return;
      }

      switch (productName) {
        // IELTS_ENROLLMENT is handled above, skip here
        case 'INSURANCE':
          productMap['insurance'] = {
            amount: entity.amount ? Number(entity.amount) : 0,
            date: entity.insuranceDate || '',
            invoiceNo,
            remarks: remarks || entity.remarks || ''
          };
          break;
        case 'AIR_TICKET':
          productMap['airTicket'] = {
            amount: entity.amount ? Number(entity.amount) : 0,
            date: entity.ticketDate || '',
            invoiceNo,
            remarks: remarks || entity.remarks || ''
          };
          break;
        case 'BEACON_ACCOUNT':
          productMap['beaconAccount'] = {
            amount: entity.amount ? Number(entity.amount) : 0,
            date: entity.fundingDate || entity.openingDate || '',
            invoiceNo,
            remarks: remarks || entity.remarks || ''
          };
          break;
        case 'SIM_CARD_ACTIVATION':
          productMap['simCard'] = {
            amount: 0, // SIM doesn't have amount
            date: entity.simActivationDate || entity.simCardGivingDate || '',
            invoiceNo,
            remarks: remarks || entity.remarks || ''
          };
          productMap['simPlan'] = {
            amount: entity.simcardPlan || '',
            date: '',
            invoiceNo: '',
            remarks: ''
          };
          break;
      }
    }
  });

  return productMap;
};

/**
 * Helper function to extract consultancy payment data (Initial, Before Visa, After Visa)
 */
const extractPaymentData = (payments: any[] = []) => {
  const paymentData: {
    initial?: { amount: number; date: string; invoiceNo: string; remarks: string };
    beforeVisa?: { amount: number; date: string; invoiceNo: string; remarks: string };
    afterVisa?: { amount: number; date: string; invoiceNo: string; remarks: string };
  } = {};

  payments.forEach((payment: any) => {
    const stage = payment.stage;
    const data = {
      amount: Number(payment.amount || 0),
      date: payment.paymentDate || '',
      invoiceNo: payment.invoiceNo || '',
      remarks: payment.remarks || ''
    };

    if (stage === 'INITIAL') {
      paymentData.initial = data;
    } else if (stage === 'BEFORE_VISA') {
      paymentData.beforeVisa = data;
    } else if (stage === 'AFTER_VISA') {
      paymentData.afterVisa = data;
    }
  });

  return paymentData;
};

/**
 * Export clients data to Excel with single flat sheet matching original structure
 * @param clients - Array of clients with full details including payments and productPayments
 * @param fileName - Optional custom file name (default: clients-report-YYYY-MM-DD.xlsx)
 */
export const exportClientsToExcel = (
  clients: ClientWithDetails[],
  fileName?: string
): void => {
  if (!clients || clients.length === 0) {
    throw new Error("No clients to export");
  }

  // Check if XLSX is available
  if (!XLSX || !XLSX.utils || !XLSX.write) {
    throw new Error("Excel export library not loaded");
  }

  // Prepare flat client data matching original Excel structure
  const flatClientData = clients.map((client, index) => {
    // Get productPayments and payments from multiple possible sources
    const productPayments = client.productPayments ||
                           client.rawClient?.productPayments ||
                           (client as any).productPayments ||
                           [];
    const payments = client.payments ||
                    client.rawClient?.payments ||
                    (client as any).payments ||
                    [];

    const productData = extractProductData(productPayments);
    const paymentData = extractPaymentData(payments);

    // Get name from multiple sources (backend uses fullName) - needed for debug logging
    const clientName = client.name || client.rawClient?.fullName || "N/A";

    // Debug: Log IELTS products for troubleshooting
    console.log(`[Excel Export] Processing client: ${clientName}`, {
      hasProductPayments: !!productPayments,
      productPaymentsLength: productPayments?.length || 0,
      productPayments: productPayments,
      hasRawClient: !!client.rawClient,
      rawClientProductPayments: client.rawClient?.productPayments?.length || 0
    });

    if (productPayments && productPayments.length > 0) {
      const ieltsProducts = productPayments.filter((p: any) => p && p.productName === 'IELTS_ENROLLMENT');
      if (ieltsProducts.length > 0) {
        console.log(`[Excel Export] Client ${clientName}: Found ${ieltsProducts.length} IELTS product(s)`, ieltsProducts);
        ieltsProducts.forEach((ielts: any, idx: number) => {
          console.log(`[Excel Export] IELTS Product ${idx + 1}:`, {
            productName: ielts.productName,
            entityType: ielts.entityType,
            hasEntity: !!ielts.entity,
            entity: ielts.entity,
            amount: ielts.amount,
            paymentDate: ielts.paymentDate
          });
        });
      }
    }

    // Debug: Log extracted IELTS data
    console.log(`[Excel Export] Client ${clientName}: Extracted productData:`, {
      hasIeltsEnrollment: !!productData.ieltsEnrollment,
      ieltsEnrollment: productData.ieltsEnrollment
    });

    // Get saleType from multiple possible sources
    const saleType = client.saleType ||
                    client.rawClient?.saleType ||
                    (client as any).saleType;
    const isCoreProduct = saleType?.isCoreProduct ?? true;

    // Handle counsellor - can be object or string, check multiple sources
    const counsellorObj = client.counsellor || client.rawClient?.counsellor;
    let counsellorName = "N/A";

    if (typeof counsellorObj === 'object' && counsellorObj?.name) {
      counsellorName = counsellorObj.name;
    } else if (typeof client.counsellor === 'string') {
      counsellorName = client.counsellor;
    } else if (typeof counsellorObj === 'string') {
      counsellorName = counsellorObj;
    } else if (client.rawClient?.counsellorName) {
      counsellorName = client.rawClient.counsellorName;
    }

    // Calculate TOTAL CAD (sum of all amounts or use beacon amount)
    const totalCad = productData.beaconAccount?.amount || 0;

    // Get salesType from multiple possible sources
    const salesTypeValue = client.salesType ||
                          (client.saleType?.saleType) ||
                          (client.rawClient?.saleType?.saleType) ||
                          (client.rawClient?.salesType) ||
                          "N/A";

    // Get enrollment date from multiple sources
    const enrollmentDate = client.enrollmentDate || client.rawClient?.enrollmentDate || "N/A";

    // Passport (from Add Client form - passportDetails)
    const passportValue =
      (client as any).passportDetails ??
      client.rawClient?.passportDetails ??
      "";

    // Lead Type (from Add Client form - leadSource / leadType)
    const leadTypeObj = client.rawClient?.leadType ?? (client as any).leadType;
    const leadTypeValue =
      (client as any).leadSource ??
      client.rawClient?.leadSource ??
      (typeof leadTypeObj === "string" ? leadTypeObj : leadTypeObj?.leadType) ??
      "";

    // Get total payment - try multiple sources
    const totalPaymentValue = client.totalPayment ||
                             client.rawClient?.payments?.[0]?.totalPayment ||
                             (payments.length > 0 ? Number(payments[0].totalPayment || 0) : 0);

    // Recalculate amount received from payments if not already calculated
    const amountReceivedValue = client.amountReceived ||
                               (payments.length > 0 ? payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) : 0);

    // Recalculate amount pending
    const amountPendingValue = client.amountPending ||
                              (totalPaymentValue - amountReceivedValue);

    // Column order aligned with Add Client page: Sr.No → Client Name → Enrollment Date → Passport → Lead Type → Counsellor → Sale Type → Total Payment → Initial... → products
    return {
      "Sr. No.": index + 1,
      "Client Name": clientName,
      "Enrollment Date": enrollmentDate,
      "Passport": passportValue,
      "Lead Type": leadTypeValue,
      "Counsellor Name": counsellorName,
      "Sale Type": salesTypeValue,
      "Total Payment": `₹${totalPaymentValue.toLocaleString()}`,
      "Amount Received": `₹${amountReceivedValue.toLocaleString()}`,
      "Amount Pending": `₹${amountPendingValue.toLocaleString()}`,
      "Core Sales": isCoreProduct ? "Yes" : "No",

      // Consultancy Payments (Initial, Before Visa, After Visa)
      "Initial Payment Amount": paymentData.initial?.amount ? `₹${Number(paymentData.initial.amount).toLocaleString()}` : "",
      "Initial Payment Date": paymentData.initial?.date || "",
      "Initial Payment Invoice No": paymentData.initial?.invoiceNo || "",
      "Initial Payment Remarks": paymentData.initial?.remarks || "",
      "Before Visa Payment Amount": paymentData.beforeVisa?.amount ? `₹${Number(paymentData.beforeVisa.amount).toLocaleString()}` : "",
      "Before Visa Payment Date": paymentData.beforeVisa?.date || "",
      "Before Visa Payment Invoice No": paymentData.beforeVisa?.invoiceNo || "",
      "Before Visa Payment Remarks": paymentData.beforeVisa?.remarks || "",
      "After Visa Payment Amount": paymentData.afterVisa?.amount ? `₹${Number(paymentData.afterVisa.amount).toLocaleString()}` : "",
      "After Visa Payment Date": paymentData.afterVisa?.date || "",
      "After Visa Payment Invoice No": paymentData.afterVisa?.invoiceNo || "",
      "After Visa Payment Remarks": paymentData.afterVisa?.remarks || "",

      // Product Payments - Finance And Employment
      "Finance And Employment Payment": productData.financeAndEmployment?.amount
        ? `₹${Number(productData.financeAndEmployment.amount).toLocaleString()}`
        : "",
      "Finance And Employment Date of Payment": productData.financeAndEmployment?.date || "",
      "Finance And Employment Invoice No": productData.financeAndEmployment?.invoiceNo || "",
      "Finance And Employment Remarks": productData.financeAndEmployment?.remarks || "",

      // India Side Employment
      "India Side Employment": productData.indianSideEmployment?.amount
        ? `₹${Number(productData.indianSideEmployment.amount).toLocaleString()}`
        : "",
      "India Side Employment Date of Payment": productData.indianSideEmployment?.date || "",
      "India Side Employment Invoice No": productData.indianSideEmployment?.invoiceNo || "",
      "India Side Employment Remarks": productData.indianSideEmployment?.remarks || "",

      // IELTS Enrollment
      "IELTS Enrollment Amount": productData.ieltsEnrollment?.amount
        ? `₹${Number(productData.ieltsEnrollment.amount).toLocaleString()}`
        : "",
      "Date of Enrollment/ Payment": productData.ieltsEnrollment?.date || "",
      "IELTS Enrollment Invoice No": productData.ieltsEnrollment?.invoiceNo || "",
      "IELTS Enrollment Remarks": productData.ieltsEnrollment?.remarks || "",

      // Loan Details
      "Loan Amount": productData.loan?.amount
        ? `₹${Number(productData.loan.amount).toLocaleString()}`
        : "",
      "Loan Disbursement Date": productData.loan?.date || "",
      "Loan Invoice No": productData.loan?.invoiceNo || "",
      "Loan Remarks": productData.loan?.remarks || "",

      // Common Law - Affidavit Payment
      "Common Law - Affidavit Payment": "", // Need to identify this product type
      "Common Law Date of Payment": "", // For Common Law Affidavit
      "Common Law Invoice No": "",
      "Common Law Remarks": "",

      // Lawyer Charges - Refusal Cases
      "Lawyer Charges - Refusal Cases": productData.lawyerRefusal?.amount
        ? `₹${Number(productData.lawyerRefusal.amount).toLocaleString()}`
        : "",
      "Lawyer Charges Date of Payment": productData.lawyerRefusal?.date || "",
      "Lawyer Charges Invoice No": productData.lawyerRefusal?.invoiceNo || "",
      "Lawyer Charges Remarks": productData.lawyerRefusal?.remarks || "",

      // Part-time Employment
      "Part-time Employment Amount": productData.partTimeEmployment?.amount
        ? `₹${Number(productData.partTimeEmployment.amount).toLocaleString()}`
        : "",
      "Part-time Employment Date of Payment": productData.partTimeEmployment?.date || "",
      "Part-time Employment Invoice No": productData.partTimeEmployment?.invoiceNo || "",
      "Part-time Employment Remarks": productData.partTimeEmployment?.remarks || "",

      // Employment NOC Arrangement
      "Employment NOC Arrangement": productData.nocArrangement?.amount
        ? `₹${Number(productData.nocArrangement.amount).toLocaleString()}`
        : "",
      "Employment NOC Date of Payment": productData.nocArrangement?.date || "",
      "Employment NOC Invoice No": productData.nocArrangement?.invoiceNo || "",
      "Employment NOC Remarks": productData.nocArrangement?.remarks || "",

      // TRV/ Work Permit Ext. / Study Permit Extension
      "TRV/ Work Permit Ext. / Study Permit Extension": productData.trvExtension?.amount
        ? `₹${Number(productData.trvExtension.amount).toLocaleString()}`
        : "",
      "TRV Date of Payment": productData.trvExtension?.date || "",
      "TRV Invoice No": productData.trvExtension?.invoiceNo || "",
      "TRV Remarks": productData.trvExtension?.remarks || "",

      // Marriage photo's for Court Marriage
      "Marriage photo's for Court Marriage": productData.marriagePhoto?.amount
        ? `₹${Number(productData.marriagePhoto.amount).toLocaleString()}`
        : "",
      "Marriage Photo Date of Payment": productData.marriagePhoto?.date || "",
      "Marriage Photo Invoice No": productData.marriagePhoto?.invoiceNo || "",
      "Marriage Photo Remarks": productData.marriagePhoto?.remarks || "",

      // Common Law Marriage Cert+ Photos
      "Common Law Marriage Cert+ Photos": productData.marriageCert?.amount
        ? `₹${Number(productData.marriageCert.amount).toLocaleString()}`
        : "",
      "Common Law Marriage Cert Date": productData.marriageCert?.date || "",
      "Common Law Marriage Cert Invoice No": productData.marriageCert?.invoiceNo || "",
      "Common Law Marriage Cert Remarks": productData.marriageCert?.remarks || "",

      // Insurance
      "Insurance Amount": productData.insurance?.amount
        ? `₹${Number(productData.insurance.amount).toLocaleString()}`
        : "",
      "Insurance Date": productData.insurance?.date || "",
      "Insurance Invoice No": productData.insurance?.invoiceNo || "",
      "Insurance Remarks": productData.insurance?.remarks || "",

      // Air Ticket
      "Air Ticket": productData.airTicket?.amount
        ? `₹${Number(productData.airTicket.amount).toLocaleString()}`
        : "",
      "Air Ticket Date": productData.airTicket?.date || "",
      "Air Ticket Invoice No": productData.airTicket?.invoiceNo || "",
      "Air Ticket Remarks": productData.airTicket?.remarks || "",

      // Relationship Affidavit - Lawyer Charges
      "Relationship Affidavit - Lawyer Charges": productData.relationshipAffidavit?.amount
        ? `₹${Number(productData.relationshipAffidavit.amount).toLocaleString()}`
        : "",
      "Payment Date": productData.relationshipAffidavit?.date || "",
      "Relationship Affidavit Invoice No": productData.relationshipAffidavit?.invoiceNo || "",
      "Relationship Affidavit Remarks": productData.relationshipAffidavit?.remarks || "",

      // SIM Card
      "SIM PLAN": typeof productData.simPlan?.amount === 'string' ? productData.simPlan.amount : "",
      "SIM CARD": productData.simCard?.date ? "Yes" : "",
      "SIM Card Invoice No": productData.simCard?.invoiceNo || "",
      "SIM Card Remarks": productData.simCard?.remarks || "",

      // Beacon Account
      "Beacon A/C Amount received date": productData.beaconAccount?.amount
        ? `$${Number(productData.beaconAccount.amount).toLocaleString()}`
        : "",
      "Beacon A/C Date": productData.beaconAccount?.date || "",
      "Beacon A/C Invoice No": productData.beaconAccount?.invoiceNo || "",
      "Beacon A/C Remarks": productData.beaconAccount?.remarks || "",

      // TOTAL CAD
      "TOTAL CAD": totalCad ? `CAD ${Number(totalCad).toLocaleString()}` : "",

      // Judicial review charges
      "Judicial review charges": productData.judicialReview?.amount
        ? `₹${Number(productData.judicialReview.amount).toLocaleString()}`
        : "",
      "Judicial review charges Payment Date": productData.judicialReview?.date || "",
      "Judicial review charges Invoice No": productData.judicialReview?.invoiceNo || "",
      "Judicial review charges Remarks": productData.judicialReview?.remarks || "",

      // Refusal Charges
      "Refusal Charges Amount": productData.refusalCharges?.amount != null ? `₹${Number(productData.refusalCharges.amount).toLocaleString()}` : "",
      "Refusal Charges Date": productData.refusalCharges?.date || "",
      "Refusal Charges Invoice No": productData.refusalCharges?.invoiceNo || "",
      "Refusal Charges Remarks": productData.refusalCharges?.remarks || "",

      // Kids Study Permit
      "Kids Study Permit Amount": productData.kidsStudyPermit?.amount != null ? `₹${Number(productData.kidsStudyPermit.amount).toLocaleString()}` : "",
      "Kids Study Permit Date": productData.kidsStudyPermit?.date || "",
      "Kids Study Permit Invoice No": productData.kidsStudyPermit?.invoiceNo || "",
      "Kids Study Permit Remarks": productData.kidsStudyPermit?.remarks || "",

      // Canada Fund
      "Canada Fund Amount": productData.canadaFund?.amount != null ? `₹${Number(productData.canadaFund.amount).toLocaleString()}` : "",
      "Canada Fund Date": productData.canadaFund?.date || "",
      "Canada Fund Invoice No": productData.canadaFund?.invoiceNo || "",
      "Canada Fund Remarks": productData.canadaFund?.remarks || "",

      // Employment Verification Charges
      "Employment Verification Charges": productData.employmentVerificationCharges?.amount != null ? `₹${Number(productData.employmentVerificationCharges.amount).toLocaleString()}` : "",
      "Employment Verification Charges Payment Date": productData.employmentVerificationCharges?.date || "",
      "Employment Verification Charges Invoice No": productData.employmentVerificationCharges?.invoiceNo || "",
      "Employment Verification Charges Remarks": productData.employmentVerificationCharges?.remarks || "",

      // Additional Amount Statement Charges
      "Additional Amount Statement Charges": productData.additionalAmountStatementCharges?.amount != null ? `₹${Number(productData.additionalAmountStatementCharges.amount).toLocaleString()}` : "",
      "Additional Amount Statement Date": productData.additionalAmountStatementCharges?.date || "",
      "Additional Amount Statement Invoice No": productData.additionalAmountStatementCharges?.invoiceNo || "",
      "Additional Amount Statement Remarks": productData.additionalAmountStatementCharges?.remarks || "",

      // Other Product (OTHER_NEW_SELL – entity-based)
      "Other Product Service Name": (productData.otherProduct as any)?.serviceName ?? "",
      "Other Product Amount": productData.otherProduct?.amount != null ? `₹${Number(productData.otherProduct.amount).toLocaleString()}` : "",
      "Other Product Date": productData.otherProduct?.date || "",
      "Other Product Invoice No": productData.otherProduct?.invoiceNo || "",
      "Other Product Remarks": productData.otherProduct?.remarks || "",

      // RAG
      "RAG": "",
    };
  });

  // Create workbook with single flat sheet
  const workbook = XLSX.utils.book_new();

  // Single flat sheet matching original structure
  const worksheet = XLSX.utils.json_to_sheet(flatClientData);

  // Set column widths for all columns (matching Add Client page order: Sr.No, Client Name, Enrollment Date, Passport, Lead Type, Counsellor, Sale Type, Total Payment, ...)
  worksheet['!cols'] = [
    { wch: 8 },   // Sr. No.
    { wch: 25 },  // Client Name
    { wch: 15 },  // Enrollment Date
    { wch: 18 },  // Passport
    { wch: 18 },  // Lead Type
    { wch: 20 },  // Counsellor Name
    { wch: 20 },  // Sale Type
    { wch: 15 },  // Total Payment
    { wch: 15 },  // Amount Received
    { wch: 15 },  // Amount Pending
    { wch: 12 },  // Core Sales

    // Consultancy Payments
    { wch: 20 },  // Initial Payment Amount
    { wch: 18 },  // Initial Payment Date
    { wch: 20 },  // Initial Payment Invoice No
    { wch: 30 },  // Initial Payment Remarks
    { wch: 20 },  // Before Visa Payment Amount
    { wch: 18 },  // Before Visa Payment Date
    { wch: 20 },  // Before Visa Payment Invoice No
    { wch: 30 },  // Before Visa Payment Remarks
    { wch: 20 },  // After Visa Payment Amount
    { wch: 18 },  // After Visa Payment Date
    { wch: 20 },  // After Visa Payment Invoice No
    { wch: 30 },  // After Visa Payment Remarks

    // Finance And Employment
    { wch: 30 },  // Finance And Employment Payment
    { wch: 30 },  // Finance And Employment Date of Payment
    { wch: 25 },  // Finance And Employment Invoice No
    { wch: 30 },  // Finance And Employment Remarks

    // India Side Employment
    { wch: 25 },  // India Side Employment
    { wch: 30 },  // India Side Employment Date of Payment
    { wch: 25 },  // India Side Employment Invoice No
    { wch: 30 },  // India Side Employment Remarks

    // IELTS Enrollment
    { wch: 25 },  // IELTS Enrollment Amount
    { wch: 25 },  // Date of Enrollment/ Payment
    { wch: 25 },  // IELTS Enrollment Invoice No
    { wch: 30 },  // IELTS Enrollment Remarks

    // Loan Details
    { wch: 15 },  // Loan Amount
    { wch: 20 },  // Loan Disbursement Date
    { wch: 20 },  // Loan Invoice No
    { wch: 30 },  // Loan Remarks

    // Common Law - Affidavit Payment
    { wch: 30 },  // Common Law - Affidavit Payment
    { wch: 30 },  // Common Law Date of Payment
    { wch: 25 },  // Common Law Invoice No
    { wch: 30 },  // Common Law Remarks

    // Lawyer Charges - Refusal Cases
    { wch: 30 },  // Lawyer Charges - Refusal Cases
    { wch: 30 },  // Lawyer Charges Date of Payment
    { wch: 25 },  // Lawyer Charges Invoice No
    { wch: 30 },  // Lawyer Charges Remarks

    // Part-time Employment
    { wch: 30 },  // Part-time Employment Amount
    { wch: 30 },  // Part-time Employment Date of Payment
    { wch: 25 },  // Part-time Employment Invoice No
    { wch: 30 },  // Part-time Employment Remarks

    // Employment NOC Arrangement
    { wch: 30 },  // Employment NOC Arrangement
    { wch: 30 },  // Employment NOC Date of Payment
    { wch: 25 },  // Employment NOC Invoice No
    { wch: 30 },  // Employment NOC Remarks

    // TRV/ Work Permit Ext. / Study Permit Extension
    { wch: 40 },  // TRV/ Work Permit Ext. / Study Permit Extension
    { wch: 25 },  // TRV Date of Payment
    { wch: 25 },  // TRV Invoice No
    { wch: 30 },  // TRV Remarks

    // Marriage photo's for Court Marriage
    { wch: 35 },  // Marriage photo's for Court Marriage
    { wch: 30 },  // Marriage Photo Date of Payment
    { wch: 25 },  // Marriage Photo Invoice No
    { wch: 30 },  // Marriage Photo Remarks

    // Common Law Marriage Cert+ Photos
    { wch: 35 },  // Common Law Marriage Cert+ Photos
    { wch: 30 },  // Common Law Marriage Cert Date
    { wch: 25 },  // Common Law Marriage Cert Invoice No
    { wch: 30 },  // Common Law Marriage Cert Remarks

    // Insurance
    { wch: 15 },  // Insurance Amount
    { wch: 15 },  // Insurance Date
    { wch: 20 },  // Insurance Invoice No
    { wch: 30 },  // Insurance Remarks

    // Air Ticket
    { wch: 15 },  // Air Ticket
    { wch: 15 },  // Air Ticket Date
    { wch: 20 },  // Air Ticket Invoice No
    { wch: 30 },  // Air Ticket Remarks

    // Relationship Affidavit - Lawyer Charges
    { wch: 35 },  // Relationship Affidavit - Lawyer Charges
    { wch: 15 },  // Payment Date
    { wch: 25 },  // Relationship Affidavit Invoice No
    { wch: 30 },  // Relationship Affidavit Remarks

    // SIM Card
    { wch: 15 },  // SIM PLAN
    { wch: 12 },  // SIM CARD
    { wch: 20 },  // SIM Card Invoice No
    { wch: 30 },  // SIM Card Remarks

    // Beacon Account
    { wch: 30 },  // Beacon A/C Amount received date
    { wch: 20 },  // Beacon A/C Date
    { wch: 25 },  // Beacon A/C Invoice No
    { wch: 30 },  // Beacon A/C Remarks

    // TOTAL CAD
    { wch: 15 },  // TOTAL CAD

    // Judicial review charges
    { wch: 25 },  // Judicial review charges
    { wch: 30 },  // Judicial review charges Payment Date
    { wch: 25 },  // Judicial review charges Invoice No
    { wch: 30 },  // Judicial review charges Remarks

    // Refusal Charges
    { wch: 20 },  // Refusal Charges Amount
    { wch: 18 },  // Refusal Charges Date
    { wch: 22 },  // Refusal Charges Invoice No
    { wch: 25 },  // Refusal Charges Remarks

    // Kids Study Permit
    { wch: 20 },  // Kids Study Permit Amount
    { wch: 18 },  // Kids Study Permit Date
    { wch: 22 },  // Kids Study Permit Invoice No
    { wch: 25 },  // Kids Study Permit Remarks

    // Canada Fund
    { wch: 18 },  // Canada Fund Amount
    { wch: 18 },  // Canada Fund Date
    { wch: 22 },  // Canada Fund Invoice No
    { wch: 25 },  // Canada Fund Remarks

    // Employment Verification Charges
    { wch: 30 },  // Employment Verification Charges
    { wch: 40 },  // Employment Verification Charges Payment Date
    { wch: 30 },  // Employment Verification Charges Invoice No
    { wch: 30 },  // Employment Verification Charges Remarks

    // Additional Amount Statement Charges
    { wch: 35 },  // Additional Amount Statement Charges
    { wch: 25 },  // Additional Amount Statement Date
    { wch: 28 },  // Additional Amount Statement Invoice No
    { wch: 30 },  // Additional Amount Statement Remarks

    // Other Product
    { wch: 25 },  // Other Product Service Name
    { wch: 18 },  // Other Product Amount
    { wch: 18 },  // Other Product Date
    { wch: 22 },  // Other Product Invoice No
    { wch: 25 },  // Other Product Remarks

    // RAG
    { wch: 10 },  // RAG
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Client Details");

  // Generate Excel file and download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `clients-report-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};
