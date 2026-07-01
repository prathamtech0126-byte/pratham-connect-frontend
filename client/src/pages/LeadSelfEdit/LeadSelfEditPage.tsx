import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle, GraduationCap, BookOpen, Users, User, Save, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { leadSelfEditApi } from "@/api/leadSelfEdit.api";
import type { FrontDeskLeadDetail } from "@/api/frontdesk.api";
import { LinkExpiryCountdown } from "@/components/LinkExpiryCountdown";
import prathamLogo from "@/assets/Pratham-international-logo orignal.webp";

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

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function formatName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function initEditState(lead: FrontDeskLeadDetail): EditState {
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
    education: lead.education.map((e) => ({
      educationLevel: e.educationLevel ?? "",
      schoolName: e.schoolName ?? "",
      specialization: e.specialization ?? "",
      yearOfCompletion: e.yearOfCompletion?.toString() ?? "",
      percentageOrCgpa: e.percentageOrCgpa ?? "",
      numberOfBacklogs: e.numberOfBacklogs?.toString() ?? "0",
    })),
    languageScores: lead.languageScores.map((s) => ({
      examType: s.examType ?? "",
      listening: s.listening ?? "",
      reading: s.reading ?? "",
      writing: s.writing ?? "",
      speaking: s.speaking ?? "",
      overallBand: s.overallBand ?? "",
    })),
    familyMembers: lead.familyMembers.map((f) => ({
      memberName: f.memberName ?? "",
      phoneNumber: f.phoneNumber ?? "",
    })),
  };
}

const emptyEdu = (): EduRow => ({
  educationLevel: "", schoolName: "", specialization: "",
  yearOfCompletion: "", percentageOrCgpa: "", numberOfBacklogs: "0",
});
const emptyScore = (): ScoreRow => ({
  examType: "", listening: "", reading: "", writing: "", speaking: "", overallBand: "",
});
const emptyFamily = (): FamilyRow => ({ memberName: "", phoneNumber: "" });

export default function LeadSelfEditPage() {
  const search = useSearch();
  const { toast } = useToast();
  const token = useMemo(() => {
    const qs = search.startsWith("?") ? search.slice(1) : search;
    return new URLSearchParams(qs).get("token")?.trim() ?? "";
  }, [search]);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["lead-self-edit", token],
    queryFn: () => leadSelfEditApi.getMe(token),
    enabled: Boolean(token),
    retry: false,
  });

  const lead = data?.data;
  const expiresAt = data?.expiresAt;

  useEffect(() => {
    if (lead) setEditState(initEditState(lead));
  }, [lead?.id]);

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => leadSelfEditApi.updateMe(token, body),
    onSuccess: (res) => {
      setSaved(true);
      if (res.data) setEditState(initEditState(res.data));
      toast({ title: "Saved", description: "Your details have been updated." });
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: err?.response?.data?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <h1 className="text-lg font-semibold">Invalid link</h1>
            <p className="text-sm text-slate-500">This edit link is missing or incomplete. Please ask your counsellor for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !lead || !editState) {
    const message = (error as any)?.response?.data?.message ?? "This edit link is invalid or has expired.";
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h1 className="text-lg font-semibold">Link unavailable</h1>
            <p className="text-sm text-slate-500">{message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <img src={prathamLogo} alt="Pratham International" className="h-10 w-auto object-contain" />
          {expiresAt && (
            <p className="text-xs text-slate-500">
              Link expires {format(new Date(expiresAt), "d MMM, HH:mm")} ·{" "}
              <LinkExpiryCountdown expiresAt={expiresAt} className="font-medium" />
            </p>
          )}
        </header>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Update your details</h1>
          <p className="text-sm text-slate-500">
            Review and update your registration information below, then click Save.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Your details were saved successfully.
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-orange-500" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldGroup label="Full Name *">
                <Input value={editState.fullName} onChange={(e) => setEditState((s) => s ? { ...s, fullName: e.target.value } : s)} />
              </FieldGroup>
              <FieldGroup label="Phone Number *">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-orange-500" /> Education
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={addEdu}>Add education</Button>
            </div>
            {editState.education.map((edu, i) => (
              <div key={i} className="rounded-lg border bg-white p-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <FieldGroup label="Level"><Input value={edu.educationLevel} onChange={(e) => setEdu(i, "educationLevel", e.target.value)} /></FieldGroup>
                <FieldGroup label="School / College"><Input value={edu.schoolName} onChange={(e) => setEdu(i, "schoolName", e.target.value)} /></FieldGroup>
                <FieldGroup label="Specialization"><Input value={edu.specialization} onChange={(e) => setEdu(i, "specialization", e.target.value)} /></FieldGroup>
                <FieldGroup label="Year"><Input type="number" value={edu.yearOfCompletion} onChange={(e) => setEdu(i, "yearOfCompletion", e.target.value)} /></FieldGroup>
                <FieldGroup label="% / CGPA"><Input value={edu.percentageOrCgpa} onChange={(e) => setEdu(i, "percentageOrCgpa", e.target.value)} /></FieldGroup>
                <FieldGroup label="Backlogs"><Input type="number" min="0" value={edu.numberOfBacklogs} onChange={(e) => setEdu(i, "numberOfBacklogs", e.target.value)} /></FieldGroup>
                <div className="col-span-full flex justify-end">
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeEdu(i)}>Remove</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-orange-500" /> Language Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={addScore}>Add score</Button>
            </div>
            {editState.languageScores.map((s, i) => (
              <div key={i} className="rounded-lg border bg-white p-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                <FieldGroup label="Exam"><Input value={s.examType} onChange={(e) => setScore(i, "examType", e.target.value)} /></FieldGroup>
                <FieldGroup label="L"><Input type="number" step="0.5" value={s.listening} onChange={(e) => setScore(i, "listening", e.target.value)} /></FieldGroup>
                <FieldGroup label="R"><Input type="number" step="0.5" value={s.reading} onChange={(e) => setScore(i, "reading", e.target.value)} /></FieldGroup>
                <FieldGroup label="W"><Input type="number" step="0.5" value={s.writing} onChange={(e) => setScore(i, "writing", e.target.value)} /></FieldGroup>
                <FieldGroup label="S"><Input type="number" step="0.5" value={s.speaking} onChange={(e) => setScore(i, "speaking", e.target.value)} /></FieldGroup>
                <FieldGroup label="Overall"><Input type="number" step="0.5" value={s.overallBand} onChange={(e) => setScore(i, "overallBand", e.target.value)} /></FieldGroup>
                <div className="col-span-full flex justify-end">
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeScore(i)}>Remove</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-orange-500" /> Family
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={addFamily}>Add member</Button>
            </div>
            {editState.familyMembers.map((f, i) => (
              <div key={i} className="rounded-lg border bg-white p-3 grid grid-cols-2 gap-2">
                <FieldGroup label="Name"><Input value={f.memberName} onChange={(e) => setFamily(i, "memberName", e.target.value)} /></FieldGroup>
                <FieldGroup label="Phone"><Input value={f.phoneNumber} onChange={(e) => setFamily(i, "phoneNumber", e.target.value)} /></FieldGroup>
                <div className="col-span-full flex justify-end">
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeFamily(i)}>Remove</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="sticky bottom-4 flex justify-end">
          <Button size="lg" className="gap-2 shadow-lg" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
