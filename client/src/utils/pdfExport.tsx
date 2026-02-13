import React from "react";
import { pdf } from "@react-pdf/renderer";
import { Client } from "@/services/clientService";
import { ClientDetailsPDF } from "@/components/pdf/ClientDetailsPDF";

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
 * (Same as in excelExport.ts)
 */
const extractProductData = (productPayments: any[] = []) => {
  const productMap: Record<string, { amount: string | number; date: string }> = {};

  productPayments.forEach((product: any) => {
    const productName = product.productName;
    const entity = product.entity;

    // Handle master_only products (amount and date in productPayment)
    if (product.entityType === 'master_only') {
      const amount = product.amount ? Number(product.amount) : 0;
      const date = product.paymentDate || '';

      switch (productName) {
        case 'ALL_FINANCE_EMPLOYEMENT':
          productMap['financeAndEmployment'] = { amount, date };
          break;
        case 'INDIAN_SIDE_EMPLOYEMENT':
          productMap['indianSideEmployment'] = { amount, date };
          break;
        case 'IELTS_ENROLLMENT':
          productMap['ieltsEnrollment'] = { amount, date: product.paymentDate || product.enrollmentDate || date };
          break;
        case 'LOAN_DETAILS':
          productMap['loan'] = { amount, date: product.disbursementDate || date };
          break;
        case 'LAWYER_REFUSAL_CHARGE':
          productMap['lawyerRefusal'] = { amount, date };
          break;
        case 'ONSHORE_PART_TIME_EMPLOYEMENT':
          productMap['partTimeEmployment'] = { amount, date };
          break;
        case 'NOC_LEVEL_JOB_ARRANGEMENT':
          productMap['nocArrangement'] = { amount, date };
          break;
        case 'TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION':
          productMap['trvExtension'] = { amount, date };
          break;
        case 'MARRIAGE_PHOTO_FOR_COURT_MARRIAGE':
          productMap['marriagePhoto'] = { amount, date };
          break;
        case 'MARRIAGE_PHOTO_CERTIFICATE':
          productMap['marriageCert'] = { amount, date };
          break;
        case 'RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT':
          productMap['relationshipAffidavit'] = { amount, date };
          break;
        case 'JUDICAL_REVIEW_CHARGE':
          productMap['judicialReview'] = { amount, date };
          break;
        case 'SPONSOR_CHARGES':
          productMap['sponsorCharges'] = { amount, date };
          break;
      }
    }
    // Handle entity-based products
    else if (entity) {
      switch (productName) {
        case 'INSURANCE':
          productMap['insurance'] = {
            amount: entity.amount ? Number(entity.amount) : 0,
            date: entity.insuranceDate || ''
          };
          break;
        case 'AIR_TICKET':
          productMap['airTicket'] = {
            amount: entity.amount ? Number(entity.amount) : 0,
            date: entity.ticketDate || ''
          };
          break;
        case 'BEACON_ACCOUNT':
          productMap['beaconAccount'] = {
            amount: entity.amount ? Number(entity.amount) : 0,
            date: entity.fundingDate || entity.openingDate || ''
          };
          break;
        case 'SIM_CARD_ACTIVATION':
          productMap['simCard'] = {
            amount: 0, // SIM doesn't have amount
            date: entity.simActivationDate || entity.simCardGivingDate || ''
          };
          productMap['simPlan'] = {
            amount: entity.simcardPlan || '',
            date: ''
          };
          break;
      }
    }
  });

  return productMap;
};

/**
 * Export clients data to PDF with single flat sheet matching Excel structure
 * @param clients - Array of clients with full details including payments and productPayments
 * @param fileName - Optional custom file name (default: clients-report-YYYY-MM-DD.pdf)
 */
export const exportClientsToPDF = async (
  clients: ClientWithDetails[],
  fileName?: string
): Promise<void> => {
  if (!clients || clients.length === 0) {
    throw new Error("No clients to export");
  }

  try {
    const blob = await pdf(
      <ClientDetailsPDF clients={clients} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `clients-report-${new Date().toISOString().split('T')[0]}.pdf`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

// Export the helper function for use in PDF component
export { extractProductData };
