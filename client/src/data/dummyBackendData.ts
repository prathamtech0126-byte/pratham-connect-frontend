import { differenceInCalendarDays, format, isSameMonth, parseISO, subMonths } from "date-fns";

/**
 * TEMPORARY dummy data for the Backend / Visa Case features.
 *
 * This is the single source of truth for BOTH:
 *   - the Visa Cases list page  (pages/Bakend Team/Backend Team/BK_Clients.tsx)
 *   - the Backend Dashboard      (pages/Dashboard/BackendDashboard.tsx)
 *
 * Add / edit a case in DUMMY_BACKEND_CLIENTS below and it will automatically
 * appear in the list AND roll up into every dashboard widget (counts, rates,
 * financial summary, trends, decision table, highlights).
 *
 * When the real API is ready, replace DUMMY_BACKEND_CLIENTS with the API
 * response and keep using computeBackendDashboardData() for the aggregates.
 */

/* ---------- option lists (used by filters, edit selects, and aggregation) ---------- */

export const BACKEND_DESTINATIONS = ["Canada", "UK", "USA", "Australia", "Schengen", "South Korea", "Japan"];
export const BACKEND_SPONSORS = ["Son", "Daughter", "Brother", "Sister", "Friend", "Self-Sponsored"];
export const BACKEND_TRAVEL_REASONS = ["Tourism", "Family Visit", "Business Visit", "Convocation", "Wedding", "Medical", "Other"];
export const BACKEND_DECISIONS = ["Pending", "Approved", "Refused", "Withdrawn"];

// Sale type (product category) a case was sold under.
export const BACKEND_SALE_TYPES = ["Visitor", "Spouse", "Student"];

// High-level pipeline stages (used by the dashboard "Cases by Stage" funnel).
export const BACKEND_STAGES = ["Documentation", "Financial Assessment", "Case Preparation", "Filing Preparation", "Submission"];

// Detailed processing sub-statuses, grouped under each stage. A case's `status`
// holds one of these full strings (e.g. "Documentation: Checklist Shared"); the
// high-level stage is the part before the colon (see stageOfStatus()).
export const BACKEND_PROCESSING_STATUS_GROUPS: { stage: string; statuses: string[] }[] = [
  {
    stage: "Documentation",
    statuses: [
      "Documentation: Checklist Shared",
      "Documentation: Partially Received",
      "Documentation: Fully Received",
      "Documentation: Additional Documents Requested",
    ],
  },
  {
    stage: "Financial Assessment",
    statuses: [
      "Financial Assessment: Review Pending",
      "Financial Assessment: Under Review",
      "Financial Assessment: Approved",
      "Financial Assessment: Documents Pending",
    ],
  },
  {
    stage: "Case Preparation",
    statuses: [
      "Case Preparation: Profile Assessment Completed",
      "Case Preparation: SOP / Cover Letter Under Preparation",
      "Case Preparation: SOP / Cover Letter Review",
      "Case Preparation: SOP Approved by Client",
    ],
  },
  {
    stage: "Filing Preparation",
    statuses: [
      "Filing Preparation: Application Form Filling",
      "Filing Preparation: Application Review Pending",
      "Filing Preparation: Ready to File",
    ],
  },
  {
    stage: "Submission",
    statuses: ["Submission: File Submitted"],
  },
];

// Flat list of all detailed statuses.
export const BACKEND_PROCESSING_STATUSES = BACKEND_PROCESSING_STATUS_GROUPS.flatMap((g) => g.statuses);

// Derive the high-level stage from a detailed status ("Documentation: Checklist Shared" → "Documentation").
export const stageOfStatus = (status: string) => (status.split(":")[0] || "").trim();

/* ---------- types ---------- */

export interface VisaClient {
  id: string;
  name: string;
  passport: string;
  destination: string;
  travelReason: string;
  sponsor: string;
  status: string; // processing stage (one of BACKEND_STAGES)
  decision: string; // one of BACKEND_DECISIONS
  saleType: string; // one of BACKEND_SALE_TYPES (Visitor / Spouse / Student)
  enrollmentDate: string; // YYYY-MM-DD
  counsellor: string;
  handledBy: string; // backend team member who last acted on this case

  // Live assignment (from the visa-case API). `handledBy` keeps the team label
  // for the dashboard leaderboard; these carry the assigned individual so the
  // Backend Clients list can show the assignee and offer (re)assignment.
  visaCaseId?: string;
  assignedUserId?: number | null;
  assignedUserName?: string | null;
  assignedTeam?: string | null;
  // Raw processing sub-status enum (e.g. "CHECKLIST_SHARED") — drives the
  // Change Status picker / PATCH payload.
  subStatus?: string;

  // Financials
  totalCharges: number;
  initialReceived: number;
  beforeVisaCharges: number;
  financeCharges: number;
  balanceDue: number;

  // Accompanying members travelling with the applicant
  accompanyingMembers: number;

  // Optional milestone dates → drive "Processing Times" averages
  submittedOn?: string | null; // YYYY-MM-DD
  decidedOn?: string | null; // YYYY-MM-DD
}

export interface BackendDashboardData {
  totalClients: number;
  approvalRate: number | null;
  outstandingBalance: number;

  caseOutcomes: {
    totalEnrolled: number;
    approved: number;
    refused: number;
    withdrawn: number;
    pending: number;
    filesSubmitted: number;
    approvalRate: number | null;
    refusalRate: number | null;
  };

  byDestination: { name: string; count: number }[];
  bySponsor: { name: string; count: number }[];
  byTravelReason: { name: string; count: number }[];
  casesByStage: { name: string; count: number }[];

  // Breakdown per sale type (Visitor / Spouse / Student) for the KPI + outcome cards.
  bySaleType: {
    type: string;
    total: number;
    approved: number;
    refused: number;
    withdrawn: number;
    pending: number;
    filesSubmitted: number;
    approvalRate: number | null;
    outstandingBalance: number;
  }[];

  financial: {
    totalCharges: number;
    initialReceived: number;
    beforeVisaCharges: number;
    financeCharges: number;
    totalBalanceDue: number;
    collectionPct: number | null;
    avgChargePerClient: number;
    clientsFullyPaid: number;
    clientsWithBalance: number;
  };

  processingTimes: {
    enrollmentToSubmission: number | null;
    submissionToDecision: number | null;
    enrollmentToDecision: number | null;
  };

  accompanying: {
    totalMembers: number;
    avgPerCase: number | null;
    casesWithAccompanying: number;
  };

  highlights: {
    topDestination: string;
    topTravelReason: string;
    topSponsorType: string;
  };

  decisionByDestination: {
    name: string;
    approved: number;
    refused: number;
    withdrawn: number;
    pending: number;
    total: number;
  }[];

  enrollmentTrend: { month: string; enrollments: number }[];
}

/* ------------------------------------------------------------------ */
/* The dummy cases — EDIT / ADD ROWS HERE                              */
/* (balanceDue is normally totalCharges − initialReceived)            */
/* ------------------------------------------------------------------ */

/**
 * Rows below use REAL identity + financials sourced from the production DB
 * (clients + payments tables): `id`, `name`, `passport`, `enrollmentDate`,
 * `counsellor` (mapped from counsellor_id), `totalCharges`, `initialReceived`.
 *
 * The remaining fields — `destination`, `travelReason`, `sponsor`, `status`,
 * `decision`, `financeCharges`, `balanceDue`, `accompanyingMembers`,
 * `handledBy`, `submittedOn`, `decidedOn` — do NOT exist in the backend yet,
 * so they are populated with plausible DUMMY values until those columns are
 * added. `balanceDue` = totalCharges − initialReceived.
 *
 * counsellor_id → name map (placeholder names):
 *   22 → Karan Shah · 23 → Sarah Jones · 25 → Mike Brown
 *   27 → Rahul Verma · 28 → Neha Patel · 29 → Amit Kumar · 34 → Priya Singh
 */
const RAW_BACKEND_CLIENTS: Omit<VisaClient, "saleType">[] = [
  {
    id: "3", name: "Mujeebur Rahman", passport: "V7503234",
    destination: "Canada", travelReason: "Tourism", sponsor: "Self-Sponsored",
    status: "Documentation: Partially Received", decision: "Pending", enrollmentDate: "2026-01-16", counsellor: "Priya Singh",
    handledBy: "Harsh",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 29500,
    accompanyingMembers: 1,
  },
  {
    id: "4", name: "Mohammad Anas", passport: "V7503235",
    destination: "UK", travelReason: "Family Visit", sponsor: "Brother",
    status: "Documentation: Checklist Shared", decision: "Pending", enrollmentDate: "2026-02-03", counsellor: "Priya Singh",
    handledBy: "Saurav",
    totalCharges: 17700, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 11800,
    accompanyingMembers: 0,
  },
  {
    id: "5", name: "Ramarani Narendrasingh Raghav", passport: "X8947209",
    destination: "Canada", travelReason: "Tourism", sponsor: "Son",
    status: "Financial Assessment: Under Review", decision: "Pending", enrollmentDate: "2026-02-06", counsellor: "Priya Singh",
    handledBy: "Janak",
    totalCharges: 25960, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 20060,
    accompanyingMembers: 2,
  },
  {
    id: "6", name: "Pinkesh Kiritbhai Patel", passport: "C1667376",
    destination: "Canada", travelReason: "Business Visit", sponsor: "Self-Sponsored",
    status: "Case Preparation: SOP / Cover Letter Under Preparation", decision: "Pending", enrollmentDate: "2025-12-23", counsellor: "Priya Singh",
    handledBy: "Sahid",
    totalCharges: 106200, beforeVisaCharges: 0, initialReceived:64900, financeCharges: 0, balanceDue: 41300,
    accompanyingMembers: 0,
  },
  {
    id: "7", name: "Pavan Patel", passport: "A5424564",
    destination: "Schengen", travelReason: "Family Visit", sponsor: "Self-Sponsored",
    status: "Submission: File Submitted", decision: "Approved", enrollmentDate: "2026-01-19", counsellor: "Priya Singh",
    handledBy: "Harsh",
    totalCharges: 59000, beforeVisaCharges: 0, initialReceived:59000, financeCharges: 0, balanceDue: 0,
    accompanyingMembers: 1, submittedOn: "2026-02-18", decidedOn: "2026-03-12",
  },
  {
    id: "8", name: "Krupal Patel", passport: "U8292820",
    destination: "Australia", travelReason: "Tourism", sponsor: "Friend",
    status: "Documentation: Additional Documents Requested", decision: "Pending", enrollmentDate: "2026-02-11", counsellor: "Priya Singh",
    handledBy: "Saurav",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 29500,
    accompanyingMembers: 0,
  },
  {
    id: "9", name: "Pinky Lalwani", passport: "C2959533",
    destination: "Canada", travelReason: "Tourism", sponsor: "Daughter",
    status: "Documentation: Fully Received", decision: "Pending", enrollmentDate: "2026-01-20", counsellor: "Priya Singh",
    handledBy: "Janak",
    totalCharges: 23600, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 17700,
    accompanyingMembers: 1,
  },
  {
    id: "10", name: "Hemali Vallabhdas Kanjaria", passport: "T6369759",
    destination: "Canada", travelReason: "Convocation", sponsor: "Brother",
    status: "Filing Preparation: Application Form Filling", decision: "Pending", enrollmentDate: "2026-01-21", counsellor: "Priya Singh",
    handledBy: "Sahid",
    totalCharges: 70800, beforeVisaCharges: 0, initialReceived:41300, financeCharges: 0, balanceDue: 29500,
    accompanyingMembers: 2,
  },
  {
    id: "11", name: "Sidikaben Vahora", passport: "W0351711",
    destination: "Canada", travelReason: "Tourism", sponsor: "Sister",
    status: "Case Preparation: SOP Approved by Client", decision: "Approved", enrollmentDate: "2026-01-30", counsellor: "Priya Singh",
    handledBy: "Harsh",
    totalCharges: 14160, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 8260,
    accompanyingMembers: 0, decidedOn: "2026-03-05",
  },
  {
    id: "12", name: "Trushaben Patel", passport: "C6565317",
    destination: "UK", travelReason: "Family Visit", sponsor: "Son",
    status: "Documentation: Partially Received", decision: "Pending", enrollmentDate: "2026-01-07", counsellor: "Amit Kumar",
    handledBy: "Saurav",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 29500,
    accompanyingMembers: 1,
  },
  {
    id: "13", name: "Meenalben Manishgar", passport: "C9271519",
    destination: "Schengen", travelReason: "Tourism", sponsor: "Daughter",
    status: "Financial Assessment: Review Pending", decision: "Pending", enrollmentDate: "2026-01-16", counsellor: "Amit Kumar",
    handledBy: "Janak",
    totalCharges: 29500, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 23600,
    accompanyingMembers: 0,
  },
  {
    id: "14", name: "Talat Jahan", passport: "V4072880",
    destination: "Canada", travelReason: "Tourism", sponsor: "Friend",
    status: "Submission: File Submitted", decision: "Refused", enrollmentDate: "2026-01-19", counsellor: "Amit Kumar",
    handledBy: "Sahid",
    totalCharges: 14160, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 8260,
    accompanyingMembers: 0, submittedOn: "2026-02-19", decidedOn: "2026-03-14",
  },
  {
    id: "15", name: "Sejad Vohra", passport: "T5929196",
    destination: "USA", travelReason: "Business Visit", sponsor: "Self-Sponsored",
    status: "Financial Assessment: Under Review", decision: "Pending", enrollmentDate: "2026-02-11", counsellor: "Amit Kumar",
    handledBy: "Harsh",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:0, financeCharges: 0, balanceDue: 35400,
    accompanyingMembers: 0,
  },
  {
    id: "16", name: "Alfiyaben Vohra", passport: "B7530231",
    destination: "Japan", travelReason: "Medical", sponsor: "Sister",
    status: "Documentation: Additional Documents Requested", decision: "Withdrawn", enrollmentDate: "2026-02-11", counsellor: "Amit Kumar",
    handledBy: "Janak",
    totalCharges: 30000, beforeVisaCharges: 0, initialReceived:0, financeCharges: 0, balanceDue: 30000,
    accompanyingMembers: 1, decidedOn: "2026-02-25",
  },
  {
    id: "17", name: "Priyank Patel", passport: "B6644699",
    destination: "South Korea", travelReason: "Wedding", sponsor: "Brother",
    status: "Case Preparation: SOP Approved by Client", decision: "Approved", enrollmentDate: "2026-01-21", counsellor: "Amit Kumar",
    handledBy: "Sahid",
    totalCharges: 94400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 88500,
    accompanyingMembers: 3, decidedOn: "2026-03-01",
  },
  {
    id: "18", name: "Paras Sawani", passport: "Ai160503",
    destination: "Canada", travelReason: "Tourism", sponsor: "Self-Sponsored",
    status: "Documentation: Fully Received", decision: "Pending", enrollmentDate: "2026-01-29", counsellor: "Amit Kumar",
    handledBy: "Harsh",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 29500,
    accompanyingMembers: 2,
  },
  {
    id: "19", name: "Vivek Ajudiya", passport: "B7925431",
    destination: "UK", travelReason: "Family Visit", sponsor: "Son",
    status: "Financial Assessment: Approved", decision: "Pending", enrollmentDate: "2026-02-02", counsellor: "Amit Kumar",
    handledBy: "Saurav",
    totalCharges: 94400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 88500,
    accompanyingMembers: 1,
  },
  {
    id: "20", name: "Tenzin Kunsen", passport: "Y0118217",
    destination: "Australia", travelReason: "Business Visit", sponsor: "Self-Sponsored",
    status: "Submission: File Submitted", decision: "Approved", enrollmentDate: "2026-02-11", counsellor: "Amit Kumar",
    handledBy: "Janak",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 29500,
    accompanyingMembers: 0, submittedOn: "2026-03-01", decidedOn: "2026-03-20",
  },
  {
    id: "21", name: "Ramiz Belim", passport: "X4362659",
    destination: "Schengen", travelReason: "Tourism", sponsor: "Husband",
    status: "Case Preparation: SOP / Cover Letter Review", decision: "Pending", enrollmentDate: "2026-02-12", counsellor: "Amit Kumar",
    handledBy: "Sahid",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 29500,
    accompanyingMembers: 0,
  },
  {
    id: "23", name: "SHRISHTI GANDHI", passport: "U4503299",
    destination: "Canada", travelReason: "Convocation", sponsor: "Daughter",
    status: "Documentation: Fully Received", decision: "Pending", enrollmentDate: "2026-01-28", counsellor: "Sarah Jones",
    handledBy: "Saurav",
    totalCharges: 23600, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 17700,
    accompanyingMembers: 2,
  },
  {
    id: "24", name: "Hani Mansoor Hussein", passport: "14082383",
    destination: "Canada", travelReason: "Business Visit", sponsor: "Self-Sponsored",
    status: "Submission: File Submitted", decision: "Approved", enrollmentDate: "2025-12-04", counsellor: "Rahul Verma",
    handledBy: "Janak",
    totalCharges: 21240, beforeVisaCharges: 0, initialReceived:21240, financeCharges: 0, balanceDue: 0,
    accompanyingMembers: 0, submittedOn: "2026-01-05", decidedOn: "2026-01-28",
  },
  {
    id: "25", name: "Husenbhai Asgarbhai Tinwala", passport: "U0465813",
    destination: "Canada", travelReason: "Tourism", sponsor: "Friend",
    status: "Documentation: Checklist Shared", decision: "Pending", enrollmentDate: "2026-02-13", counsellor: "Rahul Verma",
    handledBy: "Sahid",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:0, financeCharges: 0, balanceDue: 35400,
    accompanyingMembers: 1,
  },
  {
    id: "26", name: "Daud Mahmadbhai Patel", passport: "WO434644",
    destination: "Canada", travelReason: "Family Visit", sponsor: "Brother",
    status: "Financial Assessment: Under Review", decision: "Pending", enrollmentDate: "2025-12-06", counsellor: "Rahul Verma",
    handledBy: "Harsh",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:11800, financeCharges: 0, balanceDue: 23600,
    accompanyingMembers: 0,
  },
  {
    id: "27", name: "NehabenBabubhai Solanki", passport: "C7132782",
    destination: "USA", travelReason: "Business Visit", sponsor: "Self-Sponsored",
    status: "Submission: File Submitted", decision: "Approved", enrollmentDate: "2026-01-30", counsellor: "Mike Brown",
    handledBy: "Saurav",
    totalCharges: 23600, beforeVisaCharges: 0, initialReceived:23600, financeCharges: 0, balanceDue: 0,
    accompanyingMembers: 0, submittedOn: "2026-02-20", decidedOn: "2026-03-15",
  },
  {
    id: "28", name: "Axitakumari Vishalkumar Ahir", passport: "Y9761359",
    destination: "South Korea", travelReason: "Wedding", sponsor: "Sister",
    status: "Case Preparation: Profile Assessment Completed", decision: "Pending", enrollmentDate: "2026-02-13", counsellor: "Rahul Verma",
    handledBy: "Janak",
    totalCharges: 40000, beforeVisaCharges: 0, initialReceived:0, financeCharges: 0, balanceDue: 40000,
    accompanyingMembers: 2,
  },
  {
    id: "29", name: "PankajVishabhai Patel", passport: "W8444371",
    destination: "Canada", travelReason: "Tourism", sponsor: "Self-Sponsored",
    status: "Filing Preparation: Ready to File", decision: "Pending", enrollmentDate: "2026-01-30", counsellor: "Mike Brown",
    handledBy: "Sahid",
    totalCharges: 41300, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 35400,
    accompanyingMembers: 1,
  },
  {
    id: "30", name: "Mahima Purohit", passport: "R6141584",
    destination: "UK", travelReason: "Family Visit", sponsor: "Son",
    status: "Documentation: Partially Received", decision: "Pending", enrollmentDate: "2026-02-13", counsellor: "Rahul Verma",
    handledBy: "Harsh",
    totalCharges: 45000, beforeVisaCharges: 0, initialReceived:0, financeCharges: 0, balanceDue: 45000,
    accompanyingMembers: 0,
  },
  {
    id: "31", name: "Nazmin Vohra", passport: "B7863795",
    destination: "Canada", travelReason: "Tourism", sponsor: "Daughter",
    status: "Case Preparation: SOP / Cover Letter Under Preparation", decision: "Pending", enrollmentDate: "2026-01-06", counsellor: "Neha Patel",
    handledBy: "Saurav",
    totalCharges: 70800, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 64900,
    accompanyingMembers: 1,
  },
  {
    id: "32", name: "ARPITKUMAR RATHOD", passport: "T7832800",
    destination: "Canada", travelReason: "Tourism", sponsor: "Self-Sponsored",
    status: "Documentation: Fully Received", decision: "Pending", enrollmentDate: "2026-02-02", counsellor: "Karan Shah",
    handledBy: "Janak",
    totalCharges: 14160, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 8260,
    accompanyingMembers: 0,
  },
  {
    id: "34", name: "DHRUVIBEN KUKADIYA", passport: "B8414130",
    destination: "Australia", travelReason: "Family Visit", sponsor: "Brother",
    status: "Submission: File Submitted", decision: "Approved", enrollmentDate: "2026-02-05", counsellor: "Karan Shah",
    handledBy: "Sahid",
    totalCharges: 14160, beforeVisaCharges: 0, initialReceived:14160, financeCharges: 0, balanceDue: 0,
    accompanyingMembers: 2, submittedOn: "2026-02-25", decidedOn: "2026-03-18",
  },
  {
    id: "35", name: "Celin Vijaykumar Makwana", passport: "I0379221",
    destination: "Canada", travelReason: "Convocation", sponsor: "Self-Sponsored",
    status: "Case Preparation: SOP Approved by Client", decision: "Approved", enrollmentDate: "2025-12-18", counsellor: "Rahul Verma",
    handledBy: "Harsh",
    totalCharges: 135700, beforeVisaCharges: 0, initialReceived:29500, financeCharges: 0, balanceDue: 106200,
    accompanyingMembers: 3, decidedOn: "2026-02-10",
  },
  {
    id: "36", name: "Unnatiben Arpitkumar Patel", passport: "T0846164",
    destination: "UK", travelReason: "Tourism", sponsor: "Friend",
    status: "Documentation: Checklist Shared", decision: "Pending", enrollmentDate: "2026-02-14", counsellor: "Rahul Verma",
    handledBy: "Saurav",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:0, financeCharges: 0, balanceDue: 35400,
    accompanyingMembers: 0,
  },
  {
    id: "37", name: "Patel Meghaben Rachitkumar", passport: "S8652329",
    destination: "Schengen", travelReason: "Family Visit", sponsor: "Son",
    status: "Filing Preparation: Application Review Pending", decision: "Pending", enrollmentDate: "2025-12-27", counsellor: "Rahul Verma",
    handledBy: "Janak",
    totalCharges: 11800, beforeVisaCharges: 0, initialReceived:11800, financeCharges: 0, balanceDue: 0,
    accompanyingMembers: 1,
  },
  {
    id: "38", name: "PATEL DIYA PARTH", passport: "X2897776",
    destination: "Canada", travelReason: "Business Visit", sponsor: "Self-Sponsored",
    status: "Financial Assessment: Documents Pending", decision: "Pending", enrollmentDate: "2026-02-06", counsellor: "Karan Shah",
    handledBy: "Sahid",
    totalCharges: 76700, beforeVisaCharges: 0, initialReceived:70800, financeCharges: 0, balanceDue: 5900,
    accompanyingMembers: 0,
  },
  {
    id: "39", name: "Hari Ashokkumar Patel", passport: "U3987619",
    destination: "USA", travelReason: "Business Visit", sponsor: "Self-Sponsored",
    status: "Case Preparation: SOP / Cover Letter Review", decision: "Pending", enrollmentDate: "2026-01-19", counsellor: "Rahul Verma",
    handledBy: "Harsh",
    totalCharges: 82600, beforeVisaCharges: 0, initialReceived:59000, financeCharges: 0, balanceDue: 23600,
    accompanyingMembers: 0,
  },
  {
    id: "40", name: "Shivam Mafatbhai Patel", passport: "R8439592",
    destination: "Canada", travelReason: "Tourism", sponsor: "Self-Sponsored",
    status: "Documentation: Partially Received", decision: "Pending", enrollmentDate: "2026-01-17", counsellor: "Rahul Verma",
    handledBy: "Saurav",
    totalCharges: 70800, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 64900,
    accompanyingMembers: 1,
  },
  {
    id: "41", name: "RUTVI UMESHKUMAR PATEL", passport: "C9027025",
    destination: "Canada", travelReason: "Tourism", sponsor: "Daughter",
    status: "Documentation: Fully Received", decision: "Pending", enrollmentDate: "2026-02-06", counsellor: "Karan Shah",
    handledBy: "Janak",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 29500,
    accompanyingMembers: 0,
  },
  {
    id: "42", name: "ASFAK YUSUF PATEL", passport: "W2617240",
    destination: "UK", travelReason: "Family Visit", sponsor: "Brother",
    status: "Case Preparation: SOP / Cover Letter Under Preparation", decision: "Pending", enrollmentDate: "2026-02-12", counsellor: "Karan Shah",
    handledBy: "Sahid",
    totalCharges: 94400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 88500,
    accompanyingMembers: 2,
  },
  {
    id: "43", name: "KIRTAN KIRITBHAI BRAHMBHATT", passport: "U4150193",
    destination: "Schengen", travelReason: "Tourism", sponsor: "Self-Sponsored",
    status: "Financial Assessment: Review Pending", decision: "Pending", enrollmentDate: "2026-02-12", counsellor: "Karan Shah",
    handledBy: "Harsh",
    totalCharges: 35400, beforeVisaCharges: 0, initialReceived:5900, financeCharges: 0, balanceDue: 29500,
    accompanyingMembers: 0,
  },
  {
    id: "44", name: "Tejas Jayeshbhai Patel", passport: "S2544066",
    destination: "Canada", travelReason: "Business Visit", sponsor: "Self-Sponsored",
    status: "Submission: File Submitted", decision: "Approved", enrollmentDate: "2026-01-23", counsellor: "Rahul Verma",
    handledBy: "Saurav",
    totalCharges: 11800, beforeVisaCharges: 0, initialReceived:11800, financeCharges: 0, balanceDue: 0,
    accompanyingMembers: 1, submittedOn: "2026-02-12", decidedOn: "2026-03-05",
  },
  {
    id: "45", name: "Om Mahendrakumar Patel FIFA", passport: "AF338460",
    destination: "Canada", travelReason: "Other", sponsor: "Self-Sponsored",
    status: "Case Preparation: SOP Approved by Client", decision: "Approved", enrollmentDate: "2026-01-20", counsellor: "Rahul Verma",
    handledBy: "Janak",
    totalCharges: 70800, beforeVisaCharges: 0, initialReceived:55900, financeCharges: 0, balanceDue: 14900,
    accompanyingMembers: 0, decidedOn: "2026-03-10",
  },
];

/**
 * Sale type per case id. `saleType` does not exist in the backend yet, so it is
 * mapped here until the column is added. Defaults to "Visitor" for any unmapped id.
 */
const SALE_TYPE_BY_ID: Record<string, string> = {
  "3": "Visitor", "4": "Spouse", "5": "Visitor", "6": "Visitor", "7": "Visitor",
  "8": "Student", "9": "Spouse", "10": "Student", "11": "Visitor", "12": "Spouse",
  "13": "Visitor", "14": "Visitor", "15": "Student", "16": "Visitor", "17": "Spouse",
  "18": "Visitor", "19": "Spouse", "20": "Student", "21": "Visitor", "23": "Student",
  "24": "Visitor", "25": "Visitor", "26": "Spouse", "27": "Visitor", "28": "Student",
  "29": "Visitor", "30": "Spouse", "31": "Visitor", "32": "Visitor", "34": "Spouse",
  "35": "Student", "36": "Visitor", "37": "Spouse", "38": "Visitor", "39": "Visitor",
  "40": "Visitor", "41": "Visitor", "42": "Spouse", "43": "Visitor", "44": "Visitor",
  "45": "Student",
};

export const DUMMY_BACKEND_CLIENTS: VisaClient[] = RAW_BACKEND_CLIENTS.map((c) => ({
  ...c,
  saleType: SALE_TYPE_BY_ID[c.id] ?? "Visitor",
}));

/* ------------------------------------------------------------------ */
/* Aggregation — turns the case list into dashboard widgets           */
/* ------------------------------------------------------------------ */

const countByKey = (clients: VisaClient[], options: string[], key: keyof VisaClient) =>
  options.map((name) => ({ name, count: clients.filter((c) => c[key] === name).length }));

const avgDays = (pairs: { from?: string | null; to?: string | null }[]): number | null => {
  const diffs = pairs
    .filter((p) => p.from && p.to)
    .map((p) => differenceInCalendarDays(parseISO(p.to as string), parseISO(p.from as string)))
    .filter((n) => !Number.isNaN(n));
  if (diffs.length === 0) return null;
  return Math.round(diffs.reduce((s, n) => s + n, 0) / diffs.length);
};

const topName = (rows: { name: string; count: number }[]): string => {
  const top = rows.reduce((best, r) => (r.count > best.count ? r : best), { name: "", count: 0 });
  return top.count > 0 ? top.name : "—";
};

export function computeBackendDashboardData(clients: VisaClient[]): BackendDashboardData {
  const totalClients = clients.length;

  const approved = clients.filter((c) => c.decision === "Approved").length;
  const refused = clients.filter((c) => c.decision === "Refused").length;
  const withdrawn = clients.filter((c) => c.decision === "Withdrawn").length;
  const pending = clients.filter((c) => c.decision === "Pending").length;
  const filesSubmitted = clients.filter((c) => stageOfStatus(c.status) === "Submission").length;

  const decided = approved + refused;
  const approvalRate = decided > 0 ? (approved / decided) * 100 : null;
  const refusalRate = decided > 0 ? (refused / decided) * 100 : null;

  const totalCharges = clients.reduce((s, c) => s + (c.totalCharges || 0), 0);
  const initialReceived = clients.reduce((s, c) => s + (c.initialReceived || 0), 0);
  const financeCharges = clients.reduce((s, c) => s + (c.financeCharges || 0), 0);
  const totalBalanceDue = clients.reduce((s, c) => s + (c.balanceDue || 0), 0);
  const collected = totalCharges - totalBalanceDue;
  const collectionPct = totalCharges > 0 ? (collected / totalCharges) * 100 : null;

  const totalMembers = clients.reduce((s, c) => s + (c.accompanyingMembers || 0), 0);
  const casesWithAccompanying = clients.filter((c) => (c.accompanyingMembers || 0) > 0).length;

  const bySaleType = BACKEND_SALE_TYPES.map((type) => {
    const rows = clients.filter((c) => c.saleType === type);
    const a = rows.filter((c) => c.decision === "Approved").length;
    const r = rows.filter((c) => c.decision === "Refused").length;
    const dec = a + r;
    return {
      type,
      total: rows.length,
      approved: a,
      refused: r,
      withdrawn: rows.filter((c) => c.decision === "Withdrawn").length,
      pending: rows.filter((c) => c.decision === "Pending").length,
      filesSubmitted: rows.filter((c) => stageOfStatus(c.status) === "Submission").length,
      approvalRate: dec > 0 ? (a / dec) * 100 : null,
      outstandingBalance: rows.reduce((s, c) => s + (c.balanceDue || 0), 0),
    };
  });

  const byDestination = countByKey(clients, BACKEND_DESTINATIONS, "destination");
  const byTravelReason = countByKey(clients, BACKEND_TRAVEL_REASONS, "travelReason");
  const bySponsor = countByKey(clients, BACKEND_SPONSORS, "sponsor");

  const decisionByDestination = BACKEND_DESTINATIONS.map((name) => {
    const rows = clients.filter((c) => c.destination === name);
    return {
      name,
      approved: rows.filter((c) => c.decision === "Approved").length,
      refused: rows.filter((c) => c.decision === "Refused").length,
      withdrawn: rows.filter((c) => c.decision === "Withdrawn").length,
      pending: rows.filter((c) => c.decision === "Pending").length,
      total: rows.length,
    };
  });

  // Last 12 months (oldest → newest)
  const now = new Date();
  const enrollmentTrend = Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(now, 11 - i);
    const enrollments = clients.filter((c) => {
      try {
        return isSameMonth(parseISO(c.enrollmentDate), d);
      } catch {
        return false;
      }
    }).length;
    return { month: format(d, "MMM yyyy"), enrollments };
  });

  return {
    totalClients,
    approvalRate,
    outstandingBalance: totalBalanceDue,
    caseOutcomes: {
      totalEnrolled: totalClients,
      approved,
      refused,
      withdrawn,
      pending,
      filesSubmitted,
      approvalRate,
      refusalRate,
    },
    byDestination,
    bySponsor,
    byTravelReason,
    bySaleType,
    casesByStage: BACKEND_STAGES.map((name) => ({
      name,
      count: clients.filter((c) => stageOfStatus(c.status) === name).length,
    })),
    financial: {
      totalCharges,
      initialReceived,
      financeCharges,
      totalBalanceDue,
      collectionPct,
      avgChargePerClient: totalClients > 0 ? Math.round(totalCharges / totalClients) : 0,
      clientsFullyPaid: clients.filter((c) => (c.balanceDue || 0) <= 0).length,
      clientsWithBalance: clients.filter((c) => (c.balanceDue || 0) > 0).length,
    },
    processingTimes: {
      enrollmentToSubmission: avgDays(clients.map((c) => ({ from: c.enrollmentDate, to: c.submittedOn }))),
      submissionToDecision: avgDays(clients.map((c) => ({ from: c.submittedOn, to: c.decidedOn }))),
      enrollmentToDecision: avgDays(clients.map((c) => ({ from: c.enrollmentDate, to: c.decidedOn }))),
    },
    accompanying: {
      totalMembers,
      avgPerCase: totalClients > 0 ? totalMembers / totalClients : null,
      casesWithAccompanying,
    },
    highlights: {
      topDestination: topName(byDestination),
      topTravelReason: topName(byTravelReason),
      topSponsorType: topName(bySponsor),
    },
    decisionByDestination,
    enrollmentTrend,
  };
}
