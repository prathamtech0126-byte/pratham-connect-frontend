// client/src/api/payments.api.ts
import api from "@/lib/api";

export type PaymentsFilter = "today" | "monthly" | "yearly" | "custom";

export interface PaymentsListParams {
  filter: PaymentsFilter;
  startDate?: string; // YYYY-MM-DD, only when filter === "custom"
  endDate?: string;   // YYYY-MM-DD, only when filter === "custom"
}

export interface PaymentRecord {
  date: string;        // e.g. "14 Apr 2026"
  clientName: string;
  amount: string;      // numeric string e.g. "35400"
  clientOwner: string;
  addedBy: string;
  sharedClient: "Yes" | "No";
}

export interface PaymentsListResponse {
  success: boolean;
  filter: string;
  startDate: string;
  endDate: string;
  total: number;
  data: PaymentRecord[];
}

export async function fetchPaymentsList(
  params: PaymentsListParams
): Promise<PaymentsListResponse> {
  const query = new URLSearchParams({ filter: params.filter });
  if (params.filter === "custom" && params.startDate && params.endDate) {
    query.set("startDate", params.startDate);
    query.set("endDate", params.endDate);
  }
  const res = await api.get<PaymentsListResponse>(
    `/api/reports/payments-list?${query.toString()}`
  );
  return res.data;
}
