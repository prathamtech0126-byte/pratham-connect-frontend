import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocation, useSearch } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckSquare,
  Eye,
  FileText,
  Loader2,
  Network,
  Pencil,
  Save,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { LeadTypeSelectWithCustom } from "@/components/leads/LeadTypeSelectWithCustom";
import {
  buildLeadTypeApiFields,
  CUSTOM_LEAD_TYPE_VALUE,
  isLeadTypeSelectionValid,
  parseCustomLeadTypeFromGroup,
} from "@/lib/lead-type-selection";
import {
  getFacebookForms,
  getMasterDistribution,
  getSaleTypes,
  importFacebookFormLeads,
  saveMasterDistribution,
  type FacebookForm,
  type FormStrategy,
  type MasterDistributionGroup,
  type SaleType,
} from "@/api/leadAutomation.api";
import {
  getMasterDistributionImport,
  setMasterDistributionImport,
  subscribeMasterDistributionImport,
} from "@/stores/masterDistributionImportStore";

type TeamMember = { id: number; name: string };

/** Stable order: same as visible form list, then any selected id not in visible */
function orderSelectedFormIds(visible: FacebookForm[], selected: Set<string>): string[] {
  const out: string[] = [];
  for (const f of visible) {
    if (selected.has(f.id)) out.push(f.id);
  }
  selected.forEach((id) => {
    if (out.indexOf(id) === -1) out.push(id);
  });
  return out;
}

const STRATEGY_OPTIONS = [
  {
    value: "round_robin",
    label: "Round Robin",
    description: "Leads rotate equally across team members in strict sequence.",
  },
  {
    value: "least_loaded",
    label: "Least Loaded",
    description: "Always assigns to the person with fewest leads today — equalizes everyone before rotating.",
  },
  {
    value: "priority_weighted",
    label: "Priority Weighted",
    description: "Weight controls how many leads per rotation. Weight 3 = 3 leads before the next person.",
  },
  {
    value: "performance_based",
    label: "Performance Based",
    description: "Round-robin base — upgrade to performance scoring when metrics are available.",
  },
];

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

// ── MemberRow ──────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  checked,
  onToggle,
  color,
  isPriority,
  savedPriority,
  onSetPriority,
  disabled,
}: {
  member: TeamMember;
  checked: boolean;
  onToggle: () => void;
  color: "blue" | "purple";
  isPriority: boolean;
  savedPriority?: number;
  onSetPriority: (val: number) => void;
  disabled?: boolean;
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
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${disabled ? "opacity-60" : ""} ${checked ? bg : neutral}`}
    >
      <Checkbox
        id={`m-${color}-${member.id}`}
        checked={checked}
        disabled={disabled}
        onCheckedChange={() => {
          if (!disabled) onToggle();
        }}
      />
      <label
        htmlFor={`m-${color}-${member.id}`}
        className={`text-sm font-medium flex-1 min-w-0 truncate ${disabled ? "cursor-default" : "cursor-pointer"}`}
      >
        {member.name}
      </label>
      {isPriority && checked && (
        <div className="flex items-center gap-1 shrink-0">
          {disabled ? (
            savedPriority != null && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                {savedPriority}
              </span>
            )
          ) : editing || !savedPriority ? (
            <>
              <Input
                type="number"
                min="1"
                max="99"
                className="h-7 w-14 text-xs px-2"
                placeholder="1–99"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSet()}
              />
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={handleSet}>
                Set
              </Button>
              {savedPriority && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] px-1"
                  onClick={() => setEditing(false)}
                >
                  ✕
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                {savedPriority}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setInputVal(String(savedPriority));
                  setEditing(true);
                }}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FacebookMasterDistribution() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const qs = useMemo(
    () => new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
    [search]
  );
  const pageId = qs.get("pageId") || "";
  const pageName = qs.get("pageName") || "Unknown Page";

  const [loading, setLoading] = useState(true);

  const importState = useSyncExternalStore(
    subscribeMasterDistributionImport,
    getMasterDistributionImport,
    getMasterDistributionImport
  );
  const workflowBusyThisPage =
    pageId !== "" && importState.phase !== "idle" && importState.pageId === pageId;

  const importProgressUi =
    importState.phase === "import" && importState.pageId === pageId ? importState : null;
  const persistUi =
    importState.phase === "persist" && importState.pageId === pageId;

  const [forms, setForms] = useState<FacebookForm[]>([]);
  const [existingStrategies, setExistingStrategies] = useState<FormStrategy[]>([]);
  const [masterGroups, setMasterGroups] = useState<MasterDistributionGroup[]>([]);
  const [saleTypes, setSaleTypes] = useState<SaleType[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedLeadType, setSelectedLeadType] = useState<string>("");
  const [customLeadTypeName, setCustomLeadTypeName] = useState("");
  const [hubMode, setHubMode] = useState(true);
  const [telecallers, setTelecallers] = useState<TeamMember[]>([]);
  const [counsellors, setCounsellors] = useState<TeamMember[]>([]);

  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());

  const [strategy, setStrategy] = useState("round_robin");
  const [assignedTcs, setAssignedTcs] = useState<Set<number>>(new Set());
  const [assignedCos, setAssignedCos] = useState<Set<number>>(new Set());
  const [weights, setWeights] = useState<Record<string, number>>({});

  const [isEditing, setIsEditing] = useState(true);
  type EditSnapshot = {
    selectedFormIds: Set<string>;
    strategy: string;
    assignedTcs: Set<number>;
    assignedCos: Set<number>;
    weights: Record<string, number>;
  };
  const editSnapshot = useRef<EditSnapshot | null>(null);

  const isPriority = strategy === "priority_weighted";

  const strategyByFormId = useMemo(() => {
    const m = new Map<string, FormStrategy>();
    existingStrategies.forEach((s) => m.set(s.formId, s));
    return m;
  }, [existingStrategies]);

  /** Forms available for the current master group (excludes individually active and other master groups). */
  const visibleForms = useMemo(
    () =>
      forms.filter((f) => {
        const s = strategyByFormId.get(f.id);
        if (s?.isActive && !s.isMasterManaged) return false;
        const groupKey =
          s?.masterDistributionGroup ??
          (s?.leadTypeId != null ? String(s.leadTypeId) : null);
        if (s?.isMasterManaged && groupKey) {
          if (selectedGroupKey && groupKey === selectedGroupKey) return true;
          return false;
        }
        return true;
      }),
    [forms, strategyByFormId, selectedGroupKey]
  );

  const activeMasterGroups = useMemo(
    () => masterGroups.filter((g) => g.isActive && g.formIds.length > 0),
    [masterGroups]
  );

  const usedLeadTypeIds = useMemo(
    () =>
      new Set(
        masterGroups
          .map((g) => g.leadTypeId)
          .filter((id): id is number => id != null)
      ),
    [masterGroups]
  );

  const applyGroupEditor = useCallback((group: MasterDistributionGroup) => {
    setSelectedGroupKey(group.masterDistributionGroup);
    const custom =
      group.saleTypeName ??
      parseCustomLeadTypeFromGroup(group.masterDistributionGroup);
    if (custom) {
      setSelectedLeadType(CUSTOM_LEAD_TYPE_VALUE);
      setCustomLeadTypeName(custom);
    } else if (group.leadTypeId != null) {
      setSelectedLeadType(String(group.leadTypeId));
      setCustomLeadTypeName("");
    } else {
      setSelectedLeadType(group.masterDistributionGroup);
      setCustomLeadTypeName("");
    }
    setSelectedFormIds(new Set(group.formIds));
    setStrategy(group.strategy || "round_robin");
    setAssignedTcs(new Set(group.assignedTelecallers));
    setAssignedCos(new Set(group.assignedCounsellors));
    const pw: Record<string, number> = {};
    Object.entries(group.priorityWeights || {}).forEach(([k, v]) => {
      pw[k] = typeof v === "number" ? v : Number(v);
    });
    setWeights(pw);
    setIsEditing(!group.isActive);
    setHubMode(false);
  }, []);

  const startNewMasterGroup = (leadTypeId: string) => {
    if (workflowBusyThisPage) return;
    setSelectedGroupKey(null);
    setSelectedLeadType(leadTypeId);
    setCustomLeadTypeName("");
    setSelectedFormIds(new Set());
    setStrategy("round_robin");
    setAssignedTcs(new Set());
    setAssignedCos(new Set());
    setWeights({});
    setIsEditing(true);
    setHubMode(false);
  };

  const allFormsSelected =
    visibleForms.length > 0 && visibleForms.every((f) => selectedFormIds.has(f.id));

  const applyMasterPayload = useCallback(
    (
      masterStrategies: FormStrategy[],
      liveForms: FacebookForm[],
      groups: MasterDistributionGroup[]
    ) => {
      setExistingStrategies(masterStrategies);
      setMasterGroups(groups);
      setForms(liveForms);
    },
    []
  );

  const loadPageData = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const [{ live }, masterPayload, tcs, cos, types] = await Promise.all([
        getFacebookForms(pageId),
        getMasterDistribution(pageId),
        fetchTelecallers(),
        fetchCounsellors(),
        getSaleTypes(),
      ]);
      setTelecallers(tcs);
      setCounsellors(cos);
      setSaleTypes(types);
      applyMasterPayload(masterPayload.strategies, live, masterPayload.groups);
      setHubMode(true);
      setSelectedGroupKey(null);
      setSelectedLeadType("");
      setCustomLeadTypeName("");
      setIsEditing(true);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [pageId, toast, applyMasterPayload]);

  useEffect(() => {
    if (!pageId) return;
    void loadPageData();
  }, [pageId, loadPageData]);

  const showEditEntry = existingStrategies.some((s) => s.isMasterManaged);

  const startEditing = () => {
    if (workflowBusyThisPage) return;
    editSnapshot.current = {
      selectedFormIds: new Set(selectedFormIds),
      strategy,
      assignedTcs: new Set(assignedTcs),
      assignedCos: new Set(assignedCos),
      weights: { ...weights },
    };
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (workflowBusyThisPage) return;
    const snap = editSnapshot.current;
    if (snap) {
      setSelectedFormIds(new Set(snap.selectedFormIds));
      setStrategy(snap.strategy);
      setAssignedTcs(new Set(snap.assignedTcs));
      setAssignedCos(new Set(snap.assignedCos));
      setWeights({ ...snap.weights });
      setIsEditing(false);
    } else {
      setHubMode(true);
      void loadPageData();
    }
  };

  const toggleForm = (id: string) => {
    if (!isEditing || workflowBusyThisPage) return;
    setSelectedFormIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAllForms = () => {
    if (!isEditing || workflowBusyThisPage) return;
    setSelectedFormIds(allFormsSelected ? new Set() : new Set(visibleForms.map((f) => f.id)));
  };

  const toggleMember = (type: "tc" | "co", id: number) => {
    if (!isEditing || workflowBusyThisPage) return;
    if (type === "tc")
      setAssignedTcs((prev) => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
    else
      setAssignedCos((prev) => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
  };

  const existingMasterIds = useMemo(() => {
    if (!selectedGroupKey) return new Set<string>();
    return new Set(
      existingStrategies
        .filter((s) => {
          const g =
            s.masterDistributionGroup ?? (s.leadTypeId != null ? String(s.leadTypeId) : null);
          return s.isMasterManaged && g === selectedGroupKey;
        })
        .map((s) => s.formId)
        .filter(Boolean) as string[]
    );
  }, [existingStrategies, selectedGroupKey]);

  const cannotPersist =
    (selectedFormIds.size === 0 && existingMasterIds.size === 0) ||
    (selectedFormIds.size > 0 && !isLeadTypeSelectionValid(selectedLeadType, customLeadTypeName));

  const saveActionLabel = (() => {
    if (!workflowBusyThisPage) return "Save";
    if (importState.phase === "persist") return "Saving…";
    if (importState.phase === "import") return `Importing ${importState.current}/${importState.total}`;
    return "Save";
  })();

  useEffect(() => {
    if (!workflowBusyThisPage) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [workflowBusyThisPage]);

  const handleSave = async () => {
    const clearingAll = selectedFormIds.size === 0 && existingMasterIds.size > 0;
    const nothingToDo = selectedFormIds.size === 0 && existingMasterIds.size === 0;

    if (nothingToDo) {
      toast({ title: "Nothing to save", description: "Select forms or change settings first.", variant: "destructive" });
      return;
    }

    const existingRun = getMasterDistributionImport();
    if (existingRun.phase !== "idle" && existingRun.pageId === pageId) {
      toast({
        title: "Please wait",
        description: "Save or lead import is still in progress for this page.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFormIds.size > 0) {
      if (!isLeadTypeSelectionValid(selectedLeadType, customLeadTypeName)) {
        toast({
          title: "Lead type required",
          description: "Select a lead type or enter a custom name (max 50 characters).",
          variant: "destructive",
        });
        return;
      }
      if (assignedTcs.size + assignedCos.size === 0) {
        toast({ title: "Select at least one team member", variant: "destructive" });
        return;
      }
      if (isPriority) {
        const ids = [...Array.from(assignedTcs), ...Array.from(assignedCos)];
        if (ids.some((id) => !weights[String(id)] || weights[String(id)] < 1)) {
          toast({ title: "Set priority for all selected members", variant: "destructive" });
          return;
        }
      }
    }

    const deactivatedFormIds = Array.from(existingMasterIds).filter((id) => !selectedFormIds.has(id));

    setMasterDistributionImport({ phase: "persist", pageId });
    try {
      await saveMasterDistribution({
        pageId,
        pageName,
        formIds: Array.from(selectedFormIds),
        deactivatedFormIds,
        strategy,
        assignedTelecallers: Array.from(assignedTcs),
        assignedCounsellors: Array.from(assignedCos),
        priorityWeights: weights,
        ...buildLeadTypeApiFields(selectedLeadType, customLeadTypeName),
        masterDistributionGroup: selectedGroupKey ?? undefined,
      });

      if (clearingAll) {
        toast({
          title: "Master distribution saved",
          description: "All forms were removed from master distribution.",
        });
        editSnapshot.current = null;
        await loadPageData();
        setHubMode(true);
        return;
      }

      const formIdsOrdered = orderSelectedFormIds(visibleForms, selectedFormIds);
      let totalImported = 0;

      if (formIdsOrdered.length > 0) {
        for (let i = 0; i < formIdsOrdered.length; i++) {
          const fid = formIdsOrdered[i];
          const formName = forms.find((f) => f.id === fid)?.name || fid;
          setMasterDistributionImport({
            phase: "import",
            pageId,
            current: i + 1,
            total: formIdsOrdered.length,
            formName,
          });
          try {
            const r = await importFacebookFormLeads(fid);
            totalImported += r.imported ?? 0;
          } catch (imErr: unknown) {
            const msg =
              (imErr as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              "Facebook import failed.";
            toast({
              title: `Import failed — ${formName}`,
              description: msg,
              variant: "destructive",
            });
            editSnapshot.current = null;
            await loadPageData();
            return;
          }
        }
      }

      const leadLine =
        formIdsOrdered.length > 0
          ? ` ${totalImported} new lead(s) imported from Facebook.`
          : "";
      toast({
        title: "Master distribution saved",
        description: `${selectedFormIds.size} form(s) updated with ${strategy.replace(/_/g, " ")}.${leadLine}`,
      });
      editSnapshot.current = null;
      await loadPageData();
      setHubMode(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: "Save failed", description: msg || "Please try again.", variant: "destructive" });
    } finally {
      setMasterDistributionImport({ phase: "idle" });
    }
  };

  const crumbFacebook = { label: "Facebook Automation", href: "/leads/automation/facebook" };

  if (!pageId) {
    return (
      <PageWrapper
        title="Master Distribution"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Automation", href: "/leads/automation" },
          crumbFacebook,
          { label: "Master Distribution" },
        ]}
      >
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Network className="h-8 w-8 mb-3 opacity-30" />
          <p className="text-sm">No page selected. Go back and select a Facebook page.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setLocation("/leads/automation/facebook")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Go back
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Master Distribution"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Automation", href: "/leads/automation" },
        crumbFacebook,
        { label: "Master Distribution" },
      ]}
      actions={
        !hubMode ? (
          !isEditing && showEditEntry ? (
            <Button
              type="button"
              variant="default"
              onClick={startEditing}
              disabled={loading || workflowBusyThisPage}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          ) : isEditing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={cancelEditing} disabled={workflowBusyThisPage}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={workflowBusyThisPage || loading || cannotPersist}
                className="gap-2 min-w-[10rem]"
              >
                {workflowBusyThisPage ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 shrink-0" />
                )}
                <span className="flex flex-col items-start min-w-0">
                  <span className="leading-tight">{saveActionLabel}</span>
                  {workflowBusyThisPage && importProgressUi && (
                    <span className="text-[10px] font-normal opacity-90 truncate max-w-[14rem] leading-tight mt-0.5">
                      {importProgressUi.formName}
                    </span>
                  )}
                </span>
              </Button>
            </div>
          ) : undefined
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-8 w-8 shrink-0"
            disabled={workflowBusyThisPage}
            title={workflowBusyThisPage ? "Wait until save and lead import finish" : undefined}
            onClick={() => {
              if (workflowBusyThisPage) return;
              setLocation("/leads/automation/facebook");
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-5 w-px bg-border shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Master distribution</p>
          <Badge variant="outline" className="text-[10px] ml-auto sm:ml-2 max-w-[min(100%,12rem)] truncate font-normal">
            {pageName}
          </Badge>
        </div>

        {hubMode && !loading ? (
          <div className="space-y-4">
            {activeMasterGroups.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Active master distributions</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {activeMasterGroups.map((group) => (
                    <Card
                      key={group.masterDistributionGroup}
                      className="cursor-pointer border-border/70 hover:border-blue-300 transition-colors"
                      onClick={() => applyGroupEditor(group)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          {(group.saleTypeName || "Lead type")} master distribution
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {group.formIds.length} form{group.formIds.length !== 1 ? "s" : ""} · Active
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active master distribution on this page yet.</p>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">New master distribution</CardTitle>
                <CardDescription className="text-xs">
                  One master distribution per lead type. Forms already active individually or in another group are hidden in the editor.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {saleTypes
                  .filter((st) => !usedLeadTypeIds.has(st.id))
                  .map((st) => (
                    <Button
                      key={st.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={workflowBusyThisPage}
                      onClick={() => startNewMasterGroup(String(st.id))}
                    >
                      {st.saleType}
                    </Button>
                  ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={workflowBusyThisPage}
                  onClick={() => startNewMasterGroup(CUSTOM_LEAD_TYPE_VALUE)}
                >
                  Custom…
                </Button>
                {saleTypes.filter((st) => !usedLeadTypeIds.has(st.id)).length === 0 ? (
                  <p className="text-xs text-muted-foreground w-full">
                    All catalog lead types already have a master group. You can still add a custom type.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!hubMode ? (
        <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-4 rounded-xl border">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full shrink-0 h-8 w-8"
              disabled={workflowBusyThisPage}
              onClick={() => {
                if (workflowBusyThisPage) return;
                setHubMode(true);
                void loadPageData();
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Network className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Shared strategy & team</h2>
                {!isEditing && showEditEntry && (
                  <Badge variant="secondary" className="text-[10px] gap-1 font-semibold">
                    <Eye className="h-3 w-3" /> View only
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Activate multiple forms with one strategy. Forms already turned on individually do not appear here.
                Use <span className="font-semibold text-foreground">Edit</span> to change selection, strategy, or team.
              </p>
            </div>
          </div>
        </div>

        {importProgressUi && (
          <Card className="border-blue-200 bg-blue-50/40">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-blue-900">
                <span>Pulling leads from Facebook</span>
                <span className="tabular-nums text-blue-700">
                  {importProgressUi.current} / {importProgressUi.total}
                </span>
              </div>
              <Progress
                value={Math.round((importProgressUi.current / importProgressUi.total) * 100)}
                className="h-2"
              />
              <p className="text-[11px] text-muted-foreground truncate" title={importProgressUi.formName}>
                Current form: <span className="font-medium text-foreground">{importProgressUi.formName}</span>
              </p>
            </CardContent>
          </Card>
        )}
        {persistUi && (
          <p className="text-xs text-center text-muted-foreground">Saving master distribution…</p>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 h-fit">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between gap-2">
      <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
        <FileText className="h-4 w-4 text-blue-500" />
        Forms
      </CardTitle>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {selectedFormIds.size}/{visibleForms.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] px-2"
          disabled={!isEditing || workflowBusyThisPage || visibleForms.length === 0}
          onClick={toggleAllForms}
        >
          {allFormsSelected ? "None" : "All"}
        </Button>
      </div>
    </div>
    <CardDescription className="text-xs">
      Deselect a master-managed form to deactivate it. You can save with no forms selected to clear master distribution.
    </CardDescription>
  </CardHeader>
  <CardContent>
    {visibleForms.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground">
        <FileText className="h-6 w-6 mx-auto mb-2 opacity-30" />
        <p className="text-xs">
          {forms.length === 0
            ? "No live forms for this page."
            : "All live forms are active outside master distribution."}
        </p>
      </div>
    ) : (
      /* 
         Changed: Removed fixed small height. 
         Added h-[720px] to match the right side height.
         Added lg:max-h-[calc(100vh-300px)] for better responsiveness on different screens.
      */
      <ScrollArea className="h-[720px] lg:max-h-[calc(100vh-280px)] pr-2">
        <div className="space-y-2 pb-4">
          {visibleForms.map((form) => {
            const isMasterManaged = existingStrategies.some(
              (s) => s.formId === form.id && s.isMasterManaged
            );
            const isChecked = selectedFormIds.has(form.id);
            return (
              <label
                key={form.id}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all select-none ${
                  !isEditing ? "cursor-default opacity-95" : "cursor-pointer"
                } ${
                  isChecked
                    ? "border-blue-400 bg-blue-50/60"
                    : "border-border bg-card hover:border-blue-200 hover:bg-blue-50/20"
                }`}
              >
                <Checkbox
                  checked={isChecked}
                  disabled={!isEditing || workflowBusyThisPage}
                  onCheckedChange={() => toggleForm(form.id)}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold truncate">{form.name}</span>
                    {isMasterManaged && (
                      <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200 px-1.5 shrink-0 gap-0.5">
                        <Star className="h-2.5 w-2.5" /> Master
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground/60 truncate mt-0.5">
                    {form.id}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </ScrollArea>
    )}
  </CardContent>
</Card>


            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-4 w-4 text-blue-500" /> Lead type <span className="text-red-500">*</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    One master distribution per sale type. Locked after the group is created.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeadTypeSelectWithCustom
                    saleTypes={saleTypes}
                    selectedLeadType={selectedLeadType}
                    customLeadTypeName={customLeadTypeName}
                    onSelectedLeadTypeChange={setSelectedLeadType}
                    onCustomLeadTypeNameChange={setCustomLeadTypeName}
                    disabled={!isEditing || workflowBusyThisPage || Boolean(selectedGroupKey)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-blue-500" /> Distribution strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {STRATEGY_OPTIONS.map((opt) => {
                    const selected = strategy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!isEditing || workflowBusyThisPage}
                        onClick={() => isEditing && !workflowBusyThisPage && setStrategy(opt.value)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-150 ${
                          !isEditing ? "opacity-80 cursor-default" : ""
                        } ${
                          selected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-border bg-muted/10 hover:border-blue-200 hover:bg-blue-50/30"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                              selected ? "border-blue-500 bg-blue-500" : "border-muted-foreground/30"
                            }`}
                          >
                            {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <span className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-foreground"}`}>
                            {opt.label}
                          </span>
                        </div>
                        {selected && (
                          <p className="text-xs text-blue-600/80 mt-1.5 ml-6 leading-relaxed">{opt.description}</p>
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                    <Users className="h-4 w-4 text-blue-500" /> Team assignment{" "}
                    {selectedFormIds.size > 0 && <span className="text-red-500">*</span>}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {selectedFormIds.size === 0
                      ? "Optional when removing all forms from master distribution."
                      : "Receives leads from every selected form."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5" /> Telecallers
                      </Label>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {assignedTcs.size}/{telecallers.length}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1.5"
                          disabled={!isEditing || workflowBusyThisPage}
                          onClick={() =>
                            assignedTcs.size === telecallers.length
                              ? setAssignedTcs(new Set())
                              : setAssignedTcs(new Set(telecallers.map((t) => t.id)))
                          }
                        >
                          {assignedTcs.size === telecallers.length ? "None" : "All"}
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-56 pr-2">
                      <div className="space-y-1.5">
                        {telecallers.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">No telecallers found</p>
                        ) : (
                          telecallers.map((m) => (
                            <MemberRow
                              key={m.id}
                              member={m}
                              checked={assignedTcs.has(m.id)}
                              onToggle={() => toggleMember("tc", m.id)}
                              color="blue"
                              isPriority={isPriority}
                              disabled={!isEditing || workflowBusyThisPage}
                              savedPriority={weights[String(m.id)]}
                              onSetPriority={(v) =>
                                setWeights((prev) => ({ ...prev, [String(m.id)]: v }))
                              }
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-sm font-bold text-purple-600 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Counsellors
                      </Label>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {assignedCos.size}/{counsellors.length}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1.5"
                          disabled={!isEditing || workflowBusyThisPage}
                          onClick={() =>
                            assignedCos.size === counsellors.length
                              ? setAssignedCos(new Set())
                              : setAssignedCos(new Set(counsellors.map((c) => c.id)))
                          }
                        >
                          {assignedCos.size === counsellors.length ? "None" : "All"}
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-56 pr-2">
                      <div className="space-y-1.5">
                        {counsellors.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">No counsellors found</p>
                        ) : (
                          counsellors.map((m) => (
                            <MemberRow
                              key={m.id}
                              member={m}
                              checked={assignedCos.has(m.id)}
                              onToggle={() => toggleMember("co", m.id)}
                              color="purple"
                              isPriority={isPriority}
                              disabled={!isEditing || workflowBusyThisPage}
                              savedPriority={weights[String(m.id)]}
                              onSetPriority={(v) =>
                                setWeights((prev) => ({ ...prev, [String(m.id)]: v }))
                              }
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>

              {isEditing && (
                <Button
                  type="button"
                  className="w-full h-auto min-h-[48px] py-3 flex flex-col gap-1"
                  size="lg"
                  onClick={() => void handleSave()}
                  disabled={workflowBusyThisPage || cannotPersist}
                >
                  <span className="flex items-center justify-center gap-2 w-full">
                    {workflowBusyThisPage ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <CheckSquare className="h-4 w-4 shrink-0" />
                    )}
                    <span className="leading-tight">
                      {workflowBusyThisPage
                        ? saveActionLabel
                        : selectedFormIds.size === 0 && existingMasterIds.size > 0
                          ? "Remove all forms from master distribution"
                          : selectedFormIds.size === 0
                            ? "Nothing to save yet"
                            : `Save ${selectedFormIds.size} form(s)`}
                    </span>
                  </span>
                  {workflowBusyThisPage && importProgressUi && (
                    <span className="text-[11px] font-normal opacity-95 truncate max-w-full px-1">
                      {importProgressUi.formName}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
        </div>
        ) : null}
      </div>
    </PageWrapper>
  );
}
