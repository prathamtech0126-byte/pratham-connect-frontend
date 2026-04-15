// // client/src/api/payments.api.ts
// import api from "@/lib/api";

// export type PaymentsFilter = "today" | "monthly" | "yearly" | "custom";

// export interface PaymentsListParams {
//   filter: PaymentsFilter;
//   startDate?: string; // YYYY-MM-DD, only when filter === "custom"
//   endDate?: string;   // YYYY-MM-DD, only when filter === "custom"
// }

// export interface PaymentRecord {
//   date: string;        // e.g. "14 Apr 2026"
//   clientName: string;
//   amount: string;      // numeric string e.g. "35400"
//   clientOwner: string;
//   addedBy: string;
//   sharedClient: "Yes" | "No";
// }

// export interface PaymentsListResponse {
//   success: boolean;
//   filter: string;
//   startDate: string;
//   endDate: string;
//   total: number;
//   data: PaymentRecord[];
// }

// export async function fetchPaymentsList(
//   params: PaymentsListParams
// ): Promise<PaymentsListResponse> {
//   const query = new URLSearchParams({ filter: params.filter });
//   if (params.filter === "custom" && params.startDate && params.endDate) {
//     query.set("startDate", params.startDate);
//     query.set("endDate", params.endDate);
//   }
//   const res = await api.get<PaymentsListResponse>(
//     `/api/reports/payments-list?${query.toString()}`
//   );
//   return res.data;
// }



// ----------- Chatgpt code ----------

// client/src/api/payments.api.ts
import api from "@/lib/api";

export type PaymentsFilter = "today" | "monthly" | "yearly" | "custom";

export interface PaymentsListParams {
  filter: PaymentsFilter;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  counsellorId?: number;
}

export interface PaymentRecord {
  date: string;
  clientName: string;
  paymentType?: string;
  amount: string;
  clientOwner: string;
  addedBy: string;
  sharedClient: "Yes" | "No";
  // Fields added after backend update — present for editable rows
  paymentId: number | null;
  clientId: number | null;
  saleTypeId: number | null;
  totalPayment: string | null;
  invoiceNo: string | null;
  remarks: string | null;
  source: "payment" | "product";
}

export interface UpdatePaymentParams {
  paymentId: number;
  clientId: number;
  saleTypeId: number;
  stage: "INITIAL" | "BEFORE_VISA" | "AFTER_VISA" | "SUBMITTED_VISA";
  amount: string;
  totalPayment: string;
  paymentDate: string; // YYYY-MM-DD
  invoiceNo?: string;
  remarks?: string;
}

export interface UpdateProductPaymentParams {
  productPaymentId: number;
  clientId: number;
  productName: string; // ProductType enum value from backend (matches client_product_payment.product_name column)
  amount: string;
  paymentDate: string; // YYYY-MM-DD
  invoiceNo?: string;
  remarks?: string;
}

export async function updatePayment(params: UpdatePaymentParams): Promise<void> {
  await api.post("/api/client-payments", params);
}

export async function updateProductPayment(params: UpdateProductPaymentParams): Promise<void> {
  await api.post("/api/client-product-payments", params);
}

export interface PaymentsListResponse {
  success: boolean;
  filter: PaymentsFilter;
  startDate: string;
  endDate: string;
  total: number;
  data: PaymentRecord[];
}

export async function fetchPaymentsList(
  params: PaymentsListParams
): Promise<PaymentsListResponse> {
  const query = new URLSearchParams();

  // always send filter
  query.set("filter", params.filter);

  // only send dates when custom
  if (params.filter === "custom") {
    if (!params.startDate || !params.endDate) {
      throw new Error("startDate and endDate are required for custom filter");
    }

    query.set("startDate", params.startDate);
    query.set("endDate", params.endDate);
  }

  // optional counsellor filter
  if (typeof params.counsellorId === "number") {
    query.set("counsellorId", String(params.counsellorId));
  }

  const response = await api.get<PaymentsListResponse>(
    `/api/reports/payments-list`,
    {
      params: Object.fromEntries(query.entries()),
      // NOTE: axios instance already handles:
      // - credentials (JWT cookie)
      // - CSRF token via interceptors
    }
  );

  return response.data;
}