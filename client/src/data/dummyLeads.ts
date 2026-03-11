/** Dummy data for Lead Management (replace with API when backend is ready) */

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type LeadStage = "New" | "Contacted" | "Qualified" | "Converted";

/** Visa categories for telecaller dashboard */
export const LEAD_VISA_CATEGORIES = [
  "Canada Student Visa",
  "Spouse Visa",
  "Visitor Visa",
  "Other Immigration Services",
] as const;
export type LeadVisaCategory = (typeof LEAD_VISA_CATEGORIES)[number];

/** Lead sources for telecaller dashboard */
export const LEAD_SOURCES = [
  "Meta Ads",
  "Google Forms",
  "Website Forms",
  "Walk-in",
  "Referral",
  "IVR Calls",
  "Newspaper Ads",
] as const;

export interface DummyLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  stage: LeadStage;
  assignedToId: string | null;
  assignedToName: string | null;
  lastFollowupAt: string | null;
  createdAt: string;
  /** Visa category for telecaller dashboard */
  visaCategory?: string;
  /** When lead was transferred to counsellor (telecaller no longer owns) */
  transferredAt?: string | null;
  /** Telecaller who transferred this lead to counsellor (for "Transferred" count) */
  transferredByTelecallerId?: string | null;
}

export const LEAD_STAGES: LeadStage[] = ["New", "Contacted", "Qualified", "Converted"];

export const DUMMY_LEADS: DummyLead[] = [
  {
    id: "1",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    phone: "+91 98765 43210",
    source: "Website Forms",
    status: "new",
    stage: "New",
    assignedToId: "6",
    assignedToName: "Rahul Telecaller",
    lastFollowupAt: null,
    createdAt: "2025-03-01T10:00:00Z",
    visaCategory: "Canada Student Visa",
  },
  {
    id: "2",
    name: "Priya Patel",
    email: "priya.patel@example.com",
    phone: "+91 98765 43211",
    source: "Referral",
    status: "contacted",
    stage: "Contacted",
    assignedToId: "6",
    assignedToName: "Rahul Telecaller",
    lastFollowupAt: "2025-03-04T14:30:00Z",
    createdAt: "2025-02-28T09:15:00Z",
    visaCategory: "Spouse Visa",
  },
  {
    id: "3",
    name: "Rahul Verma",
    email: "rahul.verma@example.com",
    phone: "+91 98765 43212",
    source: "Meta Ads",
    status: "qualified",
    stage: "Qualified",
    assignedToId: "4",
    assignedToName: "Priya Singh",
    lastFollowupAt: "2025-03-05T11:00:00Z",
    createdAt: "2025-02-25T16:45:00Z",
    visaCategory: "Canada Student Visa",
    transferredAt: "2025-03-05T12:00:00Z",
    transferredByTelecallerId: "6",
  },
  {
    id: "4",
    name: "Sneha Reddy",
    email: "sneha.reddy@example.com",
    phone: "+91 98765 43213",
    source: "Website Forms",
    status: "contacted",
    stage: "Contacted",
    assignedToId: "6",
    assignedToName: "Rahul Telecaller",
    lastFollowupAt: "2025-03-03T10:00:00Z",
    createdAt: "2025-03-02T08:00:00Z",
    visaCategory: "Visitor Visa",
  },
  {
    id: "5",
    name: "Vikram Singh",
    email: "vikram.singh@example.com",
    phone: "+91 98765 43214",
    source: "Google Forms",
    status: "new",
    stage: "New",
    assignedToId: "6",
    assignedToName: "Rahul Telecaller",
    lastFollowupAt: null,
    createdAt: "2025-03-05T12:20:00Z",
    visaCategory: "Canada Student Visa",
  },
  {
    id: "6",
    name: "Anita Desai",
    email: "anita.desai@example.com",
    phone: "+91 98765 43215",
    source: "Meta Ads",
    status: "contacted",
    stage: "Contacted",
    assignedToId: "6",
    assignedToName: "Rahul Telecaller",
    lastFollowupAt: "2025-03-02T09:00:00Z",
    createdAt: "2025-02-20T11:00:00Z",
    visaCategory: "Other Immigration Services",
  },
  {
    id: "7",
    name: "Karan Mehta",
    email: "karan.mehta@example.com",
    phone: "+91 98765 43216",
    source: "Walk-in",
    status: "qualified",
    stage: "Qualified",
    assignedToId: "6",
    assignedToName: "Rahul Telecaller",
    lastFollowupAt: "2025-03-05T14:00:00Z",
    createdAt: "2025-03-01T08:00:00Z",
    visaCategory: "Canada Student Visa",
  },
  {
    id: "8",
    name: "Pooja Nair",
    email: "pooja.nair@example.com",
    phone: "+91 98765 43217",
    source: "IVR Calls",
    status: "new",
    stage: "New",
    assignedToId: "6",
    assignedToName: "Rahul Telecaller",
    lastFollowupAt: null,
    createdAt: "2025-03-06T10:00:00Z",
    visaCategory: "Spouse Visa",
  },
];

/** Dummy users for assignee dropdown (match auth mock users) */
export interface DummyUserOption {
  id: string;
  name: string;
  role: string;
}

export const DUMMY_ASSIGNEE_OPTIONS: DummyUserOption[] = [
  { id: "2", name: "Sarah Manager", role: "manager" },
  { id: "4", name: "Priya Singh", role: "counsellor" },
  { id: "6", name: "Rahul Telecaller", role: "telecaller" },
];
