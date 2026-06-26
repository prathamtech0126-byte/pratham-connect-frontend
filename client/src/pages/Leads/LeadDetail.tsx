import { useEffect, useState, useCallback, useRef } from "react";
import { useRoute, useLocation, Redirect } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, CalendarClock, Loader2 } from "lucide-react";

import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { canAccessLeads } from "@/lib/lead-permissions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeadDetailLayout } from "./LeadDetailLayout";
import { useToast } from "@/hooks/use-toast";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { SearchableAssigneePicker } from "@/components/leads/SearchableAssigneePicker";

import api from "@/lib/api";
import {
  getLeadDetail,
  updateLeadApi,
  updateLeadFieldsApi,
  assignLeadApi,
  markLeadJunkApi,
  revertLeadJunkApi,
  markLeadFollowupApi,
  addNoteApi,
  updateActivityStatusApi,
  updateLeadActivityMessageApi,
  dropLeadByCounsellorApi,
  type LeadEntity,
  type LeadEducationRow,
  type LeadFamilyMemberRow,
  type LeadLanguageScoreRow,
  type LeadStudentProfile,
  type LeadActivityEntity,
} from "@/api/leads.api";
import LeadPersonalDetailsTab, {
  buildPersonalEditState,
  type PersonalEditState,
} from "./LeadPersonalDetailsTab";
import {
  canTransferToCounsellor,
  isLeadReadOnly,
  isLeadJunk,
  isLeadConverted,
  getTransferButtonLabel,
} from "@/lib/lead-status-tags";
import { pushLeadListPatch } from "@/lib/lead-list-sync";
import { resolvePerformerDisplayName } from "@/lib/lead-performer";
import { listPatchFromLeadUpdate } from "@/lib/lead-progress-rules";
import {
  getLeadNoteDisplayMessage,
  isLeadNotesSectionActivity,
  normalizeLeadActivitiesForDisplay,
  shouldIncludeLeadTimelineActivity,
} from "@/lib/lead-activity-display";
import {
  clampFollowupDateTime,
  getMinFollowupDateTime,
  getTomorrowMorning1030,
  isFollowupDateTimeAllowed,
} from "@/lib/followup-datetime";
import { isValidLeadCity, LEAD_CITY_ERROR_MESSAGE } from "@/lib/lead-city-validation";
import type { LeadDetailMeta } from "@/api/leads.api";
import {
  resolveLeadSourceSelectValue,
  resolveLeadTypeSelectValue,
} from "@/lib/lead-source-display";

/** Select value meaning “cleared” in DB (null quality / eligibility). */
const UNSET_SELECT = "__not_assigned__";

type LeadEditForm = Partial<LeadEntity> & {
  leadSource?: string;
  leadType?: string;
  leadQuality?: LeadEntity["leadQuality"] | typeof UNSET_SELECT | "";
  eligibilityStatus?: LeadEntity["eligibilityStatus"] | typeof UNSET_SELECT | "";
};

function toLeadQualityOrNull(
  value: LeadEditForm["leadQuality"]
): LeadEntity["leadQuality"] | null {
  const raw = value as string | null | undefined;
  if (!raw || raw === UNSET_SELECT) return null;
  return raw as LeadEntity["leadQuality"];
}

function toEligibilityOrNull(
  value: LeadEditForm["eligibilityStatus"]
): LeadEntity["eligibilityStatus"] | null {
  const raw = value as string | null | undefined;
  if (!raw || raw === UNSET_SELECT) return null;
  return raw as LeadEntity["eligibilityStatus"];
}

function humanizeEnum(value?: string | null) {
  return value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Not set";
}

export default function LeadDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/leads/:id");
  const id = params?.id;

  const [lead, setLead] = useState<LeadEntity | null>(null);
  const [leadMeta, setLeadMeta] = useState<LeadDetailMeta | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [activities, setActivities] = useState<LeadActivityEntity[]>([]);
  const [profile, setProfile] = useState<LeadStudentProfile | null>(null);
  const [education, setEducation] = useState<LeadEducationRow[]>([]);
  const [languageScores, setLanguageScores] = useState<LeadLanguageScoreRow[]>([]);
  const [familyMembers, setFamilyMembers] = useState<LeadFamilyMemberRow[]>([]);
  const [personalEditing, setPersonalEditing] = useState(false);
  const [personalEditState, setPersonalEditState] = useState<PersonalEditState | null>(null);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [pendingFieldUpdate, setPendingFieldUpdate] = useState<{
    type: "eligibility" | "quality";
    value: string;
  } | null>(null);
  const [counsellors, setCounsellors] = useState<any[]>([]);
  const [telecallers, setTelecallers] = useState<any[]>([]);

  // Dropdown Lists (Matching AddLead logic)
  const [sourceOptions, setSourceOptions] = useState<any[]>([]); // from /api/lead-types
  const [typeOptions, setTypeOptions] = useState<any[]>([]);     // from /api/sale-types
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);

  // UI States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<LeadEditForm>({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showJunkModal, setShowJunkModal] = useState(false);
  const [junkReason, setJunkReason] = useState("");
  const [dropReason, setDropReason] = useState("");
  const [showCompleteFollowUpModal, setShowCompleteFollowUpModal] = useState(false);
  const [completeFollowUpActivityId, setCompleteFollowUpActivityId] = useState<number | null>(null);
  const [completeFollowUpNote, setCompleteFollowUpNote] = useState("");
  const [completeFollowUpSaving, setCompleteFollowUpSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligibilityValue, setEligibilityValue] = useState<LeadEntity["eligibilityStatus"] | "">("");
  const [qualityValue, setQualityValue] = useState<LeadEntity["leadQuality"] | "">("");

  // Note States
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [savingNoteEdit, setSavingNoteEdit] = useState(false);

  // Modal Form States
  const [selectedCounsellor, setSelectedCounsellor] = useState("");
  const [restoreTelecallerId, setRestoreTelecallerId] = useState("");
  const [restoreCounsellorId, setRestoreCounsellorId] = useState("");

  const [fNote, setFNote] = useState("");

  const [fDate, setFDate] = useState<Date | null>(null); // Change from "" to null
const [pickerOpen, setPickerOpen] = useState(false);   // New state for picker
  const isMountedRef = useRef(true);

  const getPerformerName = useCallback(
    () => resolvePerformerDisplayName(user, telecallers, counsellors),
    [user, telecallers, counsellors]
  );

  const refreshActivitiesFromServer = useCallback(async () => {
    if (!id || Number.isNaN(Number(id))) return;
    try {
      const res = await getLeadDetail(Number(id));
      if (isMountedRef.current) {
        setActivities(res.activities || []);
        if (res.meta) setLeadMeta(res.meta);
      }
    } catch {
      /* keep existing activities on refresh failure */
    }
  }, [id]);

  const addLocalLeadUpdateActivity = useCallback(
    (changes: { field: string; old: string; new: string }[]) => {
      const performer = getPerformerName();
      setActivities((prev) => [
        {
          id: -Date.now(),
          leadId: Number(id),
          userId: user?.id ? Number(user.id) : null,
          userName: performer,
          activityType: "lead_update",
          message: `${performer} updated the lead`,
          status: "completed",
          createdAt: new Date().toISOString(),
          meta: {
            eventType: "lead_updated",
            changes,
            performedByName: performer,
          },
        },
        ...prev,
      ]);
    },
    [id, user?.id, getPerformerName]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleBackNavigation = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation("/leads");
  }, [setLocation]);

  // 1. Fetch Lead Details
  const applyDetailResponse = useCallback((res: Awaited<ReturnType<typeof getLeadDetail>>) => {
    setLead(res.lead);
    setLeadMeta(res.meta ?? null);
    setActivities(res.activities || []);
    setProfile(res.profile ?? null);
    setEducation(res.education ?? []);
    setLanguageScores(res.languageScores ?? []);
    setFamilyMembers(res.familyMembers ?? []);
    setEligibilityValue(res.lead.eligibilityStatus ?? "");
    setQualityValue(res.lead.leadQuality ?? "");
    setEditForm({
      ...res.lead,
      leadSource: res.lead.leadSource || "",
      leadType: res.lead.leadType || "",
    });
  }, []);

  const fetchData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!id || Number.isNaN(Number(id))) {
        setPageLoading(false);
        return;
      }
      if (!opts?.silent) setPageLoading(true);
      try {
        const res = await getLeadDetail(Number(id));
        if (!isMountedRef.current) return;
        applyDetailResponse(res);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        if (!opts?.silent) setLead(null);
        toast({ title: "Error", description: "Failed to load lead details", variant: "destructive" });
      } finally {
        if (isMountedRef.current && !opts?.silent) setPageLoading(false);
      }
    },
    [id, toast, applyDetailResponse]
  );

  // 2. Fetch Dropdown Data (Mirroring AddLead)
  const fetchDropdownData = async () => {
    try {
      setIsLoadingDropdowns(true);
      const [sourcesRes, typesRes, counsellorsRes, telecallersRes] = await Promise.all([
        api.get("/api/lead-types"), // Used as Lead Source
        api.get("/api/sale-types"), // Used as Lead Type (Visa Category)
        user?.role === "telecaller" || user?.role === "manager"
          ? api.get("/api/leads/transfer-assignees")
          : api.get("/api/users/counsellors"),
        api.get("/api/users/telecallers") // Optional: If you want to allow transferring to telecallers as well
      ]);
      
      setSourceOptions(sourcesRes.data.data || []);
      setTypeOptions(typesRes.data.data || []);
      const raw = counsellorsRes.data?.data ?? counsellorsRes.data ?? [];
      setCounsellors(
        Array.isArray(raw)
          ? raw.map((c: { id: number; fullName: string; role?: string }) => ({
              id: Number(c.id),
              fullName: String(c.fullName ?? ""),
              role: c.role ?? null,
            }))
          : []
      );
      setTelecallers(telecallersRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch dropdown options", err);
    } finally {
      setIsLoadingDropdowns(false);
    }
  };

  useEffect(() => {
    void fetchData();
    void fetchDropdownData();
  }, [fetchData]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = ["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName);
      if (!isTyping) {
        if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          handleBackNavigation();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBackNavigation]);

  if (!user || !canAccessLeads(user.role)) return <Redirect to="/" />;


  const handleFollowupSubmit = async () => {
    if (!fDate || !lead || isLeadReadOnly(lead, user?.role)) return;

    const scheduled = clampFollowupDateTime(fDate);
    if (!isFollowupDateTimeAllowed(scheduled)) {
      toast({
        title: "Invalid date & time",
        description: "Follow-up must be today or later, and not in the past.",
        variant: "destructive",
      });
      return;
    }

    const { lead: updatedLead, activity: createdActivity } = await markLeadFollowupApi(lead.id, {
      followupAt: scheduled.toISOString(),
      message: fNote?.trim() || null,
    });

    pushLeadListPatch(lead.id, {
      ...(updatedLead as LeadEntity),
      progressStatus: "follow_up",
      pendingFollowUp: true,
    });

    setLead((prev) =>
      prev
        ? {
            ...prev,
            ...updatedLead,
            progressStatus: "follow_up",
          }
        : prev
    );
    setLeadMeta((prev) => (prev ? { ...prev, pendingFollowUp: true } : prev));
    setShowFollowupModal(false);
    setFDate(null);
    setFNote("");
    if (createdActivity?.id) {
      setActivities((prev) => [createdActivity, ...prev.filter((a) => a.id !== createdActivity.id)]);
    } else {
      await refreshActivitiesFromServer();
    }
    toast({ title: "Follow-up Scheduled" });
  };

  // --- Handlers ---
  const handleSaveEdit = async () => {
    if (!lead) return;
    const cityValue = editForm.city?.trim() ?? "";
    if (cityValue && !isValidLeadCity(cityValue)) {
      toast({
        title: "Update Failed",
        description: LEAD_CITY_ERROR_MESSAGE,
        variant: "destructive",
      });
      return;
    }
    try {
      const q = toLeadQualityOrNull(editForm.leadQuality);
      const e = toEligibilityOrNull(editForm.eligibilityStatus);
      const updated = await updateLeadApi(lead.id, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        whatsapp: editForm.whatsapp || null,
        email: editForm.email || null,
        city: editForm.city || null,
        leadSource: editForm.leadSource || null,
        leadType: editForm.leadType || null,
        ...(q !== lead.leadQuality ? { leadQuality: q } : {}),
        ...(e !== lead.eligibilityStatus ? { eligibilityStatus: e } : {}),
        latestNote: editForm.latestNote?.trim() ? editForm.latestNote.trim() : null,
      });
      const patched = { ...lead, ...updated } as LeadEntity;
      setLead(patched);
      setEditForm({
        ...patched,
        leadSource: patched.leadSource || "",
        leadType: patched.leadType || "",
      });
      pushLeadListPatch(lead.id, patched);
      addLocalLeadUpdateActivity([{ field: "Lead information", old: "—", new: "Updated" }]);
      setIsEditing(false);
      toast({ title: "Success", description: "Lead updated successfully" });
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to update lead";
      toast({ title: "Update Failed", description: message, variant: "destructive" });
    }
  };

  const handleRevertJunk = async () => {
    if (!lead || !leadMeta?.canRevertJunk) return;
    setRestoreTelecallerId("");
    setRestoreCounsellorId("");
    setShowRestoreModal(true);
  };

  const handleRestoreSubmit = async () => {
    if (!lead || !leadMeta?.canRevertJunk) return;
    if (!restoreTelecallerId && !restoreCounsellorId) {
      toast({
        title: "Select assignee",
        description: "Choose a telecaller or counsellor before restoring this lead.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSubmitting(true);
      const restored = await revertLeadJunkApi(lead.id, restoreCounsellorId
        ? { counsellorId: Number(restoreCounsellorId) }
        : { telecallerId: Number(restoreTelecallerId) });
      const patchedLead = {
        ...restored,
        isJunk: false,
        progressStatus: "not_contacted",
        assignmentStatus: restoreCounsellorId ? "transferred" : "assigned",
        eligibilityStatus: null,
        leadQuality: null,
        telecallerName: restoreCounsellorId
          ? null
          : telecallers.find((t) => String(t.id) === restoreTelecallerId)?.fullName ?? restored.telecallerName,
        counsellorName: restoreCounsellorId
          ? counsellors.find((c) => String(c.id) === restoreCounsellorId)?.fullName ?? restored.counsellorName
          : null,
      } as LeadEntity;
      setLead(patchedLead);
      setEditForm((prev) => ({ ...prev, ...patchedLead } as LeadEditForm));
      setLeadMeta((prev) => prev ? { ...prev, canRevertJunk: false, canModify: true } : prev);
      setActivities([]);
      pushLeadListPatch(lead.id, patchedLead);
      setShowRestoreModal(false);
      toast({ title: "Lead restored", description: "Lead restored from junk and assigned." });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to restore lead";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJunk = () => {
    if (!lead || user?.role === "counsellor") return;
    setJunkReason("");
    setShowJunkModal(true);
  };

  const handleJunkSubmit = async () => {
    if (!lead) return;
    if (!junkReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for marking as junk", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const noteMsg = `Marked as junk: ${junkReason.trim()}`;
      await addNoteApi(lead.id, noteMsg);
      const updated = await markLeadJunkApi(lead.id, junkReason.trim());
      const junked = { ...updated, isJunk: true, progressStatus: "junk" as const };
      setLead((prev) => (prev ? { ...prev, ...junked } : prev));
      pushLeadListPatch(lead.id, junked);
      setActivities((prev) => [
        {
          id: -Date.now(),
          leadId: lead.id,
          userId: user?.id ? Number(user.id) : null,
          userName: user?.name ?? null,
          activityType: "note",
          message: noteMsg,
          status: "completed",
          createdAt: new Date().toISOString(),
          meta: { isReasonNote: false },
        },
        ...prev,
      ]);
      setShowJunkModal(false);
      setJunkReason("");
      toast({ title: "Lead marked as junk" });
    } catch {
      toast({ title: "Failed to mark as junk", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const transferDisabledReason = (() => {
    if (!lead || isLeadReadOnly(lead, user?.role)) return undefined;
    if (leadMeta?.pendingFollowUp) return "Complete the follow-up before transfer";
    if (!lead.eligibilityStatus || !lead.leadQuality) {
      return "Set eligibility and lead quality before transfer";
    }
    return undefined;
  })();

  const convertDisabledReason = (() => {
    if (!lead || user?.role !== "counsellor") return undefined;
    if (isLeadConverted(lead)) return "Lead is already converted";
    if (isLeadReadOnly(lead, user?.role)) return undefined;
    if (!lead.eligibilityStatus || !lead.leadQuality) {
      return "Set lead quality and eligibility before converting";
    }
    if (leadMeta?.pendingFollowUp) {
      return "Complete pending follow-up before converting";
    }
    return undefined;
  })();

  const handleTransferSubmit = async () => {
    if (!lead || !selectedCounsellor) return;
    if (!canTransferToCounsellor(lead, leadMeta)) {
      toast({
        title: "Cannot transfer",
        description: leadMeta?.pendingFollowUp
          ? "Complete the follow-up first, then transfer."
          : "Set eligibility and lead quality before transferring.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSubmitting(true);
      const counsellorName =
        counsellors.find((c) => String(c.id) === selectedCounsellor)?.fullName ?? null;
      const updated = await assignLeadApi(lead.id, {
        counsellorId: Number(selectedCounsellor),
      });
      const transferred = {
        ...updated,
        assignmentStatus: "transferred" as const,
        counsellorName: updated.counsellorName ?? counsellorName,
      };
      setLead((prev) => (prev ? { ...prev, ...transferred } : prev));
      pushLeadListPatch(lead.id, transferred);
      setActivities((prev) => [
        {
          id: -Date.now(),
          leadId: lead.id,
          userId: user?.id ? Number(user.id) : null,
          userName: user?.name ?? null,
          activityType: "counselor_assign",
          message: `Lead transferred to counsellor: ${counsellorName ?? ""}`,
          status: "completed",
          createdAt: new Date().toISOString(),
          meta: { counsellorName, counsellorId: Number(selectedCounsellor) },
        },
        ...prev,
      ]);
      setShowTransferModal(false);
      toast({ title: "Lead transferred to counsellor" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Transfer failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const needsReasonForUpdate = (type: "eligibility" | "quality", value: string) => {
    const role = user?.role ?? "";
    if (role !== "telecaller" && role !== "counsellor") return false;
    if (type === "eligibility") return true;
    return value === "bad";
  };

  const submitFieldUpdate = async (
    type: "eligibility" | "quality",
    next: string,
    reason?: string
  ) => {
    if (!lead) return;
    setSubmitting(true);
    try {
      const updated = await updateLeadFieldsApi(
        lead.id,
        type === "eligibility"
          ? {
              eligibilityStatus: next as LeadEntity["eligibilityStatus"],
              ...(reason ? { reason } : {}),
            }
          : {
              leadQuality: next as LeadEntity["leadQuality"],
              ...(reason ? { reason } : {}),
            }
      );
      const fieldPatch =
        type === "eligibility"
          ? { eligibilityStatus: next as LeadEntity["eligibilityStatus"] }
          : { leadQuality: next as LeadEntity["leadQuality"] };
      const progressStatus = updated.progressStatus ?? lead.progressStatus;

      if (type === "eligibility") setEligibilityValue(next as LeadEntity["eligibilityStatus"]);
      else setQualityValue(next as LeadEntity["leadQuality"]);

      setLead((prev) =>
        prev ? { ...prev, ...fieldPatch, progressStatus } : ({ ...lead, ...fieldPatch, progressStatus } as LeadEntity)
      );
      setLeadMeta((prev) =>
        prev
          ? {
              ...prev,
              canTransfer:
                Boolean(
                  (type === "eligibility" ? next : lead.eligibilityStatus) &&
                    (type === "quality" ? next : lead.leadQuality)
                ) &&
                !prev.pendingFollowUp &&
                lead.assignmentStatus !== "transferred" &&
                lead.assignmentStatus !== "converted" &&
                progressStatus !== "converted" &&
                progressStatus !== "junk",
            }
          : prev
      );
      setEditForm((prev) => ({ ...prev, ...fieldPatch }));
      pushLeadListPatch(
        lead.id,
        listPatchFromLeadUpdate(updated, fieldPatch, lead.progressStatus)
      );

      await refreshActivitiesFromServer();

      if (reason?.trim()) {
        const reasonMsg =
          type === "eligibility"
            ? `Eligibility marked as ${humanizeEnum(next)} — ${reason.trim()}`
            : `Lead quality marked as ${humanizeEnum(next)} — ${reason.trim()}`;
        await refreshActivitiesFromServer();
      }

      toast({ title: type === "eligibility" ? "Eligibility updated" : "Lead quality updated" });
    } catch {
      toast({
        title: type === "eligibility" ? "Failed to update eligibility" : "Failed to update quality",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetEligibility = (value?: LeadEntity["eligibilityStatus"]) => {
    const next = value ?? eligibilityValue;
    if (!lead || !next || isLeadReadOnly(lead, user?.role)) return;
    if (needsReasonForUpdate("eligibility", next)) {
      setPendingFieldUpdate({ type: "eligibility", value: next });
      setReasonText("");
      setReasonModalOpen(true);
      return;
    }
    void submitFieldUpdate("eligibility", next);
  };

  const handleSetQuality = (value?: LeadEntity["leadQuality"]) => {
    const next = value ?? qualityValue;
    if (!lead || !next || isLeadReadOnly(lead, user?.role)) return;
    if (needsReasonForUpdate("quality", next)) {
      setPendingFieldUpdate({ type: "quality", value: next });
      setReasonText("");
      setReasonModalOpen(true);
      return;
    }
    void submitFieldUpdate("quality", next);
  };

  const handlePersonalSave = async () => {
    if (!lead || !personalEditState) return;

    const dob = personalEditState.dateOfBirth?.trim();
    if (dob && dob.length > 0 && dob.length < 10) {
      toast({
        title: "Invalid date of birth",
        description: "Enter the full date as DD/MM/YYYY.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const saved = (await updateLeadApi(lead.id, {
        profile: {
          gender: personalEditState.gender || null,
          dateOfBirth: personalEditState.dateOfBirth || null,
          alternatePhone: personalEditState.alternatePhone || null,
          hasPassport: personalEditState.hasPassport === "yes",
          passportNumber: personalEditState.hasPassport === "yes" ? (personalEditState.passportNumber || null) : null,
          languageExamGiven: personalEditState.languageExamGiven === "yes",
          visaRefusalDetails: personalEditState.visaRefusalDetails || null,
          preferredCountry: personalEditState.preferredCountry || null,
          fieldOfInterest: personalEditState.fieldOfInterest || null,
        },
        education: personalEditState.education.map((e) => ({
          educationLevel: e.educationLevel || null,
          schoolName: e.schoolName || null,
          specialization: e.specialization || null,
          yearOfCompletion: e.yearOfCompletion ? Number(e.yearOfCompletion) : null,
          percentageOrCgpa: e.percentageOrCgpa || null,
          numberOfBacklogs: e.numberOfBacklogs ? Number(e.numberOfBacklogs) : 0,
        })),
        languageScores: personalEditState.languageScores.map((s) => ({
          examType: s.examType || null,
          listening: s.listening ? Number(s.listening) : null,
          reading: s.reading ? Number(s.reading) : null,
          writing: s.writing ? Number(s.writing) : null,
          speaking: s.speaking ? Number(s.speaking) : null,
          overallBand: s.overallBand ? Number(s.overallBand) : null,
        })),
        familyMembers: personalEditState.familyMembers.map((f) => ({
          memberName: f.memberName || null,
          phoneNumber: f.phoneNumber || null,
        })),
      })) as LeadEntity & {
        profile?: LeadStudentProfile | null;
        education?: LeadEducationRow[];
        languageScores?: LeadLanguageScoreRow[];
        familyMembers?: LeadFamilyMemberRow[];
      };
      if (saved.profile !== undefined) setProfile(saved.profile);
      if (saved.education) setEducation(saved.education);
      if (saved.languageScores) setLanguageScores(saved.languageScores);
      if (saved.familyMembers) setFamilyMembers(saved.familyMembers);
      addLocalLeadUpdateActivity([{ field: "Personal details", old: "—", new: "Updated" }]);
      setPersonalEditing(false);
      setPersonalEditState(null);
      toast({ title: "Personal details saved" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : undefined);
      toast({
        title: "Failed to save personal details",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const handleConvertToClient = () => {
    if (!lead) return;
    if (convertDisabledReason) {
      toast({
        title: "Cannot convert",
        description: convertDisabledReason,
        variant: "destructive",
      });
      return;
    }
    setShowConvertModal(true);
  };

  const handleConvertConfirm = () => {
    if (!lead) return;
    setShowConvertModal(false);
    setLocation(`/clients/new?fromLead=${lead.id}`);
  };

  const handleDropLead = async () => {
    if (!lead || !dropReason.trim()) {
      toast({ title: "Drop reason required", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const updated = await dropLeadByCounsellorApi(lead.id, dropReason.trim());
      pushLeadListPatch(lead.id, {
        ...updated,
        assignmentStatus: "dropped",
        eligibilityStatus: "not_eligible",
      });
      setShowDropModal(false);
      setDropReason("");
      setLead((prev) => (prev ? { ...prev, ...updated, assignmentStatus: "dropped" } : prev));
      toast({ title: "Lead dropped" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Drop failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };



  const handleAddNote = async () => {
    if (!lead || isLeadReadOnly(lead, user?.role)) return;
    if (!noteText.trim()) return;
    try {
      setSavingNote(true);
      const noteRes = await addNoteApi(lead.id, noteText.trim());
      const refreshedLead = noteRes.lead ?? (await getLeadDetail(lead.id)).lead;
      if (refreshedLead) {
        setLead(refreshedLead);
        if (refreshedLead.progressStatus !== lead.progressStatus) {
          pushLeadListPatch(lead.id, { progressStatus: refreshedLead.progressStatus });
        }
      }
      await refreshActivitiesFromServer();
      setNoteText("");
      setShowAddNote(false);
      toast({ title: "Note added" });
    } catch {
      toast({ title: "Failed to add note", variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  const handleStartEditNote = (activityId: number, message: string) => {
    setEditingNoteId(activityId);
    setEditingNoteText(message);
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleSaveEditNote = async () => {
    if (!lead || editingNoteId == null || !editingNoteText.trim()) return;
    if (isLeadReadOnly(lead, user?.role)) return;
    try {
      setSavingNoteEdit(true);
      await updateLeadActivityMessageApi(lead.id, editingNoteId, editingNoteText.trim());
      const detail = await getLeadDetail(lead.id);
      setLead(detail.lead);
      setActivities(detail.activities || []);
      setEditForm((prev) => ({
        ...prev,
        latestNote: detail.lead.latestNote ?? "",
      }));
      handleCancelEditNote();
      toast({ title: "Note updated" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update note";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSavingNoteEdit(false);
    }
  };

  const handleCompleteFollowUp = (activityId: number) => {
    setCompleteFollowUpActivityId(activityId);
    setCompleteFollowUpNote("");
    setShowCompleteFollowUpModal(true);
  };

  const handleCompleteFollowUpConfirm = async () => {
    if (!lead || completeFollowUpActivityId === null) return;
    const note = completeFollowUpNote.trim();
    if (!note) {
      toast({
        title: "Note required",
        description: "Please add a note about this follow-up before marking it done.",
        variant: "destructive",
      });
      return;
    }
    if (completeFollowUpActivityId <= 0) {
      await refreshActivitiesFromServer();
      toast({
        title: "Please try again",
        description: "Follow-up data was refreshed. Open the follow-up and mark done again.",
        variant: "destructive",
      });
      return;
    }
    try {
      setCompleteFollowUpSaving(true);
      const followUpNote = `Follow up completed — ${note}`;
      await updateActivityStatusApi(lead.id, completeFollowUpActivityId, "completed", {
        message: note,
      });
      const noteRes = await addNoteApi(lead.id, followUpNote);
      const detail = await getLeadDetail(lead.id);
      if (detail.lead) {
        setLead(detail.lead);
        pushLeadListPatch(lead.id, {
          pendingFollowUp: detail.meta?.pendingFollowUp ?? false,
          progressStatus: detail.lead.progressStatus,
          nextFollowupAt: detail.lead.nextFollowupAt ?? null,
        });
      } else if (noteRes.lead) {
        setLead(noteRes.lead);
      }
      setLeadMeta((prev) =>
        prev ? { ...prev, pendingFollowUp: detail.meta?.pendingFollowUp ?? false } : prev
      );
      await refreshActivitiesFromServer();
      toast({ title: "Follow-up completed" });
      setShowCompleteFollowUpModal(false);
      setCompleteFollowUpActivityId(null);
      setCompleteFollowUpNote("");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to complete follow-up";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setCompleteFollowUpSaving(false);
    }
  };

  if (!id || Number.isNaN(Number(id))) return null;

  if (pageLoading) {
    return (
      <PageWrapper title="Lead" breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Loading…" }]}>
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (!lead) {
    return (
      <PageWrapper title="Lead" breadcrumbs={[{ label: "Leads", href: "/leads" }]}>
        <div className="rounded-lg border p-8 text-center space-y-4">
          <p className="text-muted-foreground">Lead not found or failed to load.</p>
          <Button variant="outline" onClick={handleBackNavigation}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to leads
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const isCounsellor = user?.role === "counsellor";
  const telecallerTransferredViewOnly = Boolean(leadMeta?.telecallerTransferredViewOnly);
  const readOnly = isLeadReadOnly(lead, user?.role) || telecallerTransferredViewOnly;
  const junk = isLeadJunk(lead);
  const converted = isLeadConverted(lead);

  const displayActivities = normalizeLeadActivitiesForDisplay(activities);
  const noteActivities = displayActivities.filter(isLeadNotesSectionActivity);
  const followupActivities = displayActivities.filter(
    (a) => a.activityType === "followup" && a.status !== "cancelled"
  );
  const timelineItems = displayActivities.filter(shouldIncludeLeadTimelineActivity);

  const openTransfer = () => {
    if (!canTransferToCounsellor(lead, leadMeta) && !leadMeta?.canReassignCounsellor) {
      toast({
        title: "Cannot transfer",
        description: transferDisabledReason ?? "Transfer is not available for this lead.",
        variant: "destructive",
      });
      return;
    }
    setShowTransferModal(true);
  };

  return (
    <>
    <LeadDetailLayout
      lead={lead}
      leadMeta={leadMeta}
      readOnly={readOnly}
      telecallerTransferredViewOnly={telecallerTransferredViewOnly}
      isCounsellor={isCounsellor}
      isJunk={junk}
      isConverted={converted}
      submitting={submitting}
      transferDisabledReason={transferDisabledReason}
      canTransfer={canTransferToCounsellor(lead, leadMeta)}
      canConvert={!converted && !convertDisabledReason}
      convertDisabledReason={convertDisabledReason}
      canReassign={!!leadMeta?.canReassignCounsellor}
      canEditLeadSource={["admin", "superadmin", "developer"].includes(user?.role ?? "")}
      transferButtonLabel={getTransferButtonLabel(lead, leadMeta)}
      eligibilityValue={eligibilityValue}
      qualityValue={qualityValue}
      isEditing={isEditing}
      editForm={editForm}
      isLoadingDropdowns={isLoadingDropdowns}
      sourceOptions={sourceOptions}
      typeOptions={typeOptions}
      counsellors={counsellors}
      telecallers={telecallers}
      noteActivities={noteActivities.map((a) => ({
        id: a.id,
        message: getLeadNoteDisplayMessage(a),
        createdAt: a.createdAt,
        userName: a.userName ?? null,
        canEdit:
          a.activityType === "note" &&
          !readOnly &&
          (user?.role !== "telecaller" ||
            a.userId == null ||
            Number(a.userId) === Number(user?.id)),
      }))}
      followupActivities={followupActivities.map((a) => ({
        id: a.id,
        followupAt: a.followupAt ?? "",
        message: a.message ?? "",
        status: a.status,
        userName: a.userName ?? null,
        canComplete:
          a.status === "pending" &&
          (typeof a.canComplete === "boolean"
            ? a.canComplete
            : !readOnly && !telecallerTransferredViewOnly),
      }))}
      timelineItems={timelineItems}
      showAddNote={showAddNote}
      noteText={noteText}
      savingNote={savingNote}
      onBack={handleBackNavigation}
      canRevertJunk={!!leadMeta?.canRevertJunk}
      onRevertJunk={handleRevertJunk}
      onJunk={handleJunk}
      onFollowUp={() => {
        setFDate(null);
        setFNote("");
        setShowFollowupModal(true);
      }}
      onTransfer={openTransfer}
      onConvert={handleConvertToClient}
      onDrop={() => setShowDropModal(true)}
      onEligibilityChange={(v) => void handleSetEligibility(v)}
      onQualityChange={(v) => void handleSetQuality(v)}
      onEditStart={() => {
        setEditForm({
          ...lead,
          leadSource:
            resolveLeadSourceSelectValue(lead.leadSource, sourceOptions) ??
            lead.leadSource ??
            "",
          leadType:
            resolveLeadTypeSelectValue(lead.leadType, typeOptions) ??
            lead.leadType ??
            "",
          latestNote: lead.latestNote ?? "",
        });
        setIsEditing(true);
      }}
      onEditCancel={() => setIsEditing(false)}
      onEditSave={() => void handleSaveEdit()}
      setEditForm={setEditForm}
      onCopy={copyToClipboard}
      onToggleAddNote={() => setShowAddNote((v) => !v)}
      setNoteText={setNoteText}
      onAddNote={() => void handleAddNote()}
      onCompleteFollowUp={(id) => void handleCompleteFollowUp(id)}
      editingNoteId={editingNoteId}
      editingNoteText={editingNoteText}
      savingNoteEdit={savingNoteEdit}
      onStartEditNote={handleStartEditNote}
      onCancelEditNote={handleCancelEditNote}
      onSaveEditNote={() => void handleSaveEditNote()}
      setEditingNoteText={setEditingNoteText}
      personalSection={
        <LeadPersonalDetailsTab
          readOnly={readOnly}
          profile={profile}
          education={education}
          languageScores={languageScores}
          familyMembers={familyMembers}
          editing={personalEditing}
          editState={personalEditState}
          submitting={submitting}
          onEditStart={() => {
            setPersonalEditState(buildPersonalEditState(profile, education, languageScores, familyMembers));
            setPersonalEditing(true);
          }}
          onEditCancel={() => {
            setPersonalEditing(false);
            setPersonalEditState(null);
          }}
          onEditSave={() => void handlePersonalSave()}
          setEditState={setPersonalEditState}
        />
      }
    />

      <Dialog open={reasonModalOpen} onOpenChange={setReasonModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason required</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>
              {pendingFieldUpdate?.type === "eligibility"
                ? "Why is this lead marked with this eligibility?"
                : "Why is lead quality marked as bad?"}
            </Label>
            <Textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!reasonText.trim() || submitting}
              onClick={() => {
                if (!pendingFieldUpdate || !reasonText.trim()) return;
                void submitFieldUpdate(
                  pendingFieldUpdate.type,
                  pendingFieldUpdate.value,
                  reasonText.trim()
                ).then(() => {
                  setReasonModalOpen(false);
                  setPendingFieldUpdate(null);
                  setReasonText("");
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {leadMeta?.canReassignCounsellor
          ? "Transfer to another counsellor"
          : "Transfer to Counsellor / Manager"}
      </DialogTitle>
    </DialogHeader>
    <div className="py-4 space-y-4">
      <div className="grid gap-2">
        <Label>Select counsellor or manager</Label>
        <SearchableAssigneePicker
          options={counsellors}
          value={selectedCounsellor}
          onValueChange={setSelectedCounsellor}
          placeholder="Select a person…"
          searchPlaceholder="Type name to filter…"
          emptyMessage="No counsellors or managers found"
          listMaxHeight={300}
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="ghost" onClick={() => setShowTransferModal(false)}>
        Cancel
      </Button>
      <Button onClick={handleTransferSubmit}>
        Confirm Transfer
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* Restore Junk Modal */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore & Assign Lead</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Restoring this junk lead will clear previous lead activity. Choose where it should be assigned now.
            </p>
            <div className="grid gap-2">
              <Label>Telecaller</Label>
              <Select
                value={restoreTelecallerId}
                onValueChange={(value) => {
                  setRestoreTelecallerId(value);
                  setRestoreCounsellorId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={telecallers.length > 0 ? "Choose telecaller..." : "Loading telecallers..."} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {telecallers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Counsellor</Label>
              <Select
                value={restoreCounsellorId}
                onValueChange={(value) => {
                  setRestoreCounsellorId(value);
                  setRestoreTelecallerId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={counsellors.length > 0 ? "Choose counsellor..." : "Loading counsellors..."} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {counsellors.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRestoreModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={submitting || (!restoreTelecallerId && !restoreCounsellorId)}
              onClick={() => void handleRestoreSubmit()}
            >
              {submitting ? "Restoring..." : "Restore & Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Modal */}
<Dialog
  open={showFollowupModal}
  onOpenChange={(open) => {
    setShowFollowupModal(open);
    if (!open) {
      setFDate(null);
      setFNote("");
      setPickerOpen(false);
    }
  }}
>
  <DialogContent>
    <DialogHeader><DialogTitle>Schedule Next Follow-up</DialogTitle></DialogHeader>
    <div className="py-4 space-y-4">
      
      {/* Updated Date & Time Selection */}
      <div className="grid gap-2">
        <Label>Date & Time</Label>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal h-10"
          onClick={() => setPickerOpen(true)}
        >
          <CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />
          {fDate ? (
            format(fDate, "PPP p")
          ) : (
            <span className="text-muted-foreground">Pick date and time...</span>
          )}
        </Button>
      </div>

      <div className="grid gap-2">
        <Label>Note (Optional)</Label>
        <Input 
          placeholder="What was discussed?" 
          value={fNote} 
          onChange={e => setFNote(e.target.value)} 
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="ghost" onClick={() => setShowFollowupModal(false)}>Cancel</Button>
      <Button 
        onClick={handleFollowupSubmit} 
        disabled={!fDate} // Disable if no date is picked
      >
        Save Follow-up
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Place the DateTimePicker outside the Dialog to avoid z-index/nesting issues */}
<DateTimePicker
  open={pickerOpen}
  onOpenChange={setPickerOpen}
  value={fDate}
  minDateTime={getMinFollowupDateTime()}
  onPickTomorrowMorning={() => {
    setFDate(getTomorrowMorning1030());
    setPickerOpen(false);
  }}
  onChange={(date) => setFDate(clampFollowupDateTime(date))}
/>

      {/* Convert to Client Confirmation Modal */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Lead to Client</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-2 text-sm text-muted-foreground">
            <p>
              You are about to convert{" "}
              <span className="font-semibold text-foreground">{lead?.fullName}</span> to a client.
            </p>
            <p>
              You will be taken to the client creation form with their details pre-filled. Please
              confirm you have collected the initial payment before proceeding.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConvertModal(false)}>Cancel</Button>
            <Button onClick={handleConvertConfirm}>
              Confirm &amp; Go to Client Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDropModal} onOpenChange={setShowDropModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Drop — reason required</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Why is this lead being dropped?"
            value={dropReason}
            onChange={(e) => setDropReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDropModal(false)}>Cancel</Button>
            <Button disabled={submitting || !dropReason.trim()} onClick={handleDropLead}>
              {submitting ? "Saving…" : "Confirm Drop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Junk Modal */}
      <Dialog open={showJunkModal} onOpenChange={(open) => { if (!open) { setShowJunkModal(false); setJunkReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Junk — reason required</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Why is this lead being marked as junk?</Label>
            <Textarea
              placeholder="Enter reason…"
              value={junkReason}
              onChange={(e) => setJunkReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowJunkModal(false); setJunkReason(""); }}>Cancel</Button>
            <Button
              disabled={submitting || !junkReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => void handleJunkSubmit()}
            >
              {submitting ? "Saving…" : "Confirm Junk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete follow-up modal */}
      <Dialog
        open={showCompleteFollowUpModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowCompleteFollowUpModal(false);
            setCompleteFollowUpNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Note (required — saved in Notes)</Label>
            <Textarea
              placeholder="What was discussed?"
              value={completeFollowUpNote}
              onChange={(e) => setCompleteFollowUpNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCompleteFollowUpModal(false);
                setCompleteFollowUpNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={completeFollowUpSaving || !completeFollowUpNote.trim()}
              onClick={() => void handleCompleteFollowUpConfirm()}
            >
              {completeFollowUpSaving ? "Saving…" : "Mark Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
