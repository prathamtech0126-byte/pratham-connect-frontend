import { useState, useMemo, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  MapPin,
  BookOpen,
  Eye,
  Loader2,
  Check,
  ChevronsUpDown,
  ChevronDown,
  Trash2,
  PenLine,
  X,
  CalendarIcon,
  Wallet,
  Package,
  BadgeCheck,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { SimpleCalendar } from "@/components/ui/simple-calendar";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StageStatus = "completed" | "active" | "pending" | "skipped";

export interface ApplicationStage {
  key: string;
  label: string;
  status: StageStatus;
  completedAt?: string;
  notes?: string;
  subStages?: Array<{ key: string; label: string; status: StageStatus }>;
}

export interface StudentApplication {
  id: string;
  applicationId?: number;
  saleType: string;
  university: string;
  country: string;
  program: string;
  applicationDate?: string | null;
  note?: string | null;
  currentStageKey: string;
  stages: ApplicationStage[];
  createdAt: string;
  tuitionDepositTaken?: boolean;
  tuitionDepositStatus?: "paid" | "pending" | null;
  tuitionDepositDate?: string | null;
  tuitionDepositRemarks?: string | null;
  tuitionDepositProductPaymentId?: number | null;
}

interface SaleTypeOption {
  id?: number;
  saleTypeId?: number;
  saleType: string;
}

// ── Public handle exposed via ref ─────────────────────────────────────────────

export interface StudentApplicationTrackerHandle {
  submitPending: () => Promise<void>;
}

// ── University row type for the add form ──────────────────────────────────────

interface UniversityRow {
  rowId: string;
  universityValue: string;   // selected value or "__manual__"
  manualUniversity: string;  // when universityValue === "__manual__"
  selectedCourses: string[]; // courses selected from dropdown
  manualCourses: string[];   // manually typed courses
  courseInputText: string;   // current text in manual course input
  coursePopoverOpen: boolean;
  applicationDate: string;   // YYYY-MM-DD
  note: string;
}

function makeRow(): UniversityRow {
  return {
    rowId: Math.random().toString(36).slice(2),
    universityValue: "",
    manualUniversity: "",
    selectedCourses: [],
    manualCourses: [],
    courseInputText: "",
    coursePopoverOpen: false,
    applicationDate: "",
    note: "",
  };
}

function getUniversityName(row: UniversityRow): string {
  return row.universityValue === "__manual__" ? row.manualUniversity.trim() : row.universityValue;
}

function getAllCourses(row: UniversityRow): string[] {
  return [...row.selectedCourses, ...row.manualCourses];
}

function formatApplicationDisplayId(applicationId: number, createdAt?: string | Date | null) {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `APP-${year}-${String(applicationId).padStart(4, "0")}`;
}

function mapApiApplication(row: {
  applicationId: number;
  saleType?: string | null;
  universityName: string;
  courseName?: string | null;
  country?: string | null;
  status: string;
  applicationDate?: string | null;
  note?: string | null;
  createdAt?: string | Date | null;
  tuitionDepositTaken?: boolean;
  tuitionDepositStatus?: "paid" | "pending" | null;
  tuitionDepositDate?: string | null;
  tuitionDepositRemarks?: string | null;
  tuitionDepositProductPaymentId?: number | null;
}): StudentApplication {
  const stageKey = normalizeStageKey(row.status);
  return {
    id: formatApplicationDisplayId(row.applicationId, row.createdAt),
    applicationId: row.applicationId,
    saleType: row.saleType ?? "",
    university: row.universityName,
    country: row.country ?? "",
    program: row.courseName ?? "",
    applicationDate: row.applicationDate ?? null,
    note: row.note ?? null,
    currentStageKey: stageKey,
    stages: applyStageProgress(buildStages(), stageKey),
    createdAt: row.createdAt
      ? new Date(row.createdAt).toLocaleDateString("en-IN")
      : new Date().toLocaleDateString("en-IN"),
    tuitionDepositTaken: row.tuitionDepositTaken ?? false,
    tuitionDepositStatus: row.tuitionDepositStatus ?? null,
    tuitionDepositDate: row.tuitionDepositDate ?? null,
    tuitionDepositRemarks: row.tuitionDepositRemarks ?? null,
    tuitionDepositProductPaymentId: row.tuitionDepositProductPaymentId ?? null,
  };
}

function applicationHasTuitionDeposit(app: StudentApplication): boolean {
  return !!app.tuitionDepositStatus || !!app.tuitionDepositTaken;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const COUNTRIES = [
  "Canada", "United Kingdom", "Australia", "Germany", "USA",
  "Ireland", "Netherlands", "Sweden", "Finland", "New Zealand",
  "France", "Italy", "Singapore", "UAE", "Other",
];

function getColumnIndex(headers: string[], names: string[]) {
  for (const name of names) {
    const idx = headers.findIndex((h) => h?.trim() === name);
    if (idx !== -1) return idx;
  }
  return -1;
}

interface UniversityOption {
  value: string;
  label: string;
  location: string;
  campus: string;
}

function parseUniversitySheetData(data: string[][]) {
  if (!data || data.length < 2) {
    return {
      universityOptions: [] as UniversityOption[],
      programsByUniversity: {} as Record<string, string[]>,
    };
  }

  const headers = data[0];
  const uniIdx = getColumnIndex(headers, ["University Name"]);
  const locationIdx = getColumnIndex(headers, ["Location/Province", "Location"]);
  const campusIdx = getColumnIndex(headers, ["Campus"]);
  const courseIdx = getColumnIndex(headers, ["Courses Available", "Courses"]);

  const universityMap = new Map<string, UniversityOption>();
  const programsByUniversity: Record<string, Set<string>> = {};

  for (const row of data.slice(1)) {
    if (!row || row.length === 0 || !row.some((cell) => cell?.trim())) continue;

    const universityName = uniIdx >= 0 ? row[uniIdx]?.trim() ?? "" : "";
    if (!universityName) continue;

    const locationProvince = locationIdx >= 0 ? row[locationIdx]?.trim() ?? "" : "";
    const campus = campusIdx >= 0 ? row[campusIdx]?.trim() ?? "" : "";
    const coursesAvailable = courseIdx >= 0 ? row[courseIdx]?.trim() ?? "" : "";

    if (!universityMap.has(universityName)) {
      universityMap.set(universityName, {
        value: universityName,
        label: universityName,
        location: locationProvince,
        campus,
      });
    } else if (locationProvince || campus) {
      const existing = universityMap.get(universityName)!;
      if (locationProvince && !existing.location.includes(locationProvince)) {
        existing.location = existing.location
          ? `${existing.location}, ${locationProvince}`
          : locationProvince;
      }
      if (campus && !existing.campus.includes(campus)) {
        existing.campus = existing.campus ? `${existing.campus}, ${campus}` : campus;
      }
    }

    if (!programsByUniversity[universityName]) {
      programsByUniversity[universityName] = new Set();
    }
    if (coursesAvailable) {
      programsByUniversity[universityName].add(coursesAvailable);
    }
  }

  return {
    universityOptions: Array.from(universityMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
    programsByUniversity: Object.fromEntries(
      Object.entries(programsByUniversity).map(([key, programs]) => [
        key,
        Array.from(programs).sort((a, b) => a.localeCompare(b)),
      ]),
    ),
  };
}

function SearchableCombobox({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  disabled = false,
  emptyText = "No results found.",
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string; detail?: string; keywords?: string }>;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-10 px-3"
        >
          <span className="truncate text-left">
            {selected ? (
              <span className="flex flex-col items-start leading-tight">
                <span>{selected.label}</span>
                {selected.detail && (
                  <span className="text-xs text-muted-foreground font-normal">{selected.detail}</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList className="max-h-60">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.detail ?? ""} ${option.keywords ?? ""}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{option.label}</p>
                    {option.detail && (
                      <p className="text-xs text-muted-foreground truncate">{option.detail}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function countryFromSaleType(saleType: string): string {
  const map: Record<string, string> = {
    "USA Student": "USA",
    "Germany Student": "Germany",
    "Finland Student": "Finland",
    "UK Student": "United Kingdom",
    "Canada Student": "Canada",
    "Australia Student": "Australia",
    "Ireland Student": "Ireland",
  };
  if (map[saleType]) return map[saleType];
  const stripped = saleType.replace(/\s*student\s*/i, " ").trim();
  return stripped || "Other";
}

const STAGE_COLORS: Record<string, string> = {
  completed: "text-emerald-600 dark:text-emerald-400",
  active: "text-primary",
  pending: "text-muted-foreground/50",
  skipped: "text-muted-foreground/30",
};

const APPLICATION_STAGES = [
  { key: "app_submitted", label: "Application Submitted" },
  { key: "offer_received", label: "University Offer Received" },
  { key: "cas_received", label: "CAS/GIC Received" },
  { key: "visa_submitted", label: "Visa Submitted" },
  { key: "process_completed", label: "All Process Done" },
] as const;

const FINAL_STAGE_KEY = "process_completed";

function normalizeStageKey(key: string): string {
  const validKeys = APPLICATION_STAGES.map((stage) => stage.key);
  if (validKeys.includes(key as (typeof validKeys)[number])) return key;

  const legacyMap: Record<string, string> = {
    profile_eval: "app_submitted",
    shortlisting: "app_submitted",
    final_uni: "offer_received",
    tuition_deposit: "cas_received",
    country_process: "cas_received",
    visa_prep: "visa_submitted",
    visa_decision: "visa_submitted",
    biometrics: "visa_submitted",
    pre_departure: "visa_submitted",
    departed: "visa_submitted",
    arrived: "visa_submitted",
    case_closed: "process_completed",
    process_completed: "process_completed",
    all_process_done: "process_completed",
  };

  return legacyMap[key] ?? "app_submitted";
}

function buildStages(): ApplicationStage[] {
  return APPLICATION_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    status: "pending" as StageStatus,
  }));
}

function applyStageProgress(stages: ApplicationStage[], currentKey: string): ApplicationStage[] {
  const currentIdx = stages.findIndex((s) => s.key === currentKey);
  return stages.map((s, i) => ({
    ...s,
    status: (i < currentIdx ? "completed" : i === currentIdx ? "active" : "pending") as StageStatus,
    subStages: s.subStages?.map((sub, si) => ({
      ...sub,
      status: (i < currentIdx ? "completed" : i === currentIdx && si === 0 ? "active" : "pending") as StageStatus,
    })),
  }));
}

// ── ID generator ──────────────────────────────────────────────────────────────

const _counters: Record<string, number> = {};
function nextAppId(clientId?: string | number): string {
  const key = String(clientId ?? "global");
  if (!_counters[key]) _counters[key] = 1;
  const year = new Date().getFullYear();
  return `APP-${year}-${String(_counters[key]++).padStart(4, "0")}`;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const storageKey = (id?: string | number) => `student-apps-${id ?? "new"}`;

function loadApps(clientId?: string | number): StudentApplication[] {
  try {
    const raw = localStorage.getItem(storageKey(clientId));
    if (raw) {
      return (JSON.parse(raw) as StudentApplication[]).map((app) => {
        const currentStageKey = normalizeStageKey(app.currentStageKey);
        return {
          ...app,
          currentStageKey,
          stages: applyStageProgress(buildStages(), currentStageKey),
        };
      });
    }
  } catch {}
  return [];
}

function saveApps(clientId: string | number | undefined, apps: StudentApplication[]) {
  try {
    localStorage.setItem(storageKey(clientId), JSON.stringify(apps));
  } catch {}
}

// ── Stage Icon ────────────────────────────────────────────────────────────────

function StageIcon({ status, small }: { status: StageStatus; small?: boolean }) {
  const sz = small ? "h-4 w-4" : "h-5 w-5";
  if (status === "completed") return <CheckCircle2 className={cn(sz, "text-emerald-500 shrink-0")} />;
  if (status === "active")    return <Clock        className={cn(sz, "text-primary shrink-0 animate-pulse")} />;
  if (status === "skipped")   return <XCircle      className={cn(sz, "text-muted-foreground/40 shrink-0")} />;
  return <Circle className={cn(sz, "text-muted-foreground/25 shrink-0")} />;
}

// ── Full Stage Timeline ───────────────────────────────────────────────────────

function StageTimeline({ app }: { app: StudentApplication }) {
  return (
    <div className="space-y-0.5 overflow-y-auto pr-1" style={{ maxHeight: "65vh" }}>
      {app.stages.map((stage, i) => (
        <div key={stage.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <StageIcon status={stage.status} />
            {i < app.stages.length - 1 && (
              <div className={cn("w-0.5 flex-1 min-h-[14px] mt-0.5",
                stage.status === "completed" ? "bg-emerald-300" : "bg-border/50"
              )} />
            )}
          </div>
          <div className={cn("pb-3 flex-1 min-w-0", i === app.stages.length - 1 && "pb-0")}>
            <p className={cn("text-sm font-medium leading-tight", STAGE_COLORS[stage.status])}>
              {stage.label}
            </p>
            {stage.status === "active" && (
              <span className="text-[11px] text-primary font-medium">Current</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Clickable Stage Picker ────────────────────────────────────────────────────

function StageStatusPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (stageKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentLabel =
    APPLICATION_STAGES.find((stage) => stage.key === value)?.label ?? "Application Submitted";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 -ml-2 text-sm transition-colors hover:border-border hover:bg-muted/60 cursor-pointer"
        >
          <span className="text-muted-foreground">Stage:</span>
          <span className="font-semibold text-foreground">{currentLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <div className="flex flex-col">
          {APPLICATION_STAGES.map((stage) => (
            <button
              key={stage.key}
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors hover:bg-muted",
                value === stage.key && "bg-muted font-medium",
              )}
              onClick={() => {
                onChange(stage.key);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  value === stage.key ? "opacity-100" : "opacity-0",
                )}
              />
              {stage.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TuitionDepositDialog({
  app,
  open,
  onClose,
  onSave,
  saving,
}: {
  app: StudentApplication | null;
  open: boolean;
  onClose: () => void;
  onSave: (payload: { status: string; date: string; remarks: string }) => Promise<void>;
  saving: boolean;
}) {
  const [status, setStatus] = useState("Pending");
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    if (!open || !app) return;
    const currentStatus = app.tuitionDepositStatus === "paid" ? "Paid" : app.tuitionDepositStatus === "pending" ? "Pending" : "";
    setStatus(currentStatus);
    setDate(app.tuitionDepositDate ?? "");
    setRemarks(app.tuitionDepositRemarks ?? "");
  }, [open, app]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tuition Deposit</DialogTitle>
        </DialogHeader>
        {app && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Record tuition deposit for <span className="font-semibold text-foreground">{app.university}</span>
            </p>
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">Tuition Deposit</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(new Date(date), "dd MMM yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <SimpleCalendar
                        value={date ? new Date(date) : null}
                        maxDate={new Date()}
                        onChange={(d) => {
                          const picked = Array.isArray(d) ? d[0] : d;
                          if (picked instanceof Date) {
                            setDate(format(picked, "yyyy-MM-dd"));
                            setDateOpen(false);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  placeholder="Tuition deposit remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={saving || !status}
            onClick={async () => {
              await onSave({ status, date, remarks });
            }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Tuition Deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationCard({
  app,
  onUpdateStage,
  onView,
  onDelete,
  onNoteUpdate,
  onOpenTuitionDeposit,
  clientAlreadyHasTuitionDeposit = false,
  tuitionDepositAddOnly = false,
  readOnly = false,
  variant = "default",
}: {
  app: StudentApplication;
  onUpdateStage: (id: string, stage: string) => void;
  onView: (app: StudentApplication) => void;
  onDelete?: (app: StudentApplication) => void;
  onNoteUpdate?: (app: StudentApplication, note: string) => Promise<void>;
  onOpenTuitionDeposit?: (app: StudentApplication) => void;
  clientAlreadyHasTuitionDeposit?: boolean;
  /** View page: allow Add only; hide Update after a deposit exists. */
  tuitionDepositAddOnly?: boolean;
  readOnly?: boolean;
  variant?: "default" | "clientInfo";
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(app.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const isCompleted = app.currentStageKey === FINAL_STAGE_KEY;
  const stageLabel =
    APPLICATION_STAGES.find((stage) => stage.key === app.currentStageKey)?.label ??
    "Application Submitted";

  // Support multiple courses stored as ", "-separated string
  const courses = app.program
    ? app.program.split(", ").map((c) => c.trim()).filter(Boolean)
    : [];

  async function saveNote() {
    if (!onNoteUpdate) return;
    setSavingNote(true);
    try {
      await onNoteUpdate(app, noteText);
      setEditingNote(false);
    } finally {
      setSavingNote(false);
    }
  }

  if (variant === "clientInfo") {
    const tuitionDepositLabel = app.tuitionDepositTaken
      ? "Tuition Deposit Taken"
      : app.tuitionDepositStatus === "pending"
        ? "Tuition Deposit Pending"
        : "Not Recorded";

    const showTuitionDepositOnCard =
      applicationHasTuitionDeposit(app) || !clientAlreadyHasTuitionDeposit;
    const showTuitionDepositAction =
      !!onOpenTuitionDeposit &&
      showTuitionDepositOnCard &&
      (!tuitionDepositAddOnly || !applicationHasTuitionDeposit(app));
    const tuitionDepositActionLabel =
      applicationHasTuitionDeposit(app) && !tuitionDepositAddOnly
        ? "Update Tuition Deposit"
        : "Add Tuition Deposit";

    return (
      <div
        className={cn(
          "rounded-xl border bg-white shadow-sm overflow-hidden",
          app.tuitionDepositTaken ? "border-emerald-200" : "border-gray-100",
        )}
      >
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                {app.id}
              </span>
              {app.saleType && (
                <Badge className="text-[10px] bg-[#1A2B3B] text-white hover:bg-[#1A2B3B]">
                  {app.saleType}
                </Badge>
              )}
              {app.tuitionDepositTaken && (
                <Badge className="text-[10px] bg-emerald-600 text-white hover:bg-emerald-600 gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Tuition Deposit Taken
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-primary hover:text-primary"
              onClick={() => onView(app)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>

          {showTuitionDepositOnCard && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm">
            <span className="text-gray-500">Tuition Deposit</span>
            <span
              className={cn(
                "font-semibold sm:text-right",
                app.tuitionDepositTaken
                  ? "text-emerald-700"
                  : app.tuitionDepositStatus === "pending"
                    ? "text-amber-700"
                    : "text-gray-500",
              )}
            >
              {tuitionDepositLabel}
            </span>
          </div>
          )}

          <div className="space-y-2">
            <h4 className="text-base font-bold text-[#1A2B3B] uppercase leading-snug tracking-wide">
              {app.university}
            </h4>

            {app.country && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{app.country}</span>
              </p>
            )}

            {courses.length > 0 && (
              <ul className="space-y-1">
                {courses.map((course, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5 leading-snug">
                    <span className="text-gray-400 mt-1.5">•</span>
                    <span>{course}</span>
                  </li>
                ))}
              </ul>
            )}

            {app.applicationDate && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Applied{" "}
                  {new Date(app.applicationDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}

            {app.note && (
              <p className="text-sm text-gray-600">
                <span className="text-gray-400">Note:</span> {app.note}
              </p>
            )}

            <div className="pt-1">
              <StageStatusPicker
                value={app.currentStageKey}
                onChange={(stageKey) => onUpdateStage(app.id, stageKey)}
              />
            </div>
          </div>
        </div>

        {showTuitionDepositAction && (
          <div className="mx-5 mb-5 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-gray-500" />
                Tuition Deposit
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs font-medium border-gray-200 bg-white hover:bg-gray-50"
                onClick={() => onOpenTuitionDeposit!(app)}
              >
                <Package className="h-3.5 w-3.5 mr-1.5" />
                {tuitionDepositActionLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const showTuitionDepositOnCard =
    applicationHasTuitionDeposit(app) || !clientAlreadyHasTuitionDeposit;
  const showTuitionDepositAction =
    !!onOpenTuitionDeposit &&
    showTuitionDepositOnCard &&
    (!tuitionDepositAddOnly || !applicationHasTuitionDeposit(app));
  const tuitionDepositActionLabel =
    applicationHasTuitionDeposit(app) && !tuitionDepositAddOnly
      ? "Update Tuition Deposit"
      : "Add Tuition Deposit";

  return (
    <>
      <div
        className={cn(
          "rounded-lg border bg-card shadow-sm transition-all hover:shadow-md",
          isCompleted ? "border-emerald-200 bg-emerald-50/20" : "border-border"
        )}
      >
        {/* Clickable header area */}
        <div
          className="p-5 space-y-4 cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          {/* ID + actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                {app.id}
              </span>
              {isCompleted && (
                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
                  Completed
                </Badge>
              )}
              {app.note && !expanded && (
                <Badge variant="secondary" className="text-[10px]">Note</Badge>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-primary hover:text-primary"
                onClick={() => onView(app)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              {!readOnly && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
              </Button>
            </div>
          </div>

          {/* Application details */}
          <div className="space-y-2">
            <h4 className="text-base font-bold text-foreground leading-snug">{app.university}</h4>

            {courses.length > 0 && (
              <div className="space-y-1">
                {courses.map((course, i) => (
                  <p key={i} className="text-sm text-muted-foreground flex items-start gap-1.5 leading-snug">
                    <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{course}</span>
                  </p>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{app.country}</span>
            </p>

            <p className="text-xs text-muted-foreground">
              Sale type: <span className="font-medium text-foreground">{app.saleType}</span>
            </p>
            {app.applicationDate && (
              <p className="text-xs text-muted-foreground">
                Applied: <span className="font-medium text-foreground">
                  {new Date(app.applicationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </p>
            )}
          </div>

          <div className="pt-1 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
            {readOnly ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Stage:</span>{" "}
                <span className="font-semibold text-foreground">{stageLabel}</span>
              </p>
            ) : (
              <StageStatusPicker
                value={app.currentStageKey}
                onChange={(stageKey) => onUpdateStage(app.id, stageKey)}
              />
            )}
          </div>

          {showTuitionDepositAction && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  Tuition Deposit
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onOpenTuitionDeposit!(app)}
                >
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  {tuitionDepositActionLabel}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Expanded note section */}
        {expanded && (
          <div className="px-5 pb-5 pt-0 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Note</p>
                {!readOnly && onNoteUpdate && !editingNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => { setNoteText(app.note ?? ""); setEditingNote(true); }}
                  >
                    <PenLine className="h-3.5 w-3.5 mr-1" />
                    {app.note ? "Edit" : "Add Note"}
                  </Button>
                )}
              </div>
              {editingNote ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full min-h-[80px] text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden"
                    placeholder="Add a note..."
                    value={noteText}
                    onChange={(e) => {
                      setNoteText(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = t.scrollHeight + "px";
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingNote(false)} disabled={savingNote}>
                      Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={saveNote} disabled={savingNote}>
                      {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </div>
              ) : app.note ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{app.note}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No note added.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the application for{" "}
              <span className="font-semibold text-foreground">{app.university}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete?.(app);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Course multi-select for a single university row ───────────────────────────

function CourseMultiSelect({
  availableCourses,
  selectedCourses,
  manualCourses,
  courseInputText,
  coursePopoverOpen,
  onToggleCourse,
  onAddManualCourse,
  onRemoveManualCourse,
  onCourseInputChange,
  onPopoverOpenChange,
}: {
  availableCourses: string[];
  selectedCourses: string[];
  manualCourses: string[];
  courseInputText: string;
  coursePopoverOpen: boolean;
  onToggleCourse: (course: string) => void;
  onAddManualCourse: () => void;
  onRemoveManualCourse: (course: string) => void;
  onCourseInputChange: (text: string) => void;
  onPopoverOpenChange: (open: boolean) => void;
}) {
  const allSelected = [...selectedCourses, ...manualCourses];

  return (
    <div className="space-y-2">
      <Popover open={coursePopoverOpen} onOpenChange={onPopoverOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal h-10 px-3"
          >
            <span className="text-muted-foreground truncate">
              {allSelected.length === 0
                ? "Select courses..."
                : `${allSelected.length} course${allSelected.length !== 1 ? "s" : ""} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
          <Command>
            <CommandInput placeholder="Search courses..." className="h-9" />
            <CommandList className="max-h-52">
              {availableCourses.length === 0 ? (
                <CommandEmpty>No courses available.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {availableCourses.map((course) => (
                    <CommandItem
                      key={course}
                      value={course}
                      onSelect={() => onToggleCourse(course)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedCourses.includes(course) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{course}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          {/* Manual course input inside popover */}
          <div className="border-t p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-1 flex items-center gap-1">
              <PenLine className="h-3 w-3" />
              Add manually
            </p>
            <div className="flex gap-1.5">
              <Input
                className="h-8 text-sm"
                placeholder="Type course name..."
                value={courseInputText}
                onChange={(e) => onCourseInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddManualCourse();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-8 px-2.5 shrink-0"
                onClick={onAddManualCourse}
                disabled={!courseInputText.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected course tags */}
      {allSelected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCourses.map((course) => (
            <Badge
              key={course}
              variant="secondary"
              className="gap-1 pr-1 font-normal text-xs max-w-full"
            >
              <span className="truncate max-w-[200px]">{course}</span>
              <button
                type="button"
                className="ml-0.5 rounded-sm opacity-70 hover:opacity-100 shrink-0"
                onClick={() => onToggleCourse(course)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {manualCourses.map((course) => (
            <Badge
              key={course}
              variant="outline"
              className="gap-1 pr-1 font-normal text-xs border-dashed max-w-full"
            >
              <PenLine className="h-3 w-3 shrink-0 opacity-60" />
              <span className="truncate max-w-[200px]">{course}</span>
              <button
                type="button"
                className="ml-0.5 rounded-sm opacity-70 hover:opacity-100 shrink-0"
                onClick={() => onRemoveManualCourse(course)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Application Date Picker ───────────────────────────────────────────────────

function ApplicationDatePicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value
    ? (() => {
        try {
          const d = new Date(`${value}T00:00:00`);
          return isNaN(d.getTime()) ? undefined : d;
        } catch {
          return undefined;
        }
      })()
    : undefined;

  return (
    <div className="space-y-1.5">
      <Label className={cn("text-xs", error && "text-destructive")}>
        Application Date <span className="text-destructive">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full pl-3 text-left font-normal h-10",
              !value && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            {parsed ? format(parsed, "PPP") : <span>Pick a date</span>}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <SimpleCalendar
            value={parsed}
            maxDate={new Date()}
            onChange={(date) => {
              if (date instanceof Date) {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                onChange(`${y}-${m}-${d}`);
              } else if (Array.isArray(date) && date[0] instanceof Date) {
                const d0 = date[0];
                const y = d0.getFullYear();
                const m = String(d0.getMonth() + 1).padStart(2, "0");
                const d = String(d0.getDate()).padStart(2, "0");
                onChange(`${y}-${m}-${d}`);
              }
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-xs text-destructive">Application date is required</p>
      )}
    </div>
  );
}

// ── Add Application Form (multi-university batch) ─────────────────────────────

function AddApplicationForm({
  onAdd,
  studentSaleTypes,
  onRegisterSubmit,
}: {
  onAdd: (data: Omit<StudentApplication, "id" | "stages" | "currentStageKey" | "createdAt">) => Promise<void> | void;
  studentSaleTypes: string[];
  onRegisterSubmit?: (fn: () => Promise<void>) => void;
}) {
  const { toast } = useToast();
  const [saleType, setSaleType] = useState("");
  const [rows, setRows] = useState<UniversityRow[]>([makeRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, { university?: boolean; courses?: boolean; date?: boolean }>>({});

  const { data: sheetResponse, isLoading: isLoadingUniversities } = useQuery({
    queryKey: ["university-data"],
    queryFn: async () => {
      const response = await api.get("/api/google-sheets/read", {
        params: { range: "Sheet1" },
      });
      return response.data;
    },
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const { universityOptions, programsByUniversity } = useMemo(() => {
    if (!sheetResponse?.success || !sheetResponse?.data) {
      return {
        universityOptions: [] as UniversityOption[],
        programsByUniversity: {} as Record<string, string[]>,
      };
    }
    return parseUniversitySheetData(sheetResponse.data);
  }, [sheetResponse]);

  const universityComboboxOptions = useMemo(
    () => [
      ...universityOptions.map((option) => ({
        value: option.value,
        label: option.label,
        detail: [option.location, option.campus].filter(Boolean).join(" · ") || undefined,
        keywords: `${option.location} ${option.campus}`,
      })),
      { value: "__manual__", label: "Add manually..." },
    ],
    [universityOptions],
  );

  const saleTypeOptions = studentSaleTypes.length > 0 ? studentSaleTypes : ["Student Visa (General)"];

  function updateRow(rowId: string, patch: Partial<UniversityRow>) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
    // Clear corresponding field errors
    if ("applicationDate" in patch || "universityValue" in patch || "manualUniversity" in patch) {
      setRowErrors((prev) => {
        if (!prev[rowId]) return prev;
        const next = { ...prev[rowId] };
        if ("applicationDate" in patch) delete next.date;
        if ("universityValue" in patch || "manualUniversity" in patch) delete next.university;
        return { ...prev, [rowId]: next };
      });
    }
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow()]);
  }

  function removeRow(rowId: string) {
    setRows((prev) => {
      if (prev.length === 1) return [makeRow()];
      return prev.filter((r) => r.rowId !== rowId);
    });
  }

  function toggleCourse(rowId: string, course: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        const already = r.selectedCourses.includes(course);
        return {
          ...r,
          selectedCourses: already
            ? r.selectedCourses.filter((c) => c !== course)
            : [...r.selectedCourses, course],
        };
      }),
    );
    setRowErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev[rowId] };
      delete next.courses;
      return { ...prev, [rowId]: next };
    });
  }

  function addManualCourse(rowId: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        const text = r.courseInputText.trim();
        if (!text || r.manualCourses.includes(text)) return { ...r, courseInputText: "" };
        return { ...r, manualCourses: [...r.manualCourses, text], courseInputText: "" };
      }),
    );
    setRowErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev[rowId] };
      delete next.courses;
      return { ...prev, [rowId]: next };
    });
  }

  function removeManualCourse(rowId: string, course: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? { ...r, manualCourses: r.manualCourses.filter((c) => c !== course) }
          : r,
      ),
    );
  }

  function handleUniversityChange(rowId: string, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              universityValue: value,
              isManual: value === "__manual__",
              manualUniversity: value === "__manual__" ? r.manualUniversity : "",
              selectedCourses: [],
              manualCourses: [],
              courseInputText: "",
            }
          : r,
      ),
    );
  }

  const activeRows = rows.filter((r) => getUniversityName(r).length > 0);
  const canSubmit = !!saleType && activeRows.length > 0;

  // Keep a stable ref so the parent can call the latest version without stale closures
  const handleSubmitRef = useRef<() => Promise<void>>(async () => {});

  async function handleSubmit() {
    if (!saleType || isSubmitting) return;

    // Validate every row that has a university name
    const filledRows = rows.filter((r) => getUniversityName(r).length > 0);
    if (filledRows.length === 0) return;

    const errors: Record<string, { university?: boolean; courses?: boolean; date?: boolean }> = {};
    let hasError = false;

    for (const row of filledRows) {
      const name = getUniversityName(row);
      const courses = getAllCourses(row);
      const rowErr: { university?: boolean; courses?: boolean; date?: boolean } = {};
      if (!name) { rowErr.university = true; hasError = true; }
      if (courses.length === 0) { rowErr.courses = true; hasError = true; }
      if (!row.applicationDate) { rowErr.date = true; hasError = true; }
      if (Object.keys(rowErr).length) errors[row.rowId] = rowErr;
    }

    if (hasError) {
      setRowErrors(errors);
      toast({
        title: "Missing information",
        description: "Please fill in university, at least one course, and application date for each row.",
        variant: "destructive",
      });
      return;
    }

    setRowErrors({});
    setIsSubmitting(true);
    try {
      for (const row of filledRows) {
        const name = getUniversityName(row);
        const allCourses = getAllCourses(row);
        await onAdd({
          saleType,
          university: name,
          country: countryFromSaleType(saleType),
          program: allCourses.join(", "),
          applicationDate: row.applicationDate || null,
          note: row.note.trim() || null,
        });
      }
      setSaleType("");
      setRows([makeRow()]);
      setRowErrors({});
    } finally {
      setIsSubmitting(false);
    }
  }

  // Always keep the ref pointing to the latest handleSubmit so the parent gets fresh state
  handleSubmitRef.current = handleSubmit;

  // Register once on mount; parent will call handleSubmitRef.current() which is always fresh
  useEffect(() => {
    onRegisterSubmit?.(() => handleSubmitRef.current());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterSubmit]);

  return (
    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
      <Label className="text-base font-semibold">Add Student Application</Label>

      {/* Sale type */}
      <div className="max-w-xs space-y-1.5">
        <Label>Student Sale Type</Label>
        <Select
          value={saleType}
          onValueChange={(value) => {
            setSaleType(value);
            setRows([makeRow()]);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select sale type" />
          </SelectTrigger>
          <SelectContent>
            {saleTypeOptions.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* University rows */}
      {saleType && (
        <div className="space-y-3">
          {rows.map((row, idx) => {
            const availableCourses =
              row.universityValue && row.universityValue !== "__manual__"
                ? (programsByUniversity[row.universityValue] ?? [])
                : [];

            const rowErr = rowErrors[row.rowId] ?? {};
            return (
              <div
                key={row.rowId}
                className="rounded-lg border border-border/70 bg-background p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    University {idx + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(row.rowId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* 1. University selector */}
                <div className="space-y-1.5">
                  <Label className={cn("text-xs", rowErr.university && "text-destructive")}>
                    University <span className="text-destructive">*</span>
                  </Label>
                  <SearchableCombobox
                    value={row.universityValue}
                    onValueChange={(value) => handleUniversityChange(row.rowId, value)}
                    options={universityComboboxOptions}
                    placeholder={
                      isLoadingUniversities ? "Loading universities..." : "Search or add manually..."
                    }
                    searchPlaceholder="Search by university, location, or campus..."
                    disabled={isLoadingUniversities}
                    emptyText="No university found."
                  />
                  {row.universityValue === "__manual__" && (
                    <Input
                      className="mt-1.5"
                      placeholder="Enter university name..."
                      value={row.manualUniversity}
                      onChange={(e) => updateRow(row.rowId, { manualUniversity: e.target.value })}
                      autoFocus
                    />
                  )}
                </div>

                {/* 2. Programs / Courses (only shown once university is chosen) */}
                {(row.universityValue && row.universityValue !== "__manual__") ||
                (row.universityValue === "__manual__" && row.manualUniversity.trim()) ? (
                  <div className="space-y-1.5">
                    <Label className={cn("text-xs", rowErr.courses && "text-destructive")}>
                      Programs / Courses <span className="text-destructive">*</span>
                    </Label>
                    <CourseMultiSelect
                      availableCourses={availableCourses}
                      selectedCourses={row.selectedCourses}
                      manualCourses={row.manualCourses}
                      courseInputText={row.courseInputText}
                      coursePopoverOpen={row.coursePopoverOpen}
                      onToggleCourse={(course) => toggleCourse(row.rowId, course)}
                      onAddManualCourse={() => addManualCourse(row.rowId)}
                      onRemoveManualCourse={(course) => removeManualCourse(row.rowId, course)}
                      onCourseInputChange={(text) => updateRow(row.rowId, { courseInputText: text })}
                      onPopoverOpenChange={(open) => updateRow(row.rowId, { coursePopoverOpen: open })}
                    />
                  </div>
                ) : null}

                {/* 3. Application Date — calendar popover */}
                <ApplicationDatePicker
                  value={row.applicationDate}
                  onChange={(val) => updateRow(row.rowId, { applicationDate: val })}
                  error={!!rowErr.date}
                />

                {/* 4. Note (optional, auto-expanding) */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Note <span className="text-muted-foreground">(optional)</span></Label>
                  <textarea
                    className="w-full min-h-[60px] text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden"
                    placeholder="Add a note for this application..."
                    value={row.note}
                    onChange={(e) => {
                      updateRow(row.rowId, { note: e.target.value });
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = t.scrollHeight + "px";
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Add university row button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 w-full border-dashed"
            onClick={addRow}
            disabled={isLoadingUniversities}
          >
            <Plus className="h-4 w-4" />
            Add University
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="gap-1.5"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isSubmitting ? "Adding..." : `Add Application${rows.filter((r) => getUniversityName(r)).length > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}

// ── View Timeline Dialog ──────────────────────────────────────────────────────

function ViewTimelineDialog({ app, onClose }: { app: StudentApplication | null; onClose: () => void }) {
  if (!app) return null;

  const courses = app.program
    ? app.program.split(", ").map((c) => c.trim()).filter(Boolean)
    : [];

  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded">{app.id}</span>
          </div>
          <h3 className="text-base font-bold">{app.university}</h3>
          {courses.length > 0 && (
            <div className="mt-0.5 space-y-0.5">
              {courses.map((c, i) => (
                <p key={i} className="text-muted-foreground text-sm">{c}</p>
              ))}
            </div>
          )}
          <p className="text-muted-foreground text-xs mt-1">
            {app.country} · {app.saleType}
            {app.applicationDate && (
              <> · Applied: {new Date(app.applicationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>
            )}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Application Status
            </p>
            <StageTimeline app={app} />
          </div>
          {app.note && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Note</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{app.note}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface StudentApplicationTrackerProps {
  studentSaleTypes?: string[];
  saleTypes?: SaleTypeOption[];
  clientId?: number | string;
  counsellorId?: number;
  onCountChange?: (count: number) => void;
  compact?: boolean;
  readOnly?: boolean;
  variant?: "default" | "compact" | "clientInfo";
  onAddApplication?: () => void;
  /** True when client has a tuition deposit via direct product (not linked to an application row). */
  clientHasDirectTuitionDeposit?: boolean;
  onTuitionDepositExistsChange?: (exists: boolean) => void;
  /** On read-only pages (e.g. client view): allow Add Tuition Deposit only; Update stays on edit page. */
  enableTuitionDeposit?: boolean;
}

export const StudentApplicationTracker = forwardRef<StudentApplicationTrackerHandle, StudentApplicationTrackerProps>(
function StudentApplicationTracker({
  studentSaleTypes = [],
  saleTypes = [],
  clientId,
  counsellorId,
  onCountChange,
  compact = false,
  readOnly = false,
  variant = "default",
  onAddApplication,
  clientHasDirectTuitionDeposit = false,
  onTuitionDepositExistsChange,
  enableTuitionDeposit,
}: StudentApplicationTrackerProps, ref) {
  const canManageTuitionDeposit = enableTuitionDeposit ?? !readOnly;
  const tuitionDepositAddOnly = readOnly && canManageTuitionDeposit;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pendingSubmitRef = useRef<() => Promise<void>>(async () => {});

  useImperativeHandle(ref, () => ({
    submitPending: async () => {
      await pendingSubmitRef.current();
    },
  }));
  const [viewingApp, setViewingApp] = useState<StudentApplication | null>(null);
  const [tuitionDepositApp, setTuitionDepositApp] = useState<StudentApplication | null>(null);
  const [savingTuitionDeposit, setSavingTuitionDeposit] = useState(false);
  const numericClientId = clientId ? Number(clientId) : null;
  const useApi = Number.isFinite(numericClientId);

  const {
    data: apiResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["student-applications", numericClientId],
    queryFn: async () => {
      const response = await api.get(`/api/student-applications/client/${numericClientId}`);
      return response.data;
    },
    enabled: useApi,
    refetchOnWindowFocus: false,
  });

  const [localApplications, setLocalApplications] = useState<StudentApplication[]>(() =>
    useApi ? [] : loadApps(clientId),
  );

  const applications: StudentApplication[] = useMemo(() => {
    if (useApi) {
      if (!apiResponse?.success || !Array.isArray(apiResponse.data)) return [];
      return apiResponse.data.map(mapApiApplication);
    }
    return localApplications;
  }, [useApi, apiResponse, localApplications]);

  useEffect(() => {
    if (!useApi) {
      saveApps(clientId, localApplications);
    }
    onCountChange?.(applications.length);
  }, [applications.length, clientId, localApplications, onCountChange, useApi, applications]);

  const hasTuitionDepositOnApplications = useMemo(
    () => applications.some((app) => applicationHasTuitionDeposit(app)),
    [applications],
  );

  const clientAlreadyHasTuitionDeposit =
    clientHasDirectTuitionDeposit || hasTuitionDepositOnApplications;

  useEffect(() => {
    onTuitionDepositExistsChange?.(clientAlreadyHasTuitionDeposit);
  }, [clientAlreadyHasTuitionDeposit, onTuitionDepositExistsChange]);

  const resolveSaleTypeId = useCallback(
    (saleTypeName: string) => {
      const match = saleTypes.find(
        (item) =>
          item.saleType === saleTypeName &&
          (item.id != null || item.saleTypeId != null),
      );
      return match?.id ?? match?.saleTypeId ?? null;
    },
    [saleTypes],
  );

  const handleAdd = useCallback(
    async (data: Omit<StudentApplication, "id" | "stages" | "currentStageKey" | "createdAt">) => {
      if (!useApi || !numericClientId) {
        const stages = applyStageProgress(buildStages(), "app_submitted");
        const newApp: StudentApplication = {
          ...data,
          id: nextAppId(clientId),
          stages,
          currentStageKey: "app_submitted",
          createdAt: new Date().toLocaleDateString("en-IN"),
        };
        setLocalApplications((prev) => [...prev, newApp]);
        return;
      }

      const saleTypeId = resolveSaleTypeId(data.saleType);
      if (!saleTypeId) {
        toast({
          title: "Invalid sale type",
          description: "Could not resolve the selected student sale type.",
          variant: "destructive",
        });
        return;
      }

      try {
        await api.post("/api/student-applications", {
          clientId: numericClientId,
          saleTypeId,
          counsellorId,
          universityName: data.university,
          courseName: data.program || null,
          country: data.country || null,
          applicationDate: data.applicationDate || null,
          note: data.note || null,
        });
        await refetch();
        toast({
          title: "Application added",
          description: `Application for ${data.university} saved successfully.`,
        });
      } catch (error: any) {
        toast({
          title: "Failed to save application",
          description: error.response?.data?.message || error.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
    [useApi, numericClientId, clientId, resolveSaleTypeId, counsellorId, refetch, toast],
  );

  const handleDelete = useCallback(
    async (app: StudentApplication) => {
      if (!useApi && app.applicationId == null) {
        setLocalApplications((prev) => prev.filter((a) => a.id !== app.id));
        toast({ title: "Application deleted" });
        return;
      }

      if (app.applicationId == null) return;

      const queryKey = ["student-applications", numericClientId];
      const previous = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.success || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.filter((row: any) => row.applicationId !== app.applicationId),
        };
      });

      try {
        await api.delete(`/api/student-applications/${app.applicationId}`);
        await refetch();
        toast({ title: "Application deleted", description: `${app.university} removed.` });
      } catch (error: any) {
        queryClient.setQueryData(queryKey, previous);
        toast({
          title: "Failed to delete application",
          description: error.response?.data?.message || error.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
    [useApi, numericClientId, queryClient, refetch, toast],
  );

  const handleNoteUpdate = useCallback(
    async (app: StudentApplication, note: string) => {
      if (!useApi || app.applicationId == null) return;
      const queryKey = ["student-applications", numericClientId];
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.success || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((row: any) =>
            row.applicationId === app.applicationId ? { ...row, note: note || null } : row,
          ),
        };
      });
      try {
        await api.patch(`/api/student-applications/${app.applicationId}/note`, { note: note || null });
        await refetch();
        toast({ title: "Note saved" });
      } catch (error: any) {
        toast({
          title: "Failed to save note",
          description: error.response?.data?.message || error.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
    [useApi, numericClientId, queryClient, refetch, toast],
  );

  const handleUpdateStage = useCallback(
    async (appId: string, stageKey: string) => {
      const normalizedKey = normalizeStageKey(stageKey);
      const target = applications.find((app: StudentApplication) => app.id === appId);

      if (useApi && target?.applicationId) {
        const queryKey = ["student-applications", numericClientId];
        const previous = queryClient.getQueryData(queryKey);

        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.success || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((row: any) =>
              row.applicationId === target.applicationId
                ? { ...row, status: normalizedKey }
                : row,
            ),
          };
        });

        try {
          await api.patch(`/api/student-applications/${target.applicationId}/status`, {
            status: normalizedKey,
          });
          await refetch();
          if (numericClientId) {
            queryClient.invalidateQueries({ queryKey: ["client-complete", numericClientId] });
          }
          toast({
            title: "Status updated",
            description: "Application stage saved successfully.",
          });
        } catch (error: any) {
          queryClient.setQueryData(queryKey, previous);
          toast({
            title: "Failed to update status",
            description: error.response?.data?.message || error.message || "Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      setLocalApplications((prev) =>
        prev.map((app: StudentApplication) =>
          app.id === appId
            ? {
                ...app,
                currentStageKey: normalizedKey,
                stages: applyStageProgress(buildStages(), normalizedKey),
              }
            : app,
        ),
      );
    },
    [applications, useApi, numericClientId, queryClient, refetch, toast],
  );

  const handleSaveTuitionDeposit = useCallback(
    async (payload: { status: string; date: string; remarks: string }) => {
      if (!tuitionDepositApp?.applicationId) return;
      setSavingTuitionDeposit(true);
      try {
        const status = payload.status.toLowerCase();
        await api.post(
          `/api/student-applications/${tuitionDepositApp.applicationId}/tuition-deposit`,
          {
            status,
            date: payload.date || null,
            remarks: payload.remarks || null,
          },
        );
        await refetch();
        if (numericClientId) {
          queryClient.invalidateQueries({ queryKey: ["client-complete", numericClientId] });
        }
        toast({
          title: "Tuition deposit saved",
          description: `Tuition deposit recorded for ${tuitionDepositApp.university}.`,
        });
        setTuitionDepositApp(null);
      } catch (error: any) {
        toast({
          title: "Failed to save tuition deposit",
          description: error.response?.data?.message || error.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setSavingTuitionDeposit(false);
      }
    },
    [tuitionDepositApp, refetch, numericClientId, queryClient, toast],
  );

  const resolvedVariant = variant !== "default" ? variant : compact ? "compact" : "default";

  // ── Client info view (read-only list with payment add-ons) ────────────────
  if (resolvedVariant === "clientInfo") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#1A2B3B]">
              {applications.length} application{applications.length !== 1 ? "s" : ""}
            </p>
          </div>
          {readOnly && onAddApplication && (
            <Button
              size="sm"
              className="h-9 bg-[#1A2B3B] hover:bg-[#152232] text-white"
              onClick={onAddApplication}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Another Application
            </Button>
          )}
        </div>

        {!readOnly && (
          <AddApplicationForm
            onAdd={handleAdd}
            studentSaleTypes={studentSaleTypes}
            onRegisterSubmit={(fn) => {
              pendingSubmitRef.current = fn;
            }}
          />
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground italic text-center py-8 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading applications...
          </p>
        ) : (
          <div className="space-y-4">
            {applications.map((app: StudentApplication) => (
              <ApplicationCard
                key={app.id}
                app={app}
                variant="clientInfo"
                readOnly={readOnly}
                onUpdateStage={handleUpdateStage}
                onView={setViewingApp}
                onOpenTuitionDeposit={canManageTuitionDeposit ? setTuitionDepositApp : undefined}
                tuitionDepositAddOnly={tuitionDepositAddOnly}
                clientAlreadyHasTuitionDeposit={clientAlreadyHasTuitionDeposit}
              />
            ))}
          </div>
        )}

        <TuitionDepositDialog
          app={tuitionDepositApp}
          open={!!tuitionDepositApp}
          onClose={() => setTuitionDepositApp(null)}
          onSave={handleSaveTuitionDeposit}
          saving={savingTuitionDeposit}
        />
        <ViewTimelineDialog app={viewingApp} onClose={() => setViewingApp(null)} />
      </div>
    );
  }

  // ── Compact mode ──────────────────────────────────────────────────────────
  if (resolvedVariant === "compact") {
    return (
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground italic text-center py-4 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading applications...
          </p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">No student applications tracked.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {applications.map((app: StudentApplication) => (
              <ApplicationCard
                key={app.id}
                app={app}
                readOnly={readOnly}
                onUpdateStage={handleUpdateStage}
                onView={setViewingApp}
                onDelete={!readOnly ? handleDelete : undefined}
                onNoteUpdate={!readOnly ? handleNoteUpdate : undefined}
              />
            ))}
          </div>
        )}
        <ViewTimelineDialog app={viewingApp} onClose={() => setViewingApp(null)} />
      </div>
    );
  }

  // ── Full mode ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {!readOnly && (
        <AddApplicationForm
          onAdd={handleAdd}
          studentSaleTypes={studentSaleTypes}
          onRegisterSubmit={(fn) => { pendingSubmitRef.current = fn; }}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground italic text-center py-4 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading applications...
        </p>
      ) : applications.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-4">
          No student applications added yet.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {applications.length} application{applications.length !== 1 ? "s" : ""} added
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {applications.map((app: StudentApplication) => (
              <ApplicationCard
                key={app.id}
                app={app}
                readOnly={readOnly}
                onUpdateStage={handleUpdateStage}
                onView={setViewingApp}
                onDelete={handleDelete}
                onNoteUpdate={handleNoteUpdate}
                onOpenTuitionDeposit={canManageTuitionDeposit ? setTuitionDepositApp : undefined}
                tuitionDepositAddOnly={tuitionDepositAddOnly}
                clientAlreadyHasTuitionDeposit={clientAlreadyHasTuitionDeposit}
              />
            ))}
          </div>

          <TuitionDepositDialog
            app={tuitionDepositApp}
            open={!!tuitionDepositApp}
            onClose={() => setTuitionDepositApp(null)}
            onSave={handleSaveTuitionDeposit}
            saving={savingTuitionDeposit}
          />

          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{applications.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {applications.filter((a: StudentApplication) => a.currentStageKey === FINAL_STAGE_KEY).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {applications.filter((a: StudentApplication) => a.currentStageKey !== FINAL_STAGE_KEY).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">In Progress</p>
            </div>
          </div>
        </>
      )}

      <ViewTimelineDialog app={viewingApp} onClose={() => setViewingApp(null)} />
    </div>
  );
});

StudentApplicationTracker.displayName = "StudentApplicationTracker";
