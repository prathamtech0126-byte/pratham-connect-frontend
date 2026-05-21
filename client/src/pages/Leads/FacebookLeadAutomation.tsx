import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canUseCsvImportExport } from "@/lib/lead-permissions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import api from "@/lib/api";
import { LeadTypeSelectWithCustom } from "@/components/leads/LeadTypeSelectWithCustom";
import {
  buildLeadTypeApiFields,
  initLeadTypeState,
  isLeadTypeSelectionValid,
} from "@/lib/lead-type-selection";
import {
  getSaleTypes,
  type SaleType,
  disconnectFacebook,
  exportFormLeadsCsv,
  getFacebookActiveForms,
  getFacebookAuthUrl,
  getFacebookForms,
  getFacebookPages,
  getFacebookStatus,
  getFormStatsBulk,
  importFacebookFormLeads,
  getFormLeadsPaginated,
  getFormStats,
  getFormStrategy,
  setFacebookFormStrategy,
  toggleFacebookForm,
  type ActiveFormMap,
  type FacebookForm,
  type FacebookPage,
  type FacebookStatus,
  type FormStats,
  type FormStrategy,
  type PaginatedLead,
} from "@/api/leadAutomation.api";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Facebook,
  FileText,
  Hash,
  Info,
  Inbox,
  LayoutGrid,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Network,
  Pencil,
  Phone,
  RefreshCcw,
  Save,
  Settings2,
  Star,
  TrendingUp,
  Users,
  UserCheck,
  Archive,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ────────────────────────────────────────────────────────────────────

type TeamMember = { id: number; name: string };

const STRATEGY_OPTIONS = [
  {
    value: "round_robin",
    label: "Round Robin",
    description: "Leads rotate equally across team members in strict sequence.",
  },
  {
    value: "least_loaded",
    label: "Least Loaded",
    description:
      "Always assigns to the person with fewest leads today — equalizes everyone to the same level before rotating.",
  },
  {
    value: "priority_weighted",
    label: "Priority Weighted",
    description:
      "Weight controls how many leads per rotation. Weight 3 = 3 leads before the next person.",
  },
  {
    value: "performance_based",
    label: "Performance Based",
    description: "Round-robin base — upgrade to performance scoring when metrics are available.",
  },
];

const STRATEGY_LABEL: Record<string, string> = {
  round_robin: "Round Robin",
  least_loaded: "Least Loaded",
  priority_weighted: "Priority Weighted",
  performance_based: "Performance Based",
};

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchTelecallers(): Promise<TeamMember[]> {
  const res = await api.get("/api/users/telecallers");
  return (res.data.data || []).map((u: any) => ({
    id: Number(u.id),
    name: u.fullName || u.full_name || u.name || u.username || "Unknown",
  }));
}

async function fetchCounsellors(): Promise<TeamMember[]> {
  const res = await api.get("/api/users/counsellors");
  return (res.data.data || []).map((u: any) => ({
    id: Number(u.id),
    name: u.fullName || u.full_name || u.name || u.username || "Unknown",
  }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TokenCountdown({ expiresAt }: { expiresAt: string | null }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setLabel("Expired"); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      setLabel(days > 0 ? `Token: ${days}d ${hours}h left` : `Token: ${hours}h left`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt || !label) return null;
  const nearExpiry = new Date(expiresAt).getTime() - Date.now() < 7 * 24 * 3600000;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] gap-1 ${nearExpiry ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-green-400 border-green-500/20 bg-green-500/5"}`}
    >
      <Clock className="h-2.5 w-2.5" />{label}
    </Badge>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-1 min-w-0">
      {icon && <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground capitalize">{label}</p>
        <p className="font-medium truncate text-xs">{value}</p>
      </div>
    </div>
  );
}

function LeadRow({ lead }: { lead: PaginatedLead }) {
  const [expanded, setExpanded] = useState(false);
  const name = lead.fullName || "Unknown";
  const assignedTo = lead.telecallerName || lead.counsellorName || "";
  const date = lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "";
  const customAnswers = lead.customAnswers || {};

  return (
    <div className="rounded-lg border bg-background overflow-hidden text-xs">
      <div
        className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 text-sm">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{name}</p>
          <div className="flex items-center gap-3 text-muted-foreground mt-0.5 flex-wrap">
            {lead.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{lead.phone}</span>}
            {date && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{date}</span>}
            {assignedTo && <span className="flex items-center gap-0.5 text-blue-600 font-medium">→ {assignedTo}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lead.assignmentStatus && (
            <Badge variant="outline" className="text-[9px] px-1.5 capitalize">
              {lead.assignmentStatus.replace(/_/g, " ")}
            </Badge>
          )}
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t px-3 py-3 bg-muted/10 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            {lead.email && <Detail icon={<Mail className="h-3 w-3" />} label="Email" value={lead.email} />}
            {lead.city && <Detail icon={<MapPin className="h-3 w-3" />} label="City" value={lead.city} />}
            {lead.progressStatus && <Detail icon={<Info className="h-3 w-3" />} label="Progress" value={lead.progressStatus.replace(/_/g, " ")} />}
            {lead.campaignName && <Detail icon={<Megaphone className="h-3 w-3" />} label="Campaign" value={lead.campaignName} />}
            {lead.adName && <Detail icon={<Megaphone className="h-3 w-3" />} label="Ad" value={lead.adName} />}
            {lead.formName && <Detail icon={<FileText className="h-3 w-3" />} label="Form" value={lead.formName} />}
            {lead.externalLeadId && <Detail icon={<Hash className="h-3 w-3" />} label="Lead ID" value={lead.externalLeadId} />}
          </div>
          {lead.latestNote && (
            <div className="text-muted-foreground text-[10px] italic border-t pt-2">{lead.latestNote}</div>
          )}
          {Object.keys(customAnswers).length > 0 && (
            <div className="border-t pt-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Form Answers</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(customAnswers).map(([k, v]) => (
                  <Detail key={k} icon={null} label={k.replace(/_/g, " ")} value={Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "")} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  checked,
  onToggle,
  color,
  isPriority,
  savedPriority,
  onSetPriority,
}: {
  member: TeamMember;
  checked: boolean;
  onToggle: () => void;
  color: "blue" | "purple";
  isPriority: boolean;
  savedPriority?: number;
  onSetPriority: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(savedPriority ? String(savedPriority) : "");
  const { toast } = useToast();
  const bg = color === "blue" ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200";
  const neutral = "bg-muted/10 border-transparent hover:border-border";

  const handleSet = () => {
    const n = parseInt(inputVal, 10);
    if (isNaN(n) || n < 1 || n > 99) {
      toast({ title: "Invalid priority", description: "Enter a number between 1 and 99.", variant: "destructive" });
      return;
    }
    onSetPriority(n);
    setEditing(false);
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${checked ? bg : neutral}`}>
      <Checkbox id={`m-${color}-${member.id}`} checked={checked} onCheckedChange={onToggle} />
      <label htmlFor={`m-${color}-${member.id}`} className="text-sm font-medium flex-1 cursor-pointer min-w-0 truncate">
        {member.name}
      </label>
      {isPriority && checked && (
        <div className="flex items-center gap-1 shrink-0">
          {editing || !savedPriority ? (
            <>
              <Input type="number" min="1" max="99" className="h-7 w-14 text-xs px-2" placeholder="1–99" value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSet()} />
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={handleSet}>Set</Button>
              {savedPriority && <Button size="sm" variant="ghost" className="h-7 text-[10px] px-1" onClick={() => setEditing(false)}>✕</Button>}
            </>
          ) : (
            <>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">{savedPriority}</span>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setInputVal(String(savedPriority)); setEditing(true); }}>
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Paginated leads panel ─────────────────────────────────────────────────────

function LeadsTab({
  formId,
  formName,
  listMaxClass = "max-h-72",
}: {
  formId: string;
  formName: string;
  listMaxClass?: string;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unassigned">("all");
  const [data, setData] = useState<{ data: PaginatedLead[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const limit = 20;

  const load = useCallback(async (p: number, f: "all" | "unassigned") => {
    setLoading(true);
    try {
      const res = await getFormLeadsPaginated(formId, p, limit, f);
      setData(res);
    } catch {
      toast({ title: "Failed to load leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(page, filter); }, [page, filter]);

  const handleFilter = (f: "all" | "unassigned") => {
    setFilter(f);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {(["all", "unassigned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${filter === f ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "All Leads" : "Unassigned"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {data && <span className="text-xs text-muted-foreground">{data.total} leads</span>}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportFormLeadsCsv(formId, formName)}>
            <Download className="h-3 w-3" /> Export CSV
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => load(page, filter)}>
            <RefreshCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="h-6 w-6 mx-auto mb-2 opacity-30" />
          <p className="text-xs">{filter === "unassigned" ? "No unassigned leads." : "No leads imported yet."}</p>
        </div>
      ) : (
        <div className={`space-y-1.5 overflow-y-auto pr-1 ${listMaxClass}`}>
          {data.data.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">{page} / {data.totalPages}</span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Stats row ──────────────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: FormStats }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      <div className="bg-muted/30 rounded-lg p-2.5 text-center border">
        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Total</p>
        <p className="text-xl font-black text-foreground">{stats.totalLeads}</p>
      </div>
      <div className="bg-green-50 rounded-lg p-2.5 text-center border border-green-100">
        <p className="text-[10px] text-green-600 uppercase font-bold mb-0.5">Assigned</p>
        <p className="text-xl font-black text-green-700">{stats.distributedLeads}</p>
      </div>
      <div className="bg-amber-50 rounded-lg p-2.5 text-center border border-amber-100">
        <p className="text-[10px] text-amber-600 uppercase font-bold mb-0.5">Unassigned</p>
        <p className="text-xl font-black text-amber-700">{stats.unassignedLeads}</p>
      </div>
    </div>
  );
}

// ── Form accordion item ───────────────────────────────────────────────────────

function FormItem({
  form,
  activeForms,
  formStrategies,
  busyFormId,
  selectedPage,
  onToggle,
  onConfigure,
  onStatsRefresh,
  onImportOnlyLeads,
  importBusyId,
  onOpenManualDistribution,
  onGoMasterDistribution,
  preloadedStats,
  archivedMeta = false,
  archivedSectionOpen = false,
}: {
  form: FacebookForm;
  activeForms: ActiveFormMap;
  formStrategies: Record<string, FormStrategy>;
  busyFormId: string | null;
  selectedPage: FacebookPage | null;
  onToggle: (form: FacebookForm) => void;
  onConfigure: (form: FacebookForm) => void;
  onStatsRefresh: (formId: string) => void;
  onImportOnlyLeads?: (form: FacebookForm) => void;
  importBusyId?: string | null;
  onOpenManualDistribution: (formId?: string) => void;
  onGoMasterDistribution: () => void;
  /** Bulk stats for list header (always loaded); expanded fetch overrides when available */
  preloadedStats?: FormStats | null;
  archivedMeta?: boolean;
  archivedSectionOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "leads">("overview");
  const [stats, setStats] = useState<FormStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const { toast } = useToast();

  const active = Boolean(activeForms[form.id]?.active);
  const savedStrategy = formStrategies[form.id];
  const isMasterManaged = Boolean(savedStrategy?.isMasterManaged);
  const tcCount = savedStrategy?.assignedTelecallers?.length ?? 0;
  const coCount = savedStrategy?.assignedCounsellors?.length ?? 0;
  const configured = Boolean(savedStrategy?.strategy && (tcCount + coCount) > 0);
  const strategyLabel = configured
    ? (STRATEGY_LABEL[savedStrategy!.strategy!] || savedStrategy!.strategy)
    : null;

  const headerStats = stats ?? preloadedStats ?? null;

  useEffect(() => {
    const needStatsBucket = expanded || (archivedMeta && archivedSectionOpen);
    if (!needStatsBucket || stats !== null) return;
    setLoadingStats(true);
    getFormStats(form.id)
      .then(setStats)
      .catch(() => null)
      .finally(() => setLoadingStats(false));
  }, [expanded, archivedMeta, archivedSectionOpen, form.id, stats]);

  const refreshStats = async () => {
    setLoadingStats(true);
    try {
      const s = await getFormStats(form.id);
      setStats(s);
      onStatsRefresh(form.id);
    } catch { /* ignore */ }
    finally { setLoadingStats(false); }
  };

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-200 ${
        archivedMeta
          ? "border-border/70 bg-muted/10"
          : active
            ? "border-blue-400/50 bg-blue-50/20"
            : "border-border bg-card"
      }`}
    >
      {/* Header — stack actions below meta on narrow screens so nothing overlaps */}
      <div
        className="p-4 flex flex-col gap-3 md:flex-row md:items-start md:gap-3 cursor-pointer select-none group"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex gap-2 md:gap-3 min-w-0 flex-1">
          <span className="shrink-0 pt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm min-w-0 break-words ${archivedMeta ? "text-muted-foreground" : ""}`}>
              {form.name}
            </span>
            {!archivedMeta && isMasterManaged && (
              <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200 px-1.5 shrink-0 gap-0.5">
                <Star className="h-2.5 w-2.5" /> Master
              </Badge>
            )}
            {!archivedMeta && strategyLabel && (
              <Badge variant="secondary" className="text-[9px] px-1.5 shrink-0">{strategyLabel}</Badge>
            )}
            {!archivedMeta && configured && (
              <Badge variant="outline" className="text-[9px] px-1.5 shrink-0">{tcCount + coCount} members</Badge>
            )}
            {!archivedMeta && !configured && (
              <Badge variant="outline" className="text-[9px] px-1.5 text-amber-600 border-amber-300 bg-amber-50 shrink-0">
                Configure first
              </Badge>
            )}
            {!archivedMeta && headerStats && (
              <>
                <Badge variant="outline" className="text-[9px] px-1.5 shrink-0 tabular-nums">
                  Total: {headerStats.totalLeads ?? 0}
                </Badge>
                {(headerStats.distributedLeads ?? 0) > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 text-green-700 border-green-300 bg-green-50 shrink-0 tabular-nums">
                    {headerStats.distributedLeads} assigned
                  </Badge>
                )}
                {(headerStats.unassignedLeads ?? 0) > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 text-amber-600 border-amber-300 shrink-0 tabular-nums">
                    Unassigned: {headerStats.unassignedLeads}
                  </Badge>
                )}
              </>
            )}
            {loadingStats && !headerStats && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
            )}
          </div>
          {archivedMeta ? (
            <p className="text-[10px] font-mono text-muted-foreground/70 truncate mt-0.5">{form.id}</p>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${active ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
              <span className={`text-[10px] font-semibold ${active ? "text-green-600" : "text-muted-foreground"}`}>
                {active ? "Active Sync" : "Inactive"}
              </span>
              <span className="text-muted-foreground/50 text-[10px]">·</span>
              <span className="text-[10px] font-mono text-muted-foreground/60 truncate">{form.id}</span>
            </div>
          )}
          </div>
        </div>

        {!archivedMeta && (
          <div
            className="flex flex-wrap items-center gap-2 w-full md:w-auto md:shrink-0 md:justify-end md:ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {active ? (
              <>
                <div className="relative group/cfg">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-semibold px-2.5 opacity-40 cursor-not-allowed" disabled>
                    <Settings2 className="h-3 w-3 mr-1" /> Configure
                  </Button>
                  <div className="absolute right-0 top-full mt-1 bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover/cfg:opacity-100 transition-opacity pointer-events-none z-10">
                    Deactivate form to edit configuration
                  </div>
                </div>
                {isMasterManaged ? (
                  <div className="relative group/master">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] font-semibold px-3 opacity-50 cursor-not-allowed border-blue-300 text-blue-700"
                      disabled
                    >
                      <Star className="h-3 w-3 mr-1" /> Master managed
                    </Button>
                    <div className="absolute right-0 top-full mt-1 bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover/master:opacity-100 transition-opacity pointer-events-none z-10 max-w-[220px] text-center leading-relaxed">
                      Managed via Master Distribution. Click Master Distribution to deactivate.
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="destructive" className="h-7 text-[10px] font-semibold px-3" disabled={busyFormId === form.id} onClick={() => onToggle(form)}>
                    {busyFormId === form.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Deactivate"}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="h-7 text-[10px] font-semibold px-2.5" onClick={() => onConfigure(form)}>
                  <Settings2 className="h-3 w-3 mr-1" /> Configure
                </Button>
                {onImportOnlyLeads && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Pull leads from Facebook without auto-assign"
                    className="h-7 text-[10px] font-semibold px-2.5 gap-1"
                    disabled={(importBusyId ?? busyFormId) === form.id}
                    onClick={() => onImportOnlyLeads(form)}
                  >
                    {importBusyId === form.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Inbox className="h-3 w-3" />
                    )}
                    Import only
                  </Button>
                )}
                <div className="relative group/act">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] font-semibold px-3 border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 min-w-[72px]"
                    disabled={busyFormId === form.id || !configured}
                    onClick={() => configured ? onToggle(form) : undefined}
                  >
                    {busyFormId === form.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Activate"}
                  </Button>
                  {!configured && (
                    <div className="absolute right-0 top-full mt-1 bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover/act:opacity-100 transition-opacity pointer-events-none z-10">
                      Configure strategy first
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t bg-muted/10 rounded-b-xl">
          <div className="flex items-center gap-0 border-b px-4 pt-3">
            {(["overview", "leads"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize border-b-2 -mb-px transition-colors ${activeTab === tab ? "border-blue-500 text-blue-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === "overview" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {!archivedMeta && active && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live Sync Active
                      </Badge>
                    )}
                    {!archivedMeta && strategyLabel && (
                      <Badge variant="secondary" className="text-[10px]">{strategyLabel}</Badge>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={refreshStats}>
                    <RefreshCcw className={`h-3 w-3 ${loadingStats ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                {loadingStats ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
                ) : stats ? (
                  <StatsRow stats={stats} />
                ) : null}
                {!archivedMeta && !active && stats && stats.unassignedLeads > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 border-blue-300 text-blue-700 hover:bg-blue-50 text-xs"
                    onClick={() => onOpenManualDistribution(form.id)}
                  >
                    Distribute {stats.unassignedLeads} unassigned lead(s)
                  </Button>
                )}
              </div>
            )}

            {activeTab === "leads" && (
              <LeadsTab
                formId={form.id}
                formName={form.name}
                listMaxClass={archivedMeta ? "max-h-[min(70vh,560px)]" : "max-h-72"}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Configuration view ────────────────────────────────────────────────────────

function ConfigurationView({
  form,
  selectedPage,
  telecallers,
  counsellors,
  onBack,
  onSaved,
}: {
  form: FacebookForm;
  selectedPage: FacebookPage | null;
  telecallers: TeamMember[];
  counsellors: TeamMember[];
  onBack: () => void;
  onSaved: (formId: string, strategy: FormStrategy) => void;
}) {
  const { toast } = useToast();
  const [selectedStrategy, setSelectedStrategy] = useState("round_robin");
  const [assignedTcs, setAssignedTcs] = useState<Set<number>>(new Set());
  const [assignedCos, setAssignedCos] = useState<Set<number>>(new Set());
  const [priorityMap, setPriorityMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saleTypes, setSaleTypes] = useState<SaleType[]>([]);
  const [selectedLeadType, setSelectedLeadType] = useState<string>("");
  const [customLeadTypeName, setCustomLeadTypeName] = useState("");
  const isPriority = selectedStrategy === "priority_weighted";
  const allTcsSelected = telecallers.length > 0 && assignedTcs.size === telecallers.length;
  const allCosSelected = counsellors.length > 0 && assignedCos.size === counsellors.length;
  const selectedMembers = [...Array.from(assignedTcs), ...Array.from(assignedCos)];
  const hasMissingPriority = isPriority && selectedMembers.some((id) => !priorityMap[String(id)] || priorityMap[String(id)] < 1);

  // useEffect(() => {
  //   setLoading(true);
  //   getFormStrategy(form.id)
  //     .then((saved) => {
  //       if (saved) {
  //         setSelectedStrategy(saved.strategy ?? "round_robin");
  //         setAssignedTcs(new Set(saved.assignedTelecallers));
  //         setAssignedCos(new Set(saved.assignedCounsellors));
  //         const pw: Record<string, number> = {};
  //         Object.entries(saved.priorityWeights || {}).forEach(([k, v]) => { pw[k] = v; });
  //         setPriorityMap(pw);
  //       }
  //     })
  //     .catch(() => null)
  //     .finally(() => setLoading(false));
  // }, [form.id]);

  useEffect(() => {
    setLoading(true);
  
    Promise.all([
      getFormStrategy(form.id),
      getSaleTypes(),
    ])
      .then(([saved, types]) => {
        setSaleTypes(types);
  
        if (saved) {
          setSelectedStrategy(saved.strategy ?? "round_robin");
          setAssignedTcs(new Set(saved.assignedTelecallers));
          setAssignedCos(new Set(saved.assignedCounsellors));
          const leadTypeState = initLeadTypeState(saved);
          setSelectedLeadType(leadTypeState.selectedLeadType);
          setCustomLeadTypeName(leadTypeState.customLeadTypeName);
  
          const pw: Record<string, number> = {};
          Object.entries(saved.priorityWeights || {}).forEach(([k, v]) => {
            pw[k] = v;
          });
  
          setPriorityMap(pw);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [form.id]);


  const handleSave = async () => {
    if (!isLeadTypeSelectionValid(selectedLeadType, customLeadTypeName)) {
      toast({
        title: "Lead type required",
        description: "Please select lead type or enter a custom name (max 50 characters).",
        variant: "destructive",
      });
      return;
    }
    if (isPriority && hasMissingPriority) {
      toast({ title: "Set priority for all selected members", variant: "destructive" });
      return;
    }
    if (selectedStrategy !== "skill_based" && assignedTcs.size + assignedCos.size === 0) {
      toast({ title: "Select at least one team member", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const saved = await setFacebookFormStrategy({
        formId: form.id,
        distributionStrategy: selectedStrategy,
        assignedTelecallers: Array.from(assignedTcs),
        assignedCounsellors: Array.from(assignedCos),
        priorityWeights: priorityMap,
        ...buildLeadTypeApiFields(selectedLeadType, customLeadTypeName),
        formName: form.name,
        pageId: selectedPage?.id,
        pageName: selectedPage?.name,
      });
      toast({ title: "Configuration Saved", description: `"${form.name}" configured with ${STRATEGY_LABEL[selectedStrategy] || selectedStrategy}.` });
      onSaved(form.id, saved);
    } catch {
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (type: "tc" | "co", id: number) => {
    if (type === "tc") setAssignedTcs((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    else setAssignedCos((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{form.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[9px] font-mono px-1.5">ID: {form.id}</Badge>
              {selectedPage && <span className="text-[10px] font-semibold text-muted-foreground uppercase">{selectedPage.name}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={handleSave} disabled={saving || loading || hasMissingPriority} className="shrink-0">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Configuration
          </Button>
          {hasMissingPriority && <p className="text-xs text-red-500">Set priority for all selected members.</p>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3">
  <CardHeader className="pb-3">
    <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
      <FileText className="h-4 w-4 text-blue-500" />
      Lead Type <span className="text-red-500">*</span>
    </CardTitle>

    <CardDescription className="text-xs">
      Select lead type for this form.
    </CardDescription>
  </CardHeader>

  <CardContent>
    <LeadTypeSelectWithCustom
      saleTypes={saleTypes}
      selectedLeadType={selectedLeadType}
      customLeadTypeName={customLeadTypeName}
      onSelectedLeadTypeChange={setSelectedLeadType}
      onCustomLeadTypeNameChange={setCustomLeadTypeName}
      triggerClassName="w-full"
    />
  </CardContent>
</Card>
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-blue-500" /> Distribution Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STRATEGY_OPTIONS.map((opt) => {
                const selected = selectedStrategy === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setSelectedStrategy(opt.value)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-150 ${selected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-border bg-muted/10 hover:border-blue-200 hover:bg-blue-50/30"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${selected ? "border-blue-500 bg-blue-500" : "border-muted-foreground/30"}`}>
                        {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-foreground"}`}>{opt.label}</span>
                    </div>
                    {selected && <p className="text-xs text-blue-600/80 mt-1.5 ml-6.5 leading-relaxed pl-0.5">{opt.description}</p>}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                <Users className="h-4 w-4 text-blue-500" /> Team Assignment <span className="text-red-500">*</span>
              </CardTitle>
              <CardDescription className="text-xs">Select at least one member. Strategy determines distribution.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-sm font-bold text-blue-600 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Telecallers</Label>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">{assignedTcs.size}/{telecallers.length}</Badge>
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => allTcsSelected ? setAssignedTcs(new Set()) : setAssignedTcs(new Set(telecallers.map((t) => t.id)))}>
                      {allTcsSelected ? "None" : "All"}
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-56 pr-2">
                  <div className="space-y-1.5">
                    {telecallers.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No telecallers found</p> : telecallers.map((m) => (
                      <MemberRow key={m.id} member={m} checked={assignedTcs.has(m.id)} onToggle={() => toggleMember("tc", m.id)} color="blue" isPriority={isPriority} savedPriority={priorityMap[String(m.id)]} onSetPriority={(v) => setPriorityMap((prev) => ({ ...prev, [String(m.id)]: v }))} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-sm font-bold text-purple-600 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Counsellors</Label>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">{assignedCos.size}/{counsellors.length}</Badge>
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => allCosSelected ? setAssignedCos(new Set()) : setAssignedCos(new Set(counsellors.map((c) => c.id)))}>
                      {allCosSelected ? "None" : "All"}
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-56 pr-2">
                  <div className="space-y-1.5">
                    {counsellors.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No counsellors found</p> : counsellors.map((m) => (
                      <MemberRow key={m.id} member={m} checked={assignedCos.has(m.id)} onToggle={() => toggleMember("co", m.id)} color="purple" isPriority={isPriority} savedPriority={priorityMap[String(m.id)]} onSetPriority={(v) => setPriorityMap((prev) => ({ ...prev, [String(m.id)]: v }))} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FacebookLeadAutomation() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [status, setStatus] = useState<FacebookStatus | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [forms, setForms] = useState<FacebookForm[]>([]);
  const [archivedForms, setArchivedForms] = useState<FacebookForm[]>([]);
  const [activeForms, setActiveForms] = useState<ActiveFormMap>({});
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);
  const [telecallers, setTelecallers] = useState<TeamMember[]>([]);
  const [counsellors, setCounsellors] = useState<TeamMember[]>([]);
  const [formStrategies, setFormStrategies] = useState<Record<string, FormStrategy>>({});
  const [formStatsBulk, setFormStatsBulk] = useState<Record<string, FormStats>>({});

  const [loading, setLoading] = useState(false);
  const [formsLoading, setFormsLoading] = useState(false);
  const [busyFormId, setBusyFormId] = useState<string | null>(null);
  const [importBusyId, setImportBusyId] = useState<string | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [viewingForm, setViewingForm] = useState<FacebookForm | null>(null);

  const _formCache = useRef<Map<string, { forms: FacebookForm[]; archived: FacebookForm[]; strategies: Record<string, FormStrategy> }>>(new Map());
  const fetchFormsFreshAfterConnectRef = useRef(false);

  const loadInitialData = useCallback(async (forceRefreshPages = false) => {
    setLoading(true);
    try {
      const [statusData, activeData] = await Promise.all([getFacebookStatus(), getFacebookActiveForms()]);
      setActiveForms(activeData);

      if (statusData.isExpired) {
        await disconnectFacebook().catch(() => null);
        setStatus({ ...statusData, connected: false });
        toast({ title: "Facebook Session Expired", description: "Your 60-day token expired. Please reconnect.", variant: "destructive" });
        return;
      }

      setStatus(statusData);

      if (statusData.connected) {
        const pageData = await getFacebookPages(forceRefreshPages);
        if (Array.isArray(pageData) && pageData.length > 0) {
          setPages(pageData);
          setSelectedPage((prev) => prev ?? pageData[0]);
        }
      }
    } catch (err: any) {
      toast({ title: "Sync Error", description: err?.response?.data?.message || "Unable to sync. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeamMembers = useCallback(async () => {
    try {
      const [tcs, cos] = await Promise.all([fetchTelecallers(), fetchCounsellors()]);
      setTelecallers(tcs);
      setCounsellors(cos);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    if (user && canUseCsvImportExport(user.role)) {
      const params = new URLSearchParams(window.location.search);
      const justConnected = params.get("connected") === "1";
      if (justConnected) {
        window.history.replaceState({}, "", window.location.pathname);
        _formCache.current.clear();
        fetchFormsFreshAfterConnectRef.current = true;
      }
      loadInitialData(justConnected);
      loadTeamMembers();
    }
  }, [user?.id]);

  const loadFormsAndStrategies = useCallback(async (
    pageId: string,
    forceRefresh = false,
    logContext?: "post_connect" | "manual"
  ) => {
    if (!forceRefresh && _formCache.current.has(pageId)) {
      const cached = _formCache.current.get(pageId)!;
      setForms(cached.forms);
      setArchivedForms(cached.archived);
      setFormStrategies(cached.strategies);
      // Load bulk stats for cached forms too
      if (cached.forms.length > 0) {
        getFormStatsBulk(cached.forms.map((f) => f.id))
          .then((bulk) => setFormStatsBulk(bulk as Record<string, FormStats>))
          .catch(() => null);
      }
      return;
    }
    setFormsLoading(true);
    setForms([]);
    setArchivedForms([]);
    setFormStrategies({});
    setFormStatsBulk({});
    try {
      const { live, archived } = await getFacebookForms(pageId, forceRefresh, logContext);
      const strategies = await Promise.all(live.map((f) => getFormStrategy(f.id).catch(() => null)));
      const stratMap: Record<string, FormStrategy> = {};
      strategies.forEach((s, i) => { if (s) stratMap[live[i].id] = s; });
      setForms(live);
      setArchivedForms(archived);
      setFormStrategies(stratMap);
      _formCache.current.set(pageId, { forms: live, archived, strategies: stratMap });

      // Load bulk stats in background
      if (live.length > 0) {
        getFormStatsBulk(live.map((f) => f.id))
          .then((bulk) => setFormStatsBulk(bulk as Record<string, FormStats>))
          .catch(() => null);
      }
    } catch {
      setForms([]);
    } finally {
      setFormsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPage?.id && status?.connected) {
      const freshAfterConnect = fetchFormsFreshAfterConnectRef.current;
      if (freshAfterConnect) fetchFormsFreshAfterConnectRef.current = false;
      loadFormsAndStrategies(
        selectedPage.id,
        freshAfterConnect,
        freshAfterConnect ? "post_connect" : undefined
      );
    }
  }, [selectedPage?.id, status?.connected, loadFormsAndStrategies]);

  const onConnect = async () => {
    try {
      const url = await getFacebookAuthUrl();
      window.location.href = url;
    } catch {
      toast({ title: "Connection Failed", description: "Could not generate Facebook login URL.", variant: "destructive" });
    }
  };

  const onDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectFacebook();
      toast({ title: "Account Disconnected" });
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Disconnect Failed", description: err?.response?.data?.message || "Could not disconnect.", variant: "destructive" });
      setDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  const onToggleForm = async (form: FacebookForm) => {
    if (!selectedPage) return;
    setBusyFormId(form.id);
    try {
      const savedStrategy = formStrategies[form.id];
      const response = await toggleFacebookForm({
        pageId: selectedPage.id,
        formId: form.id,
        pageName: selectedPage.name,
        formName: form.name,
        distributionStrategy: savedStrategy?.strategy || "round_robin",
      });
      setActiveForms((prev) => ({
        ...prev,
        [form.id]: {
          ...prev[form.id],
          formId: form.id,
          formName: form.name,
          pageId: selectedPage.id,
          pageName: selectedPage.name,
          active: response.active,
          distributionStrategy: response.distributionStrategy,
          activatedAt: prev[form.id]?.activatedAt || new Date().toISOString(),
          deactivatedAt: response.active ? null : new Date().toISOString(),
        },
      }));
      toast({
        title: response.active ? "Form Activated" : "Form Deactivated",
        description: response.active ? `"${form.name}" is now syncing leads.` : `"${form.name}" has been paused.`,
      });
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.isMasterManaged) {
        toast({
          title: "Cannot deactivate directly",
          description: "This form is managed via Master Distribution. Use the Master Distribution page to deactivate it.",
          variant: "destructive",
        });
      } else {
        const msg = data?.message;
        toast({ title: msg?.includes("strategy") ? "Strategy Required" : "Toggle Failed", description: msg || "Could not update form status.", variant: "destructive" });
      }
    } finally {
      setBusyFormId(null);
    }
  };

  const handleStrategySaved = (formId: string, strategy: FormStrategy) => {
    setFormStrategies((prev) => ({ ...prev, [formId]: strategy }));
    if (selectedPage?.id) {
      const cached = _formCache.current.get(selectedPage.id);
      if (cached) {
        _formCache.current.set(selectedPage.id, { ...cached, strategies: { ...cached.strategies, [formId]: strategy } });
      }
    }
    setViewingForm(null);
  };

  const handleStatsRefresh = (_formId: string) => {
    // Per-FormItem stats; no parent action needed
  };

  const handleImportOnlyLeads = useCallback(
    async (f: FacebookForm) => {
      setImportBusyId(f.id);
      try {
        const r = await importFacebookFormLeads(f.id, { importOnly: true });
        toast({
          title: "Import finished",
          description: `${r.imported} new lead(s) imported without assignment. Use Distribute when ready.`,
        });
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string }; status?: number } })?.response?.data?.message;
        toast({
          title: "Import failed",
          description: msg || "Check that the form is inactive and try again.",
          variant: "destructive",
        });
      } finally {
        setImportBusyId(null);
      }
    },
    [toast]
  );

  const openManualDistribution = useCallback(
    (formId?: string) => {
      const q = new URLSearchParams();
      if (formId) q.set("formId", formId);
      const qs = q.toString();
      setLocation(`/leads/automation/facebook/manual-distribution${qs ? `?${qs}` : ""}`);
    },
    [setLocation]
  );

  const openMasterDistribution = useCallback(() => {
    if (!selectedPage) return;
    const q = new URLSearchParams({ pageId: selectedPage.id, pageName: selectedPage.name });
    setLocation(`/leads/automation/facebook/master-distribution?${q.toString()}`);
  }, [selectedPage, setLocation]);

  const activeCount = Object.values(activeForms).filter((f) => f.active).length;

  /** Master-managed + active forms appear together at the bottom of the list. */
  const formsSortedMasterLast = useMemo(() => {
    const isMasterActivated = (form: FacebookForm) => {
      const strat = formStrategies[form.id];
      const active = Boolean(activeForms[form.id]?.active);
      return Boolean(strat?.isMasterManaged && active);
    };
    return [...forms].sort((a, b) => {
      const rank = (f: FacebookForm) => (isMasterActivated(f) ? 1 : 0);
      return rank(a) - rank(b);
    });
  }, [forms, formStrategies, activeForms]);

  // ── Loading ──
  if (loading && !status) {
    return (
      <PageWrapper title="Facebook Automation" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Automation", href: "/leads/automation" }, { label: "Facebook" }]}>
        <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      </PageWrapper>
    );
  }

  // ── Not connected ──
  if (!status?.connected) {
    return (
      <PageWrapper title="Facebook Automation" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Automation", href: "/leads/automation" }, { label: "Facebook" }]}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center gap-2">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 shadow-inner">
            <Facebook className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connect Facebook Leads</h1>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Instantly sync leads from your Facebook Ad Forms directly into your CRM dashboard.
          </p>
          <Button size="lg" onClick={onConnect} className="bg-[#1877F2] hover:bg-[#166fe5] shadow-lg">
            <Facebook className="mr-2 h-5 w-5" /> Connect Facebook Account
          </Button>
        </div>
      </PageWrapper>
    );
  }

  // ── Configuration view ──
  if (viewingForm) {
    return (
      <PageWrapper
        title="Form Configuration"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Automation", href: "/leads/automation" }, { label: "Facebook Automation", href: "/leads/automation/facebook" }, { label: "Configure" }]}
      >
        <ConfigurationView
          form={viewingForm}
          selectedPage={selectedPage}
          telecallers={telecallers}
          counsellors={counsellors}
          onBack={() => setViewingForm(null)}
          onSaved={handleStrategySaved}
        />
      </PageWrapper>
    );
  }

  // ── Main dashboard ──
  return (
    <PageWrapper
      title="Facebook Lead Automation"
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Automation", href: "/leads/automation" }, { label: "Facebook Automation" }]}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setShowDisconnectDialog(true)} className="text-destructive hover:bg-destructive/5">
          <LogOut className="mr-2 h-4 w-4" /> Disconnect
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Back nav */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-full h-8 w-8" onClick={() => setLocation("/leads/automation")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-5 w-px bg-border" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Manage Lead Forms</p>
        </div>

        {/* Connected banner */}
        <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
            <Facebook className="h-32 w-32 rotate-12 text-white" />
          </div>
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                {status.account?.pictureUrl ? (
                  <img src={status.account.pictureUrl} className="h-16 w-16 rounded-2xl ring-4 ring-slate-800/50 object-cover border border-slate-700" alt="Avatar" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-xl text-white">FB</div>
                )}
                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 border-[3px] border-slate-900 rounded-full" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-white">{status.account?.name || "Connected Account"}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Live Sync Enabled
                  </Badge>
                  <TokenCountdown expiresAt={status.expiresAt ?? null} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 text-center min-w-[90px]">
                <span className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Total Forms</span>
                <span className="text-2xl font-black text-white">{forms.length}</span>
              </div>
              <div className="bg-green-500/10 p-3.5 rounded-2xl border border-green-500/20 text-center min-w-[90px]">
                <span className="block text-[10px] text-green-400 font-bold mb-0.5 uppercase tracking-wide">Active</span>
                <span className="text-2xl font-black text-green-400">{activeCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms card */}
        <Card>
          <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: count + action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-blue-500 shrink-0" />
              <CardTitle className="text-base font-bold">Lead Forms</CardTitle>
              {forms.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-2">{forms.length} forms</Badge>
              )}
              <div className="h-5 w-px bg-border hidden sm:block" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-semibold gap-1.5"
                onClick={openMasterDistribution}
                disabled={!selectedPage}
              >
                <Network className="h-3.5 w-3.5 shrink-0" />
                Master Distribution
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-semibold gap-1.5"
                onClick={() => openManualDistribution()}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                Manual distribution
              </Button>
            </div>

            {/* Right: page selector + refresh */}
            <div className="flex flex-wrap items-center gap-2">
              {pages.map((page) => (
                <Button
                  key={page.id}
                  variant={selectedPage?.id === page.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPage(page)}
                  className="rounded-full h-8 text-xs pl-1.5 pr-3"
                >
                  {page.pictureUrl ? (
                    <img src={page.pictureUrl} className="h-5 w-5 rounded-full mr-1.5 border border-white/30" alt="" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted mr-1.5 flex items-center justify-center text-[8px] font-bold">P</div>
                  )}
                  {page.name}
                </Button>
              ))}
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                title="Refresh forms from Facebook"
                onClick={() => {
                  _formCache.current.clear();
                  loadInitialData(true);
                  if (selectedPage?.id) loadFormsAndStrategies(selectedPage.id, true, "manual");
                }}
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${loading || formsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {formsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <p className="text-xs">Loading forms…</p>
              </div>
            ) : forms.length === 0 ? (
              <div className="py-14 text-center border-2 border-dashed rounded-xl text-muted-foreground">
                <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No lead forms found for this page.</p>
                <p className="text-xs mt-1">Click refresh to fetch forms from Facebook, or check your Ads Manager.</p>
              </div>
            ) : (
              formsSortedMasterLast.map((form) => (
                <FormItem
                  key={form.id}
                  form={form}
                  activeForms={activeForms}
                  formStrategies={formStrategies}
                  busyFormId={busyFormId}
                  selectedPage={selectedPage}
                  onToggle={onToggleForm}
                  onConfigure={setViewingForm}
                  onStatsRefresh={handleStatsRefresh}
                  onImportOnlyLeads={handleImportOnlyLeads}
                  importBusyId={importBusyId}
                  onOpenManualDistribution={openManualDistribution}
                  onGoMasterDistribution={openMasterDistribution}
                  preloadedStats={formStatsBulk[form.id] ?? null}
                />
              ))
            )}

            {/* Archived section */}
            {archivedForms.length > 0 && (
              <Collapsible open={showArchived} onOpenChange={setShowArchived} className="mt-6 border-t border-border pt-4">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 py-2 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Archive className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="flex-1">Archived forms ({archivedForms.length})</span>
                    {showArchived ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down pb-1">
                  {archivedForms.map((form) => (
                    <FormItem
                      key={form.id}
                      form={form}
                      activeForms={activeForms}
                      formStrategies={formStrategies}
                      busyFormId={busyFormId}
                      selectedPage={selectedPage}
                      onToggle={onToggleForm}
                      onConfigure={setViewingForm}
                      onStatsRefresh={handleStatsRefresh}
                      onOpenManualDistribution={openManualDistribution}
                      onGoMasterDistribution={openMasterDistribution}
                      archivedMeta
                      archivedSectionOpen={showArchived}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </Card>
      </div>

      {/* Disconnect dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Facebook Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all active form syncs and remove your Facebook connection. Existing imported leads will not be deleted. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDisconnect} disabled={disconnecting} className="bg-destructive hover:bg-destructive/90">
              {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
              Yes, Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
