import { useMemo, useCallback, useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { AllCounsellorClientsSkeleton } from "@/components/ui/page-skeletons";
import { clientService } from "@/services/clientService";
import { getLatestStageFromPayments } from "@/utils/stageUtils";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AllCounsellorClientsList,
  AllCounsellorClientRow,
  ClientStageFilter,
  ClientTypeFilter,
  ClientPaymentFilter,
  ClientProductFilter,
  getDateColumnMode,
} from "@/components/clients/AllCounsellorClientsList";

function flattenYearMonthClients(input: any): any[] {
  if (!input || typeof input !== "object") return [];
  const all: any[] = [];
  Object.keys(input).forEach((year) => {
    const yearData = input[year];
    if (!yearData || typeof yearData !== "object") return;
    Object.keys(yearData).forEach((month) => {
      const monthData = yearData[month];
      if (monthData?.clients && Array.isArray(monthData.clients)) {
        all.push(...monthData.clients);
      } else if (Array.isArray(monthData)) {
        all.push(...monthData);
      }
    });
  });
  return all;
}

function isYearMonthStructure(input: Record<string, unknown>): boolean {
  return Object.keys(input).some((k) => /^\d{4}$/.test(k));
}

function isCounsellorFirstStructure(input: Record<string, unknown>): boolean {
  return Object.keys(input).some((key) => {
    const value = input[key];
    return value && typeof value === "object" && ("counsellor" in (value as object) || "clients" in (value as object));
  });
}

function normalizeStage(stage: string): "Initial" | "Before Visa" | "After Visa" | "Other" {
  if (stage === "Initial") return "Initial";
  if (stage === "Before Visa") return "Before Visa";
  if (stage === "After Visa") return "After Visa";
  return "Other";
}

function parseStageParam(v: string | null): ClientStageFilter {
  const ok = ["initial", "before", "after"] as const;
  if (!v) return [];
  return v.split(",").filter((x): x is typeof ok[number] => (ok as readonly string[]).includes(x));
}

function parseClientTypeParam(v: string | null): ClientTypeFilter {
  const ok: ClientTypeFilter[] = ["all", "student", "student-core", "student-app", "student-td", "student-no-td", "student-sale-only", "core", "visitor", "spouse", "core-product", "other-product", "pending"];
  if (v && ok.includes(v as ClientTypeFilter)) return v as ClientTypeFilter;
  return "all";
}

function parsePaymentFilterParam(v: string | null): ClientPaymentFilter {
  const ok: ClientPaymentFilter[] = ["all", "pending-only", "fully-paid"];
  if (v && ok.includes(v as ClientPaymentFilter)) return v as ClientPaymentFilter;
  return "all";
}

function parseProductFilterParam(v: string | null): ClientProductFilter {
  const ok = ["all-finance", "noc-job", "work-permit", "study-permit"] as const;
  if (!v) return [];
  return v.split(",").filter((x): x is typeof ok[number] => (ok as readonly string[]).includes(x));
}

const TRV_PRODUCT = "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION";

/**
 * Predicate per product-filter value. Work Permit and Study Permit are both the
 * TRV product, distinguished only by the entity `type` ("Work Permit Ext." /
 * "Study Permit Ext."), so they need a type check — not just a productName match.
 */
const PRODUCT_MATCHERS: Record<string, (p: any) => boolean> = {
  "all-finance": (p) => p?.productName === "ALL_FINANCE_EMPLOYEMENT",
  "noc-job": (p) => p?.productName === "NOC_LEVEL_JOB_ARRANGEMENT",
  "work-permit": (p) => p?.productName === TRV_PRODUCT && p?.entity?.type === "Work Permit Ext.",
  "study-permit": (p) => p?.productName === TRV_PRODUCT && p?.entity?.type === "Study Permit Ext.",
};

/** Friendly labels for product names, shown as chips so users see what each client has. */
const PRODUCT_LABELS: Record<string, string> = {
  ALL_FINANCE_EMPLOYEMENT: "All Finance",
  NOC_LEVEL_JOB_ARRANGEMENT: "NOC Level Job",
  KIDS_STUDY_PERMIT: "Kids Study Permit",
  TUTION_FEES: "Tuition Fees",
};

function parseFlexibleDate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (!s) return null;
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const t = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const t = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? null : t;
}

function isDateInRange(value: unknown, fromMs: number, toMs: number): boolean {
  const t = parseFlexibleDate(value);
  return t != null && t >= fromMs && t <= toMs;
}

const OTHER_PRODUCT_DATE_KEYS = [
  "extensionDate",
  "sellDate",
  "enrollmentDate",
  "disbursmentDate",
  "ticketDate",
  "insuranceDate",
  "cardDate",
  "feeDate",
  "simCardGivingDate",
  "openingDate",
  "paymentDate",
  "fundingDate",
  "payment_date",
];

function hasAllFinanceInRange(
  productPayments: any[] | undefined,
  fromMs: number,
  toMs: number
): boolean {
  return (productPayments ?? []).some((p) => {
    if (p?.productName !== "ALL_FINANCE_EMPLOYEMENT") return false;
    const e = p?.entity ?? {};
    return [
      e.paymentDate,
      e.payment_date,
      e.anotherPaymentDate,
      e.anotherPaymentDate1,
      e.anotherPaymentDate2,
      e.anotherPaymentDate3,
    ].some((d) => isDateInRange(d, fromMs, toMs));
  });
}

function resolveCoreProductHandlerInRange(
  productPayments: any[] | undefined,
  rowCounsellorId: number | null,
  viewingCounsellorId: number | null,
  fromMs: number | null,
  toMs: number | null,
  counsellorNameById: Map<number, string>
): { id: number; name: string } | null {
  if (viewingCounsellorId == null || fromMs == null || toMs == null) return null;

  for (const p of productPayments ?? []) {
    if (p?.productName !== "ALL_FINANCE_EMPLOYEMENT") continue;
    const e = p?.entity ?? {};
    const dateInRange = [
      e.paymentDate,
      e.payment_date,
      e.anotherPaymentDate,
      e.anotherPaymentDate1,
      e.anotherPaymentDate2,
      e.anotherPaymentDate3,
    ].some((d) => isDateInRange(d, fromMs, toMs));
    if (!dateInRange) continue;

    const handledBy = p?.handledBy != null ? Number(p.handledBy) : null;
    const attributed = handledBy ?? rowCounsellorId;
    if (attributed == null || attributed === viewingCounsellorId) continue;

    const name =
      p?.handledByUser?.name ??
      counsellorNameById.get(attributed) ??
      `Counsellor #${attributed}`;

    return {
      id: attributed,
      name,
    };
  }

  return null;
}

function collectCoreProductHandlerIds(
  rows: AllCounsellorClientRow[],
  productPaymentsById: Map<string, any[]>,
  viewingCounsellorId: number | null,
  fromMs: number | null,
  toMs: number | null
): number[] {
  if (viewingCounsellorId == null || fromMs == null || toMs == null) return [];
  const ids = new Set<number>();
  for (const row of rows) {
    for (const p of productPaymentsById.get(row.id) ?? []) {
      if (p?.productName !== "ALL_FINANCE_EMPLOYEMENT") continue;
      const e = p?.entity ?? {};
      const dateInRange = [
        e.paymentDate,
        e.payment_date,
        e.anotherPaymentDate,
        e.anotherPaymentDate1,
        e.anotherPaymentDate2,
        e.anotherPaymentDate3,
      ].some((d) => isDateInRange(d, fromMs, toMs));
      if (!dateInRange) continue;
      const handledBy = p?.handledBy != null ? Number(p.handledBy) : null;
      const attributed = handledBy ?? row.counsellorId;
      if (attributed != null && attributed !== viewingCounsellorId) {
        ids.add(attributed);
      }
    }
  }
  return [...ids];
}

function getFirstApplicationMs(applicationDates: string[]): number | null {
  let min: number | null = null;
  for (const d of applicationDates) {
    const t = parseFlexibleDate(d);
    if (t != null && (min == null || t < min)) min = t;
  }
  return min;
}

/** Matches dashboard app_students: first application_date in period. */
function isFirstApplicationInDashboardRange(
  row: AllCounsellorClientRow,
  fromMs: number | null,
  toMs: number | null
): boolean {
  if (fromMs != null && toMs != null) {
    const first = getFirstApplicationMs(row.studentApplicationDates);
    return first != null && first >= fromMs && first <= toMs;
  }
  return row.hasStudentApplication || row.studentApplicationDates.length > 0;
}

/** Matches dashboard student_core: application on file + paid TD in period. */
function isStudentCoreInDashboardRange(
  row: AllCounsellorClientRow,
  productPayments: any[] | undefined,
  fromMs: number | null,
  toMs: number | null
): boolean {
  const hasApplication = row.hasStudentApplication || row.studentApplicationDates.length > 0;
  if (!hasApplication) return false;
  if (fromMs != null && toMs != null) {
    return hasTutionFeesInRange(productPayments, fromMs, toMs);
  }
  return row.hasTutionFees;
}

/** Student core sale type enrolled in period (sale type only — no application/TD suffix). */
function isStudentSaleTypeInEnrollmentRange(
  row: AllCounsellorClientRow,
  fromMs: number | null,
  toMs: number | null
): boolean {
  const isStudentSale =
    row.saleTypeCategory === "student" || /\bstudent\b/i.test(row.salesType ?? "");
  if (!isStudentSale) return false;
  if (fromMs == null || toMs == null) return true;
  if (!row.enrollmentDate) return false;
  return isDateInRange(row.enrollmentDate, fromMs, toMs);
}

function hasTutionFeesInRange(productPayments: any[] | undefined, fromMs: number, toMs: number): boolean {
  return (productPayments ?? []).some((p) => {
    if (p?.productName !== "TUTION_FEES") return false;
    if (p?.entity?.tutionFeesStatus !== "paid") return false;
    return isDateInRange(p?.entity?.feeDate, fromMs, toMs);
  });
}

/** Full student list when drilling down from dashboard Students card. */
function matchesStudentDashboardCardFilter(
  row: AllCounsellorClientRow,
  productPayments: any[] | undefined,
  fromMs: number | null,
  toMs: number | null
): boolean {
  if (fromMs == null || toMs == null) {
    return (
      row.hasStudentApplication ||
      row.hasTutionFees ||
      row.saleTypeCategory === "student" ||
      /\bstudent\b/i.test(row.salesType ?? "")
    );
  }
  // Period = first application date OR tuition deposit date — never enrollment date.
  return (
    isFirstApplicationInDashboardRange(row, fromMs, toMs) ||
    hasTutionFeesInRange(productPayments, fromMs, toMs)
  );
}

function matchesDashboardDateFilter(
  clientTypeFilter: ClientTypeFilter,
  row: AllCounsellorClientRow,
  productPayments: any[] | undefined,
  fromMs: number | null,
  toMs: number | null
): boolean {
  if (clientTypeFilter === "pending") return true;
  if (fromMs === null || toMs === null) return true;

  if (clientTypeFilter === "core-product") {
    return hasAllFinanceInRange(productPayments, fromMs, toMs);
  }

  if (clientTypeFilter === "other-product") {
    return (productPayments ?? []).some((p) => {
      const name = p?.productName;
      if (!name || name === "ALL_FINANCE_EMPLOYEMENT" || name === "TUTION_FEES") return false;
      const e = p?.entity ?? {};
      return OTHER_PRODUCT_DATE_KEYS.some((k) => isDateInRange(e[k], fromMs, toMs));
    });
  }

  if (
    clientTypeFilter === "student" ||
    clientTypeFilter === "student-core" ||
    clientTypeFilter === "student-app" ||
    clientTypeFilter === "student-td" ||
    clientTypeFilter === "student-no-td" ||
    clientTypeFilter === "student-sale-only"
  ) {
    // Date range applied in matchClientType
    return true;
  }

  if (!row.enrollmentDate) return false;
  return isDateInRange(row.enrollmentDate, fromMs, toMs);
}

function mapRawToRow(
  raw: any,
  fallbackCounsellorName: string,
  fallbackCounsellorId: number | null
): AllCounsellorClientRow | null {
  const id = raw.id || raw.clientId || raw.client_id;
  if (id == null) return null;

  const totalPayment = Number(raw.totalPayment || raw.payments?.[0]?.totalPayment || 0);
  const amountReceived = Array.isArray(raw.payments)
    ? raw.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
    : Number(raw.amountReceived || 0);
  const amountPending = Math.max(totalPayment - amountReceived, 0);
  const stage = getLatestStageFromPayments(raw.payments, raw.stage, raw.visaSubmitted) || "N/A";

  // Collect the normalized core payment stages that actually have a payment entry.
  const paidStages: string[] = Array.isArray(raw.payments)
    ? Array.from(
        new Set(
          raw.payments
            .map((p: any) => (p?.stage ? String(p.stage).toUpperCase() : null))
            .filter((s: string | null): s is string => s != null)
        )
      )
    : [];

  const corePayment = Array.isArray(raw.payments)
    ? raw.payments.find(
        (p: any) => p?.stage && ["INITIAL", "BEFORE_VISA", "AFTER_VISA"].includes(p.stage)
      )
    : null;
  let saleTypeCategory: string | null =
    (corePayment?.saleType?.categoryName as string | null | undefined) ?? null;
  if (!saleTypeCategory && raw.studentAppSaleType?.saleType) {
    const st: string = raw.studentAppSaleType.saleType.toLowerCase();
    if (st.includes("student")) saleTypeCategory = "student";
  }

  const hasAllFinance = Array.isArray(raw.productPayments)
    ? raw.productPayments.some((p: any) => p?.productName === "ALL_FINANCE_EMPLOYEMENT")
    : false;

  const hasTutionFees = Array.isArray(raw.productPayments)
    ? raw.productPayments.some(
        (p: any) =>
          p?.productName === "TUTION_FEES" && p?.entity?.tutionFeesStatus === "paid"
      )
    : false;

  const tuitionDepositDates: string[] = [];
  if (Array.isArray(raw.productPayments)) {
    for (const p of raw.productPayments) {
      if (p?.productName !== "TUTION_FEES" || p?.entity?.tutionFeesStatus !== "paid") continue;
      const d = p?.entity?.feeDate;
      if (d != null && String(d).trim() !== "") {
        tuitionDepositDates.push(String(d));
      }
    }
  }

  const hasOtherProduct =
    !hasAllFinance &&
    !hasTutionFees &&
    Array.isArray(raw.productPayments) &&
    raw.productPayments.some((p: any) => !!p?.productName);

  // Friendly labels of the products this client actually has (for the row chips).
  // TRV products show their specific type (Work Permit Ext. / Study Permit Ext. / etc.)
  // so users can tell them apart.
  const products: string[] = Array.isArray(raw.productPayments)
    ? Array.from(
        new Set(
          raw.productPayments
            .map((p: any) => {
              if (!p?.productName) return null;
              if (p.productName === TRV_PRODUCT) {
                return p?.entity?.type ? String(p.entity.type) : "TRV / Work Permit";
              }
              return PRODUCT_LABELS[p.productName] ?? String(p.productName);
            })
            .filter((x: string | null): x is string => x != null)
        )
      )
    : [];

  const studentApplicationDates: string[] = [];
  if (Array.isArray(raw.studentApplications)) {
    for (const app of raw.studentApplications) {
      const d = app?.applicationDate ?? app?.application_date;
      if (d != null && String(d).trim() !== "") {
        studentApplicationDates.push(String(d));
      }
    }
  }

  const hasStudentApplication =
    studentApplicationDates.length > 0 ||
    !!raw.studentAppSaleType ||
    (Array.isArray(raw.studentApplications) && raw.studentApplications.length > 0) ||
    (typeof raw.studentApplicationsCount === "number" && raw.studentApplicationsCount > 0);

  let resolvedSalesType = raw.salesType || raw.saleType?.saleType || raw.sales_type || "";
  if (!resolvedSalesType && Array.isArray(raw.payments)) {
    const pwSaleType = raw.payments.find((p: any) => p?.saleType?.saleType);
    if (pwSaleType?.saleType?.saleType) {
      resolvedSalesType = pwSaleType.saleType.saleType;
    }
  }
  if (!resolvedSalesType && raw.studentAppSaleType?.saleType) {
    resolvedSalesType = raw.studentAppSaleType.saleType;
  }
  if (!resolvedSalesType) resolvedSalesType = "Only Products";

  const counsellorId =
    raw.counsellor?.id != null
      ? Number(raw.counsellor.id)
      : fallbackCounsellorId;

  return {
    id: String(id),
    name: raw.name || raw.fullName || raw.full_name || "",
    isTransferred:
      raw.transferStatus === true ||
      raw.transferedToCounsellorId != null ||
      raw.transferredToCounsellorId != null,
    counsellor: raw.counsellor?.name || fallbackCounsellorName,
    counsellorId,
    enrollmentDate: raw.enrollmentDate || raw.enrollment_date || "",
    salesType: resolvedSalesType,
    saleTypeCategory: saleTypeCategory ? saleTypeCategory.toLowerCase() : null,
    hasAllFinance,
    hasOtherProduct,
    hasTutionFees,
    hasStudentApplication,
    studentApplicationDates,
    tuitionDepositDates,
    stage,
    paidStages,
    products,
    totalPayment,
    amountReceived,
    amountPending,
  };
}

function collectClientsFromApiData(
  data: unknown,
  fallbackCounsellorId: number | null
): { rows: AllCounsellorClientRow[]; productPaymentsById: Map<string, any[]> } {
  const rows: AllCounsellorClientRow[] = [];
  const productPaymentsById = new Map<string, any[]>();

  const pushRaw = (raw: any, counsellorName: string, counsellorId: number | null) => {
    const row = mapRawToRow(raw, counsellorName, counsellorId ?? fallbackCounsellorId);
    if (!row) return;
    rows.push(row);
    if (Array.isArray(raw.productPayments)) {
      productPaymentsById.set(row.id, raw.productPayments);
    }
  };

  if (!data) return { rows, productPaymentsById };

  if (Array.isArray(data)) {
    data.forEach((raw) => pushRaw(raw, raw.counsellor?.name || "Unknown", raw.counsellor?.id ?? fallbackCounsellorId));
    return { rows, productPaymentsById };
  }

  if (typeof data !== "object") return { rows, productPaymentsById };

  const record = data as Record<string, unknown>;

  if (isYearMonthStructure(record)) {
    flattenYearMonthClients(record).forEach((raw) =>
      pushRaw(raw, raw.counsellor?.name || "Unknown", raw.counsellor?.id ?? fallbackCounsellorId)
    );
    return { rows, productPaymentsById };
  }

  if (isCounsellorFirstStructure(record)) {
    Object.keys(record).forEach((key) => {
      const bucket = record[key] as any;
      if (!bucket || typeof bucket !== "object") return;

      const counsellorName =
        bucket.counsellor?.name ||
        bucket.counsellor?.fullName ||
        bucket.counsellor?.fullname ||
        "Unknown";
      const bucketCounsellorId =
        bucket.counsellor?.id != null ? Number(bucket.counsellor.id) : Number(key) || null;

      const rawClients = bucket.clients ? flattenYearMonthClients(bucket.clients) : [];
      rawClients.forEach((raw) => pushRaw(raw, counsellorName, bucketCounsellorId));
    });
  }

  return { rows, productPaymentsById };
}

export default function AllCounsellorClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pathname, setLocation] = useLocation();
  const searchStr = useSearch();
  const [clientToArchive, setClientToArchive] = useState<AllCounsellorClientRow | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const mergeQuery = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchStr);
      mutate(p);
      const qs = p.toString();
      setLocation(qs ? `${pathname}?${qs}` : pathname, { replace: true });
    },
    [pathname, searchStr, setLocation]
  );

  const urlParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const search = urlParams.get("q") ?? "";
  const stageParam = urlParams.get("stage") ?? "";
  const productParam = urlParams.get("product") ?? "";
  const stageFilter = parseStageParam(stageParam);
  const clientTypeFilter = parseClientTypeParam(urlParams.get("clientType"));
  const paymentFilter = parsePaymentFilterParam(urlParams.get("payment"));
  const productFilter = parseProductFilterParam(productParam);
  const fromDate = urlParams.get("from") ?? "";
  const toDate = urlParams.get("to") ?? "";
  const counsellorIdParam = urlParams.get("counsellorId");

  const dashboardPeriodMs = useMemo(() => {
    const fromMs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toMs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;
    return { fromMs, toMs };
  }, [fromDate, toDate]);

  const isCounsellor = user?.role === "counsellor";
  const loggedInCounsellorId = user?.id != null ? Number(user.id) : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["all-counsellor-clients-direct", isCounsellor ? loggedInCounsellorId : "admin"],
    queryFn: clientService.getClients,
    staleTime: 60 * 1000,
  });

  const { rows: allRows, productPaymentsById } = useMemo(
    () => collectClientsFromApiData(data, loggedInCounsellorId),
    [data, loggedInCounsellorId]
  );

  const { data: counsellorsList = [] } = useQuery({
    queryKey: ["counsellors-for-client-list"],
    queryFn: () => clientService.getCounsellors(),
    staleTime: 5 * 60 * 1000,
  });

  const counsellorNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of counsellorsList) {
      const id = c?.id != null ? Number(c.id) : null;
      if (id == null || Number.isNaN(id)) continue;
      const name = c.fullName ?? c.full_name ?? c.name ?? `Counsellor #${id}`;
      map.set(id, name);
    }
    for (const row of allRows ?? []) {
      if (row.counsellorId != null && row.counsellor) {
        map.set(row.counsellorId, row.counsellor);
      }
    }
    return map;
  }, [counsellorsList, allRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toMs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;

    const targetCounsellorId = counsellorIdParam ? Number(counsellorIdParam) : null;

    return (allRows ?? []).filter((row) => {
      const matchSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.counsellor.toLowerCase().includes(q) ||
        row.salesType.toLowerCase().includes(q);

      // When "Has Pending" is selected together with a stage, the stage filter
      // means "this stage's payment is still MISSING" (e.g. enrolled + paid Initial
      // but Before Visa payment not done yet). Otherwise the stage filter keeps its
      // normal meaning: clients whose current stage matches.
      const stage = normalizeStage(row.stage);
      const stageKeyMap: Record<string, string> = {
        initial: "INITIAL",
        before: "BEFORE_VISA",
        after: "AFTER_VISA",
      };
      const pendingStageMode = paymentFilter === "pending-only" && stageFilter.length > 0;
      const matchStage = (() => {
        if (stageFilter.length === 0) return true;
        if (pendingStageMode) {
          // Must be enrolled (has at least one payment entry) and be MISSING
          // the payment entry for at least one selected stage.
          if (row.paidStages.length === 0) return false;
          return stageFilter.some((sf) => {
            const key = stageKeyMap[sf];
            return key ? !row.paidStages.includes(key) : false;
          });
        }
        return (
          (stage === "Initial" && stageFilter.includes("initial")) ||
          (stage === "Before Visa" && stageFilter.includes("before")) ||
          (stage === "After Visa" && stageFilter.includes("after"))
        );
      })();

      const cat = row.saleTypeCategory ?? "";
      // When no date range (direct page access, not from dashboard), skip date-based checks
      const hasDates = fromMs != null && toMs != null;
      const firstAppInDashboardRange = isFirstApplicationInDashboardRange(row, fromMs, toMs);
      const isStudentSaleOnly =
        isStudentSaleTypeInEnrollmentRange(row, fromMs, toMs) &&
        !row.hasStudentApplication &&
        !row.hasTutionFees;

      const productPayments = productPaymentsById.get(row.id);
      const tdInRange = hasDates
        ? hasTutionFeesInRange(productPayments, fromMs!, toMs!)
        : row.hasTutionFees;

      const matchClientType =
        clientTypeFilter === "all" ||
        (clientTypeFilter === "student" &&
          matchesStudentDashboardCardFilter(row, productPayments, fromMs, toMs)) ||
        (clientTypeFilter === "student-core" &&
          (hasDates
            ? isStudentCoreInDashboardRange(row, productPayments, fromMs, toMs)
            : row.hasStudentApplication && row.hasTutionFees)) ||
        (clientTypeFilter === "student-app" &&
          (hasDates ? firstAppInDashboardRange : row.hasStudentApplication)) ||
        (clientTypeFilter === "student-td" && tdInRange) ||
        (clientTypeFilter === "student-no-td" &&
          (hasDates
            ? firstAppInDashboardRange && !tdInRange
            : row.hasStudentApplication && !row.hasTutionFees)) ||
        (clientTypeFilter === "student-sale-only" && isStudentSaleOnly) ||
        (clientTypeFilter === "core" && (cat === "visitor" || cat === "spouse")) ||
        (clientTypeFilter === "visitor" && cat === "visitor") ||
        (clientTypeFilter === "spouse" && cat === "spouse") ||
        (clientTypeFilter === "core-product" && row.hasAllFinance) ||
        (clientTypeFilter === "other-product" && row.hasOtherProduct) ||
        (clientTypeFilter === "pending" && row.amountPending > 0);

      const matchDate = matchesDashboardDateFilter(
        clientTypeFilter,
        row,
        productPaymentsById.get(row.id),
        fromMs,
        toMs
      );

      const matchCounsellor = (() => {
        if (targetCounsellorId != null && !Number.isNaN(targetCounsellorId)) {
          return row.counsellorId === targetCounsellorId;
        }
        if (isCounsellor && loggedInCounsellorId != null) {
          return row.counsellorId == null || row.counsellorId === loggedInCounsellorId;
        }
        return true;
      })();

      // "enrolled" = client has at least one core payment entry.
      const enrolled = row.paidStages.length > 0;

      // Match product. In "Has Pending" mode the product filter flips to
      // "this product's payment entry is MISSING" (no entry at all — if even one
      // partial-payment entry exists, the client is excluded). Otherwise it keeps
      // its normal meaning: client HAS the selected product.
      const matchProduct = (() => {
        if (productFilter.length === 0) return true;
        const payments = productPaymentsById.get(row.id) ?? [];
        if (paymentFilter === "pending-only") {
          // "Missing" mode — EVERY selected product's entry must be absent.
          return productFilter.every((pf) => {
            const matcher = PRODUCT_MATCHERS[pf];
            return matcher ? !payments.some(matcher) : false;
          });
        }
        if (paymentFilter === "fully-paid") {
          // "Paid" mode — EVERY selected product must have an entry that is fully paid.
          return productFilter.every((pf) => {
            const matcher = PRODUCT_MATCHERS[pf];
            if (!matcher) return false;
            const matched = payments.filter(matcher);
            return matched.length > 0 && matched.every((p) => p?.paymentStatus !== "Pending");
          });
        }
        // "All" — client must HAVE every selected product (entry exists, any status).
        return productFilter.every((pf) => {
          const matcher = PRODUCT_MATCHERS[pf];
          return matcher ? payments.some(matcher) : false;
        });
      })();

      // Match payment. When "Has Pending" is combined with a stage and/or product,
      // the "pending" meaning is delegated to the missing stage/product checks above
      // (we just require the client to be enrolled). Plain "Has Pending" = core pending.
      const matchPayment = (() => {
        if (paymentFilter === "all") return true;
        if (paymentFilter === "fully-paid") {
          // With a product selected, "fully paid" refers to that product and is fully
          // handled in matchProduct (works for "Only Products" clients with no core
          // payment too). Otherwise it means the core payment is fully paid.
          if (productFilter.length > 0) return true;
          return row.amountPending === 0 && row.amountReceived > 0;
        }
        // pending-only
        if (productFilter.length > 0) {
          // Product "missing" check is handled in matchProduct — no core requirement.
          return true;
        }
        if (stageFilter.length > 0) {
          // "Missing stage" needs the client to actually be enrolled (have a payment).
          return enrolled;
        }
        return row.amountPending > 0;
      })();

      return matchSearch && matchStage && matchClientType && matchDate && matchCounsellor && matchPayment && matchProduct;
    });
  }, [
    allRows,
    productPaymentsById,
    search,
    stageParam,
    clientTypeFilter,
    paymentFilter,
    productParam,
    fromDate,
    toDate,
    counsellorIdParam,
    isCounsellor,
    loggedInCounsellorId,
  ]);

  const coreProductContext = useMemo(() => {
    if (clientTypeFilter !== "core-product") {
      return { viewingCounsellorId: null as number | null, fromMs: null as number | null, toMs: null as number | null };
    }
    const fromMs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toMs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;
    const targetCounsellorId = counsellorIdParam ? Number(counsellorIdParam) : null;
    const viewingCounsellorId =
      targetCounsellorId != null && !Number.isNaN(targetCounsellorId)
        ? targetCounsellorId
        : isCounsellor && loggedInCounsellorId != null
          ? loggedInCounsellorId
          : null;
    return { viewingCounsellorId, fromMs, toMs };
  }, [clientTypeFilter, fromDate, toDate, counsellorIdParam, isCounsellor, loggedInCounsellorId]);

  const coreProductHandlerIds = useMemo(
    () =>
      collectCoreProductHandlerIds(
        filteredRows,
        productPaymentsById,
        coreProductContext.viewingCounsellorId,
        coreProductContext.fromMs,
        coreProductContext.toMs
      ),
    [filteredRows, productPaymentsById, coreProductContext]
  );

  const { data: resolvedHandlerNames = {} } = useQuery({
    queryKey: ["user-display-names", coreProductHandlerIds.slice().sort((a, b) => a - b).join(",")],
    queryFn: () => clientService.getUserDisplayNames(coreProductHandlerIds),
    enabled: coreProductHandlerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const displayRows = useMemo(() => {
    if (clientTypeFilter !== "core-product") return filteredRows;

    const { viewingCounsellorId, fromMs, toMs } = coreProductContext;
    const nameMap = new Map(counsellorNameById);
    for (const [idStr, name] of Object.entries(resolvedHandlerNames)) {
      const id = Number(idStr);
      if (Number.isFinite(id)) nameMap.set(id, name);
    }

    return filteredRows.map((row) => {
      const handler = resolveCoreProductHandlerInRange(
        productPaymentsById.get(row.id),
        row.counsellorId,
        viewingCounsellorId,
        fromMs,
        toMs,
        nameMap
      );
      if (!handler) return row;
      return { ...row, coreProductHandledBy: handler };
    });
  }, [
    filteredRows,
    clientTypeFilter,
    coreProductContext,
    productPaymentsById,
    counsellorNameById,
    resolvedHandlerNames,
  ]);

  const counsellorNameLabel = useMemo(() => {
    if (!counsellorIdParam) return null;
    const id = Number(counsellorIdParam);
    if (Number.isNaN(id)) return null;
    const found = allRows.find((r) => r.counsellorId === id);
    return found?.counsellor ?? `Counsellor #${id}`;
  }, [counsellorIdParam, allRows]);

  const dateRangeLabel = useMemo(() => {
    if (clientTypeFilter === "pending") return null;
    if (!fromDate || !toDate) return null;
    try {
      const from = format(parseISO(fromDate), "d MMM yyyy");
      const to = format(parseISO(toDate), "d MMM yyyy");
      return from === to ? from : `${from} – ${to}`;
    } catch {
      return null;
    }
  }, [fromDate, toDate, clientTypeFilter]);

  return (
    <PageWrapper
      title="All Counsellor Clients"
      breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "All Counsellor Clients" }]}
    >
      <div className="space-y-4">
        {(counsellorNameLabel || dateRangeLabel || clientTypeFilter === "pending") && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-foreground">
            {clientTypeFilter === "pending" && (
              <span>
                <span className="font-medium text-yellow-600">Filter:</span> Clients with pending payments (
                {filteredRows.length} found)
              </span>
            )}
            {counsellorNameLabel && (
              <span>
                <span className="font-medium text-primary">Counsellor:</span> {counsellorNameLabel}
              </span>
            )}
            {dateRangeLabel && (
              <span>
                <span className="font-medium text-primary">Date:</span> {dateRangeLabel}
              </span>
            )}
            <button
              className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() =>
                mergeQuery((p) => {
                  p.delete("from");
                  p.delete("to");
                  p.delete("counsellorId");
                  p.delete("clientType");
                })
              }
            >
              Clear all filters
            </button>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load clients. Please try again.
          </div>
        )}

        {isLoading ? (
          <AllCounsellorClientsSkeleton />
        ) : (
          <AllCounsellorClientsList
            data={displayRows}
            search={search}
            onSearchChange={(v) => {
              mergeQuery((p) => {
                if (v.trim()) p.set("q", v);
                else p.delete("q");
              });
            }}
            stageFilter={stageFilter}
            onStageFilterChange={(v) => {
              mergeQuery((p) => {
                if (v.length > 0) p.set("stage", v.join(","));
                else p.delete("stage");
              });
            }}
            clientTypeFilter={clientTypeFilter}
            onClientTypeFilterChange={(v) => {
              mergeQuery((p) => {
                if (v && v !== "all") p.set("clientType", v);
                else p.delete("clientType");
                // Clear dashboard date range when manually changing filter
                p.delete("from");
                p.delete("to");
              });
            }}
            paymentFilter={paymentFilter}
            onPaymentFilterChange={(v) => {
              mergeQuery((p) => {
                if (v && v !== "all") p.set("payment", v);
                else p.delete("payment");
              });
            }}
            productFilter={productFilter}
            onProductFilterChange={(v) => {
              mergeQuery((p) => {
                if (v.length > 0) p.set("product", v.join(","));
                else p.delete("product");
              });
            }}
            onView={(id) => {
              const ret = searchStr ? `${pathname}?${searchStr}` : pathname;
              sessionStorage.setItem("client_list_return_path", ret);
              sessionStorage.removeItem("client_list_return_counsellor_name");
              setLocation(`/clients/${id}/view`);
            }}
            onEdit={(id) => {
              const ret = searchStr ? `${pathname}?${searchStr}` : pathname;
              sessionStorage.setItem("client_list_return_path", ret);
              sessionStorage.removeItem("client_list_return_counsellor_name");
              setLocation(`/clients/${id}/edit`);
            }}
            onArchive={(id) => {
              const row = displayRows.find((r) => r.id === id) ?? null;
              setClientToArchive(row);
            }}
            periodFromMs={dashboardPeriodMs.fromMs}
            periodToMs={dashboardPeriodMs.toMs}
            dateColumnMode={getDateColumnMode(clientTypeFilter)}
          />
        )}
      </div>

      <AlertDialog open={!!clientToArchive} onOpenChange={(open) => { if (!open) setClientToArchive(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{clientToArchive?.name}</strong>? They will be hidden from active lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isArchiving}
              onClick={async () => {
                if (!clientToArchive) return;
                setIsArchiving(true);
                try {
                  await clientService.archiveClient(Number(clientToArchive.id), true);
                  toast({ title: "Client Archived", description: `${clientToArchive.name} has been archived.` });
                  queryClient.invalidateQueries({ queryKey: ["all-counsellor-clients-direct"] });
                  setClientToArchive(null);
                } catch (err: any) {
                  toast({ variant: "destructive", title: "Archive Failed", description: err?.response?.data?.message || err?.message || "Failed to archive client." });
                } finally {
                  setIsArchiving(false);
                }
              }}
            >
              {isArchiving ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
