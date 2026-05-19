/**
 * Map backend product keys to the same user-friendly names used in Add Client / product selection.
 * Used in Activity log and anywhere we display product names to users.
 */
export const PRODUCT_DISPLAY_NAMES: Record<string, string> = {
  ALL_FINANCE_EMPLOYEMENT: "All Finance & Employment",
  INDIAN_SIDE_EMPLOYEMENT: "Indian Side Employment",
  IELTS_ENROLLMENT: "IELTS Enrollment",
  LOAN_DETAILS: "Loan Details",
  FOREX_CARD: "Forex Card",
  FOREX_FEES: "Forex Fees",
  TUTION_FEES: "Tuition Fee",
  CREDIT_CARD: "Credit Card",
  NOC_LEVEL_JOB_ARRANGEMENT: "NOC Level Job Arrangement",
  LAWYER_REFUSAL_CHARGE: "Lawyer Refusal Charge",
  ONSHORE_PART_TIME_EMPLOYEMENT: "Onshore Part-Time Employment",
  TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION: "TRV/Work Permit Extension",
  MARRIAGE_PHOTO_FOR_COURT_MARRIAGE: "Marriage Photo for Court Marriage",
  MARRIAGE_PHOTO_CERTIFICATE: "Marriage Photo + Certificate",
  RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT: "Relationship Affidavit",
  JUDICAL_REVIEW_CHARGE: "Judicial Review Charge",
  REFUSAL_CHARGES: "Refusal Charges",
  KIDS_STUDY_PERMIT: "Kids Study Permit",
  SPONSOR_CHARGES: "Sponsor Charges",
  SIM_CARD_ACTIVATION: "SIM Card Activation",
  INSURANCE: "Insurance",
  BEACON_ACCOUNT: "Beacon Account",
  AIR_TICKET: "Air Ticket",
  CANADA_FUND: "Canada Fund",
  EMPLOYMENT_VERIFICATION_CHARGES: "Canada Side Employment Verification Charges",
  ADDITIONAL_AMOUNT_STATEMENT_CHARGES: "Additional Amount Statement Charges",
  OTHER_NEW_SELL: "Other Product",
};

/**
 * Get user-friendly product name: prefer API productLabel, else map from backend key, else return raw.
 */
export function getProductDisplayName(
  backendKey: string | null | undefined,
  apiLabel?: string | null
): string {
  if (apiLabel && String(apiLabel).trim()) return String(apiLabel).trim();
  if (backendKey && PRODUCT_DISPLAY_NAMES[backendKey]) return PRODUCT_DISPLAY_NAMES[backendKey];
  return backendKey || "Product";
}
