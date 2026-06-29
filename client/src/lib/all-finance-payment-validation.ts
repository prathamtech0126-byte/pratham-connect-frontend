const MONEY_EPSILON = 0.005;

export const PARTIAL_PAYMENT_REQUEST_REQUIRED_MESSAGE =
  "Make partial payment request first before saving it";

export const PARTIAL_PAYMENT_REMARKS_REQUIRED_MESSAGE =
  "Remarks are required for partial payment";

export function isPartialPaymentRequestRequiredMessage(message: string): boolean {
  return message === PARTIAL_PAYMENT_REQUEST_REQUIRED_MESSAGE;
}

export function hasAllFinanceRemarks(remarks: unknown): boolean {
  return typeof remarks === "string" && remarks.trim().length > 0;
}

export type AllFinanceFieldData = {
  totalAmount?: number | null;
  amount?: number | null;
  remarks?: string | null;
};

function validatePartialPaymentRemarks(
  fieldData: AllFinanceFieldData
): { ok: true } | { ok: false; message: string } {
  const total = parseFinanceMoney(fieldData.totalAmount);
  const amount = parseFinanceMoney(fieldData.amount);
  if (isAllFinancePartialScenario(total, amount) && !hasAllFinanceRemarks(fieldData.remarks)) {
    return { ok: false, message: PARTIAL_PAYMENT_REMARKS_REQUIRED_MESSAGE };
  }
  return { ok: true };
}

export function parseFinanceMoney(value: unknown): number {
  if (value === undefined || value === null || value === "") return NaN;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function financeAmountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < MONEY_EPSILON;
}

export function isAllFinancePartialScenario(totalAmount: number, amount: number): boolean {
  return (
    Number.isFinite(totalAmount) &&
    Number.isFinite(amount) &&
    totalAmount > 0 &&
    amount > 0 &&
    !financeAmountsEqual(totalAmount, amount)
  );
}

export function validateAllFinanceForSave(
  fieldData: AllFinanceFieldData,
  isPartialPayment: boolean,
  approvalStatus: "pending" | "approved" | "rejected" | null
): { ok: true } | { ok: false; message: string } {
  const total = parseFinanceMoney(fieldData.totalAmount);
  const amount = parseFinanceMoney(fieldData.amount);

  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, message: "Total payment is required" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Amount is required" };
  }
  if (amount > total + MONEY_EPSILON) {
    return { ok: false, message: "Amount cannot exceed total payment" };
  }

  const remarksCheck = validatePartialPaymentRemarks(fieldData);
  if (!remarksCheck.ok) return remarksCheck;

  if (isAllFinancePartialScenario(total, amount)) {
    if (!isPartialPayment || approvalStatus === null) {
      return { ok: false, message: PARTIAL_PAYMENT_REQUEST_REQUIRED_MESSAGE };
    }
  }

  return { ok: true };
}

export function validateAllFinancePartialRequest(
  fieldData: AllFinanceFieldData
): { ok: true } | { ok: false; message: string } {
  const total = parseFinanceMoney(fieldData.totalAmount);
  const amount = parseFinanceMoney(fieldData.amount);

  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, message: "Enter total payment before submitting partial payment request" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Enter amount before submitting partial payment request" };
  }
  if (amount > total + MONEY_EPSILON) {
    return { ok: false, message: "Amount cannot exceed total payment" };
  }
  if (financeAmountsEqual(total, amount)) {
    return {
      ok: false,
      message: "Total and amount are the same — save directly without partial payment request",
    };
  }

  const remarksCheck = validatePartialPaymentRemarks(fieldData);
  if (!remarksCheck.ok) return remarksCheck;

  return { ok: true };
}
