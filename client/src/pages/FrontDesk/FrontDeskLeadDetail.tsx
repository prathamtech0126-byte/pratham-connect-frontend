import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft, CheckCircle2, UserCheck,
  User, GraduationCap, BookOpen, Users, Pencil, Plus, Trash2,
  Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { frontDeskApi, Counsellor, FrontDeskLeadDetail as LeadDetailType } from "@/api/frontdesk.api";

interface Props {
  leadId: number;
  onBack: () => void;
  counsellors: Counsellor[];
  saleTypeNames: string[];
  onVerify: (id: number, saleType: string, source: string, counsellorId: number) => void;
  onAssign: (leadId: number, counsellorId: number) => void;
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {children}
    </div>
  );
}

// ─── Edit state types ─────────────────────────────────────────────────────────
interface EduRow {
  educationLevel: string; schoolName: string; specialization: string;
  yearOfCompletion: string; percentageOrCgpa: string; numberOfBacklogs: string;
}
interface ScoreRow {
  examType: string; listening: string; reading: string;
  writing: string; speaking: string; overallBand: string;
}
interface FamilyRow { memberName: string; phoneNumber: string; }

interface EditState {
  fullName: string; phone: string; email: string; city: string;
  gender: string; dateOfBirth: string; alternatePhone: string;
  hasPassport: string; languageExamGiven: string;
  visaRefusalDetails: string; preferredCountry: string; fieldOfInterest: string;
  education: EduRow[];
  languageScores: ScoreRow[];
  familyMembers: FamilyRow[];
}

function formatName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function initEditState(lead: LeadDetailType): EditState {
  return {
    fullName: lead.fullName ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    city: lead.city ?? "",
    gender: lead.profile?.gender ?? "",
    dateOfBirth: lead.profile?.dateOfBirth ? lead.profile.dateOfBirth.slice(0, 10) : "",
    alternatePhone: lead.profile?.alternatePhone ?? "",
    hasPassport: lead.profile?.hasPassport ? "yes" : "no",
    languageExamGiven: lead.profile?.languageExamGiven ? "yes" : "no",
    visaRefusalDetails: lead.profile?.visaRefusalDetails ?? "",
    preferredCountry: lead.profile?.preferredCountry ?? "",
    fieldOfInterest: lead.profile?.fieldOfInterest ?? "",
    education: lead.education.map((e: any) => ({
      educationLevel: e.educationLevel ?? "",
      schoolName: e.schoolName ?? "",
      specialization: e.specialization ?? "",
      yearOfCompletion: e.yearOfCompletion?.toString() ?? "",
      percentageOrCgpa: e.percentageOrCgpa ?? "",
      numberOfBacklogs: e.numberOfBacklogs?.toString() ?? "0",
    })),
    languageScores: lead.languageScores.map((s: any) => ({
      examType: s.examType ?? "",
      listening: s.listening ?? "",
      reading: s.reading ?? "",
      writing: s.writing ?? "",
      speaking: s.speaking ?? "",
      overallBand: s.overallBand ?? "",
    })),
    familyMembers: lead.familyMembers.map((f: any) => ({
      memberName: f.memberName ?? "",
      phoneNumber: f.phoneNumber ?? "",
    })),
  };
}

const emptyEdu = (): EduRow => ({ educationLevel: "", schoolName: "", specialization: "", yearOfCompletion: "", percentageOrCgpa: "", numberOfBacklogs: "0" });
const emptyScore = (): ScoreRow => ({ examType: "", listening: "", reading: "", writing: "", speaking: "", overallBand: "" });
const emptyFamily = (): FamilyRow => ({ memberName: "", phoneNumber: "" });

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FrontDeskLeadDetail({ leadId, onBack, counsellors, saleTypeNames, onVerify, onAssign }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedCounsellor, setSelectedCounsellor] = useState("");
  const [editState, setEditState] = useState<EditState | null>(null);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifySaleType, setVerifySaleType] = useState("");
  const [verifyCounsellorId, setVerifyCounsellorId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["frontdesk-lead-detail", leadId],
    queryFn: () => frontDeskApi.getLeadDetail(leadId),
  });

  const lead = data?.data;

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => frontDeskApi.updateLeadDetails(leadId, body),
    onSuccess: () => {
      toast({ title: "Lead updated successfully" });
      setEditState(null);
      qc.invalidateQueries({ queryKey: ["frontdesk-lead-detail", leadId] });
      qc.invalidateQueries({ queryKey: ["frontdesk-leads"] });
    },
    onError: (err: any) =>
      toast({ title: "Update failed", description: err?.response?.data?.message, variant: "destructive" }),
  });

  const openEdit = () => {
    if (lead) {
      setEditState(initEditState(lead as LeadDetailType));
    }
  };

  const handleSave = () => {
    if (!editState) return;
    const body = {
      fullName: formatName(editState.fullName),
      phone: editState.phone,
      email: editState.email || null,
      city: editState.city || null,
      profile: {
        gender: editState.gender || null,
        dateOfBirth: editState.dateOfBirth || null,
        alternatePhone: editState.alternatePhone || null,
        hasPassport: editState.hasPassport === "yes",
        languageExamGiven: editState.languageExamGiven === "yes",
        visaRefusalDetails: editState.visaRefusalDetails || null,
        preferredCountry: editState.preferredCountry || null,
        fieldOfInterest: editState.fieldOfInterest || null,
      },
      education: editState.education.map((e) => ({
        educationLevel: e.educationLevel || null,
        schoolName: e.schoolName || null,
        specialization: e.specialization || null,
        yearOfCompletion: e.yearOfCompletion ? Number(e.yearOfCompletion) : null,
        percentageOrCgpa: e.percentageOrCgpa || null,
        numberOfBacklogs: Number(e.numberOfBacklogs) || 0,
      })),
      languageScores: editState.languageScores.map((s) => ({
        examType: s.examType || null,
        listening: s.listening ? Number(s.listening) : null,
        reading: s.reading ? Number(s.reading) : null,
        writing: s.writing ? Number(s.writing) : null,
        speaking: s.speaking ? Number(s.speaking) : null,
        overallBand: s.overallBand ? Number(s.overallBand) : null,
      })),
      familyMembers: editState.familyMembers.map((f) => ({
        memberName: f.memberName ? formatName(f.memberName) : null,
        phoneNumber: f.phoneNumber || null,
      })),
    };
    updateMutation.mutate(body as Record<string, unknown>);
  };

  // State updaters for arrays
  const setEdu = (i: number, key: keyof EduRow, val: string) =>
    setEditState((s) => s ? { ...s, education: s.education.map((r, idx) => idx === i ? { ...r, [key]: val } : r) } : s);
  const addEdu = () => setEditState((s) => s ? { ...s, education: [...s.education, emptyEdu()] } : s);
  const removeEdu = (i: number) => setEditState((s) => s ? { ...s, education: s.education.filter((_, idx) => idx !== i) } : s);

  const setScore = (i: number, key: keyof ScoreRow, val: string) =>
    setEditState((s) => s ? { ...s, languageScores: s.languageScores.map((r, idx) => idx === i ? { ...r, [key]: val } : r) } : s);
  const addScore = () => setEditState((s) => s ? { ...s, languageScores: [...s.languageScores, emptyScore()] } : s);
  const removeScore = (i: number) => setEditState((s) => s ? { ...s, languageScores: s.languageScores.filter((_, idx) => idx !== i) } : s);

  const setFamily = (i: number, key: keyof FamilyRow, val: string) =>
    setEditState((s) => s ? { ...s, familyMembers: s.familyMembers.map((r, idx) => idx === i ? { ...r, [key]: val } : r) } : s);
  const addFamily = () => setEditState((s) => s ? { ...s, familyMembers: [...s.familyMembers, emptyFamily()] } : s);
  const removeFamily = (i: number) => setEditState((s) => s ? { ...s, familyMembers: s.familyMembers.filter((_, idx) => idx !== i) } : s);

  const canAssign =
    lead && lead.isVerified &&
    lead.assignmentStatus !== "converted" &&
    lead.assignmentStatus !== "dropped";

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <p className="text-slate-500">Lead not found.</p>
      </div>
    );
  }

  const initials = lead.fullName
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const isEditing = editState !== null;

  return (
    <div className="space-y-5">
      {/* Top nav */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </Button>
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditState(null)} className="gap-1.5">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="gap-1.5">
                <Save className="h-4 w-4" /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          {!lead.isVerified && (
            <Button
              size="sm" variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => { setVerifySaleType(""); setVerifyCounsellorId(lead.currentCounsellorId?.toString() ?? ""); setVerifyOpen(true); }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Verify & Transfer
            </Button>
          )}
          {canAssign && (
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <UserCheck className="h-4 w-4 mr-1.5" />
              {lead.currentCounsellorId ? "Reassign Counsellor" : "Assign Counsellor"}
            </Button>
          )}
        </div>
      </div>

      {/* Identity card */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-bold text-white">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{lead.fullName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                {lead.isVerified ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-300 text-amber-600">Not Verified</Badge>
                )}
                {lead.externalLeadId && (
                  <span className="font-mono text-xs text-orange-600">{lead.externalLeadId}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Registered: {lead.createdAt ? format(new Date(lead.createdAt), "d MMMM yyyy, HH:mm") : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-orange-500" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editState ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldGroup label="Full Name">
                <Input value={editState.fullName} onChange={(e) => setEditState((s) => s ? { ...s, fullName: e.target.value } : s)} />
              </FieldGroup>
              <FieldGroup label="Phone Number">
                <Input value={editState.phone} onChange={(e) => setEditState((s) => s ? { ...s, phone: e.target.value } : s)} />
              </FieldGroup>
              <FieldGroup label="Alternate Phone">
                <Input value={editState.alternatePhone} onChange={(e) => setEditState((s) => s ? { ...s, alternatePhone: e.target.value } : s)} />
              </FieldGroup>
              <FieldGroup label="Email">
                <Input value={editState.email} onChange={(e) => setEditState((s) => s ? { ...s, email: e.target.value } : s)} />
              </FieldGroup>
              <FieldGroup label="Date of Birth">
                <Input type="date" value={editState.dateOfBirth} onChange={(e) => setEditState((s) => s ? { ...s, dateOfBirth: e.target.value } : s)} />
              </FieldGroup>
              <FieldGroup label="Gender">
                <Select value={editState.gender} onValueChange={(v) => setEditState((s) => s ? { ...s, gender: v } : s)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="City">
                <Input value={editState.city} onChange={(e) => setEditState((s) => s ? { ...s, city: e.target.value } : s)} />
              </FieldGroup>
              <FieldGroup label="Language Exam Given">
                <Select value={editState.languageExamGiven} onValueChange={(v) => setEditState((s) => s ? { ...s, languageExamGiven: v } : s)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Passport Holder">
                <Select value={editState.hasPassport} onValueChange={(v) => setEditState((s) => s ? { ...s, hasPassport: v } : s)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Preferred Country">
                <Input value={editState.preferredCountry} onChange={(e) => setEditState((s) => s ? { ...s, preferredCountry: e.target.value } : s)} />
              </FieldGroup>
              <FieldGroup label="Field of Interest">
                <Input value={editState.fieldOfInterest} onChange={(e) => setEditState((s) => s ? { ...s, fieldOfInterest: e.target.value } : s)} />
              </FieldGroup>
              <FieldGroup label="Visa Refusal Details">
                <Input value={editState.visaRefusalDetails} onChange={(e) => setEditState((s) => s ? { ...s, visaRefusalDetails: e.target.value } : s)} placeholder="None" />
              </FieldGroup>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField label="Full Name" value={lead.fullName} />
              <InfoField label="Phone Number" value={lead.phone} />
              <InfoField label="Alternate Phone" value={lead.profile?.alternatePhone} />
              <InfoField label="Email" value={lead.email} />
              <InfoField label="Date of Birth" value={lead.profile?.dateOfBirth ? format(new Date(lead.profile.dateOfBirth), "d MMMM yyyy") : undefined} />
              <InfoField label="Gender" value={lead.profile?.gender} />
              <InfoField label="City" value={lead.city} />
              <InfoField label="Language Exam Given" value={lead.profile?.languageExamGiven ? "Yes" : "No"} />
              <InfoField label="Passport Holder" value={lead.profile?.hasPassport ? "Yes" : "No"} />
              <InfoField label="Preferred Country" value={lead.profile?.preferredCountry} />
              <InfoField label="Field of Interest" value={lead.profile?.fieldOfInterest} />
              <InfoField label="Visa Refusal Details" value={lead.profile?.visaRefusalDetails} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-orange-500" />
            Education
            <span className="text-sm font-normal text-slate-400">({lead.education.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editState ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={addEdu} className="h-7 gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {editState.education.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-3 rounded-md border border-dashed">No education records. Click Add to insert one.</p>
              )}
              {editState.education.map((edu, i) => (
                <div key={i} className="border rounded-lg p-3 relative bg-slate-50/50">
                  <Button
                    size="sm" variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeEdu(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 pr-8">
                    <FieldGroup label="Level"><Input value={edu.educationLevel} onChange={(e) => setEdu(i, "educationLevel", e.target.value)} /></FieldGroup>
                    <FieldGroup label="School / College"><Input value={edu.schoolName} onChange={(e) => setEdu(i, "schoolName", e.target.value)} /></FieldGroup>
                    <FieldGroup label="Specialization"><Input value={edu.specialization} onChange={(e) => setEdu(i, "specialization", e.target.value)} /></FieldGroup>
                    <FieldGroup label="Year of Completion"><Input type="number" value={edu.yearOfCompletion} onChange={(e) => setEdu(i, "yearOfCompletion", e.target.value)} /></FieldGroup>
                    <FieldGroup label="% / CGPA"><Input value={edu.percentageOrCgpa} onChange={(e) => setEdu(i, "percentageOrCgpa", e.target.value)} /></FieldGroup>
                    <FieldGroup label="Backlogs"><Input type="number" min="0" value={edu.numberOfBacklogs} onChange={(e) => setEdu(i, "numberOfBacklogs", e.target.value)} /></FieldGroup>
                  </div>
                </div>
              ))}
            </div>
          ) : lead.education.length === 0 ? (
            <p className="rounded-md bg-slate-50 py-4 text-center text-sm text-slate-400">No education records.</p>
          ) : (
            <div className="space-y-3">
              {lead.education.map((edu: any) => (
                <div key={edu.id} className="grid grid-cols-2 gap-3 rounded-md border p-3 sm:grid-cols-3">
                  <InfoField label="Level" value={edu.educationLevel} />
                  <InfoField label="School / College" value={edu.schoolName} />
                  <InfoField label="Specialization" value={edu.specialization} />
                  <InfoField label="Year of Completion" value={edu.yearOfCompletion?.toString()} />
                  <InfoField label="% / CGPA" value={edu.percentageOrCgpa} />
                  <InfoField label="Backlogs" value={edu.numberOfBacklogs?.toString() ?? "0"} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language Scores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-orange-500" />
            Language Exam Scores
            <span className="text-sm font-normal text-slate-400">({lead.languageScores.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editState ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={addScore} className="h-7 gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {editState.languageScores.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-3 rounded-md border border-dashed">No scores. Click Add to insert one.</p>
              )}
              {editState.languageScores.map((s, i) => (
                <div key={i} className="border rounded-lg p-3 relative bg-slate-50/50">
                  <Button
                    size="sm" variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeScore(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 pr-8">
                    <FieldGroup label="Exam Type"><Input value={s.examType} placeholder="IELTS" onChange={(e) => setScore(i, "examType", e.target.value)} /></FieldGroup>
                    <FieldGroup label="Listening"><Input type="number" step="0.5" value={s.listening} onChange={(e) => setScore(i, "listening", e.target.value)} /></FieldGroup>
                    <FieldGroup label="Reading"><Input type="number" step="0.5" value={s.reading} onChange={(e) => setScore(i, "reading", e.target.value)} /></FieldGroup>
                    <FieldGroup label="Writing"><Input type="number" step="0.5" value={s.writing} onChange={(e) => setScore(i, "writing", e.target.value)} /></FieldGroup>
                    <FieldGroup label="Speaking"><Input type="number" step="0.5" value={s.speaking} onChange={(e) => setScore(i, "speaking", e.target.value)} /></FieldGroup>
                    <FieldGroup label="Overall"><Input type="number" step="0.5" value={s.overallBand} onChange={(e) => setScore(i, "overallBand", e.target.value)} /></FieldGroup>
                  </div>
                </div>
              ))}
            </div>
          ) : lead.languageScores.length === 0 ? (
            <p className="rounded-md bg-slate-50 py-4 text-center text-sm text-slate-400">No language scores recorded.</p>
          ) : (
            <div className="space-y-3">
              {lead.languageScores.map((s: any) => (
                <div key={s.id} className="grid grid-cols-3 gap-3 rounded-md border p-3 sm:grid-cols-6">
                  <InfoField label="Exam" value={s.examType} />
                  <InfoField label="Listening" value={s.listening} />
                  <InfoField label="Reading" value={s.reading} />
                  <InfoField label="Writing" value={s.writing} />
                  <InfoField label="Speaking" value={s.speaking} />
                  <InfoField label="Overall" value={s.overallBand} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Family Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-orange-500" />
            Family
            <span className="text-sm font-normal text-slate-400">({lead.familyMembers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editState ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={addFamily} className="h-7 gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {editState.familyMembers.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-3 rounded-md border border-dashed">No family members. Click Add to insert one.</p>
              )}
              {editState.familyMembers.map((f, i) => (
                <div key={i} className="border rounded-lg p-3 relative bg-slate-50/50">
                  <Button
                    size="sm" variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeFamily(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="grid grid-cols-2 gap-2 pr-8">
                    <FieldGroup label="Name"><Input value={f.memberName} onChange={(e) => setFamily(i, "memberName", e.target.value)} /></FieldGroup>
                    <FieldGroup label="Phone"><Input value={f.phoneNumber} onChange={(e) => setFamily(i, "phoneNumber", e.target.value)} /></FieldGroup>
                  </div>
                </div>
              ))}
            </div>
          ) : lead.familyMembers.length === 0 ? (
            <p className="rounded-md bg-slate-50 py-4 text-center text-sm text-slate-400">No family members added.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lead.familyMembers.map((f: any) => (
                <div key={f.id} className="grid grid-cols-2 gap-2 rounded-md border p-3">
                  <InfoField label="Name" value={f.memberName} />
                  <InfoField label="Phone" value={f.phoneNumber} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Verify Dialog ── */}
      <Dialog open={verifyOpen} onOpenChange={(o) => { if (!o) { setVerifyOpen(false); setVerifySaleType(""); setVerifyCounsellorId(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Verify & Transfer Lead</DialogTitle>
            <DialogDescription>Select the sale type and counsellor. This will verify the lead and transfer it to the selected counsellor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">Sale Type <span className="text-red-500">*</span></p>
              <Select value={verifySaleType} onValueChange={setVerifySaleType}>
                <SelectTrigger><SelectValue placeholder="Select sale type" /></SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  {saleTypeNames.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">Counsellor <span className="text-red-500">*</span></p>
              <Select value={verifyCounsellorId} onValueChange={setVerifyCounsellorId}>
                <SelectTrigger><SelectValue placeholder="Select counsellor" /></SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  {counsellors.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVerifyOpen(false); setVerifySaleType(""); setVerifyCounsellorId(""); }}>Cancel</Button>
            <Button
              disabled={!verifySaleType || !verifyCounsellorId}
              className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              variant="outline"
              onClick={() => {
                if (verifySaleType && verifyCounsellorId) {
                  onVerify(lead.id, verifySaleType, "walk_in", Number(verifyCounsellorId));
                  setVerifyOpen(false);
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm Verify & Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Dialog ── */}
      <Dialog open={assignOpen} onOpenChange={(o) => { if (!o) { setAssignOpen(false); setSelectedCounsellor(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign to Counsellor</DialogTitle>
            <DialogDescription>Select the counsellor for this walk-in lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">Counsellor <span className="text-red-500">*</span></p>
              <Select value={selectedCounsellor} onValueChange={setSelectedCounsellor}>
                <SelectTrigger><SelectValue placeholder="Select counsellor" /></SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  {counsellors.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignOpen(false); setSelectedCounsellor(""); }}>Cancel</Button>
            <Button
              disabled={!selectedCounsellor}
              onClick={() => {
                if (selectedCounsellor) {
                  onAssign(lead.id, Number(selectedCounsellor));
                  setAssignOpen(false);
                }
              }}
            >Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
