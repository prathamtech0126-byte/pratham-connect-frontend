import { useState } from "react";
import {
  Plus, Pencil, Trash2, Save, X, CalendarIcon,
  User, GraduationCap, BookOpen, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SimpleCalendar } from "@/components/ui/simple-calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  LeadEducationRow,
  LeadFamilyMemberRow,
  LeadLanguageScoreRow,
  LeadStudentProfile,
} from "@/api/leads.api";
import { formatDobDisplay, ymdToDmySlash } from "@/lib/dob-date";

// ── Helpers ──────────────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm break-words">{value || "—"}</p>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ── DOB Picker ────────────────────────────────────────────────────────────────
// Accepts/emits DD/MM/YYYY strings. Supports manual typing with auto-slash and
// a calendar popover for convenience.

function DobPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    let result = digits;
    if (digits.length > 4) {
      result = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    } else if (digits.length > 2) {
      result = digits.slice(0, 2) + "/" + digits.slice(2);
    }
    onChange(result);
  };

  const calDate = (() => {
    if (!value || value.length < 10) return undefined;
    const parts = value.split("/");
    if (parts.length !== 3) return undefined;
    const d = Number(parts[0]), m = Number(parts[1]), y = Number(parts[2]);
    if (!d || !m || !y) return undefined;
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? undefined : date;
  })();

  return (
    <div className="flex gap-1.5">
      <Input
        placeholder="DD/MM/YYYY"
        value={value}
        onChange={handleInput}
        maxLength={10}
        className="flex-1 font-mono"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" type="button" className="h-10 w-10 shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <SimpleCalendar
            value={calDate}
            maxDate={new Date()}
            onChange={(val) => {
              if (val instanceof Date) {
                const dd = String(val.getDate()).padStart(2, "0");
                const mm = String(val.getMonth() + 1).padStart(2, "0");
                onChange(`${dd}/${mm}/${val.getFullYear()}`);
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PersonalEditState = {
  gender: string;
  dateOfBirth: string;
  alternatePhone: string;
  hasPassport: string;
  passportNumber: string;
  languageExamGiven: string;
  visaRefusalDetails: string;
  preferredCountry: string;
  fieldOfInterest: string;
  education: {
    educationLevel: string;
    schoolName: string;
    specialization: string;
    yearOfCompletion: string;
    percentageOrCgpa: string;
    numberOfBacklogs: string;
  }[];
  languageScores: {
    examType: string;
    listening: string;
    reading: string;
    writing: string;
    speaking: string;
    overallBand: string;
  }[];
  familyMembers: { memberName: string; phoneNumber: string }[];
};

export function buildPersonalEditState(
  profile: LeadStudentProfile | null,
  education: LeadEducationRow[],
  languageScores: LeadLanguageScoreRow[],
  familyMembers: LeadFamilyMemberRow[]
): PersonalEditState {
  return {
    gender: profile?.gender ?? "",
    dateOfBirth: profile?.dateOfBirth ? ymdToDmySlash(String(profile.dateOfBirth)) : "",
    alternatePhone: profile?.alternatePhone ?? "",
    hasPassport: profile?.hasPassport ? "yes" : "no",
    passportNumber: profile?.passportNumber ?? "",
    languageExamGiven: profile?.languageExamGiven ? "yes" : "no",
    visaRefusalDetails: profile?.visaRefusalDetails ?? "",
    preferredCountry: profile?.preferredCountry ?? "",
    fieldOfInterest: profile?.fieldOfInterest ?? "",
    education: education.map((e) => ({
      educationLevel: e.educationLevel ?? "",
      schoolName: e.schoolName ?? "",
      specialization: e.specialization ?? "",
      yearOfCompletion: e.yearOfCompletion?.toString() ?? "",
      percentageOrCgpa: e.percentageOrCgpa ?? "",
      numberOfBacklogs: e.numberOfBacklogs?.toString() ?? "0",
    })),
    languageScores: languageScores.map((s) => ({
      examType: s.examType ?? "",
      listening: s.listening ?? "",
      reading: s.reading ?? "",
      writing: s.writing ?? "",
      speaking: s.speaking ?? "",
      overallBand: s.overallBand ?? "",
    })),
    familyMembers: familyMembers.map((f) => ({
      memberName: f.memberName ?? "",
      phoneNumber: f.phoneNumber ?? "",
    })),
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EDUCATION_LEVELS = ["10th", "12th / Diploma", "Bachelor's", "Master's"];

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  readOnly: boolean;
  profile: LeadStudentProfile | null;
  education: LeadEducationRow[];
  languageScores: LeadLanguageScoreRow[];
  familyMembers: LeadFamilyMemberRow[];
  editing: boolean;
  editState: PersonalEditState | null;
  submitting: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  setEditState: React.Dispatch<React.SetStateAction<PersonalEditState | null>>;
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function LeadPersonalDetailsTab({
  readOnly,
  profile,
  education,
  languageScores,
  familyMembers,
  editing,
  editState,
  submitting,
  onEditStart,
  onEditCancel,
  onEditSave,
  setEditState,
}: Props) {
  // Updaters to avoid spreading the whole editState on every keystroke
  const set = <K extends keyof PersonalEditState>(key: K, val: PersonalEditState[K]) =>
    setEditState((s) => s ? { ...s, [key]: val } : s);

  const setEdu = (i: number, field: string, val: string) =>
    setEditState((s) => {
      if (!s) return s;
      const next = s.education.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
      return { ...s, education: next };
    });

  const addEdu = () =>
    setEditState((s) => s ? {
      ...s,
      education: [...s.education, { educationLevel: "", schoolName: "", specialization: "", yearOfCompletion: "", percentageOrCgpa: "", numberOfBacklogs: "0" }],
    } : s);

  const removeEdu = (i: number) =>
    setEditState((s) => s ? { ...s, education: s.education.filter((_, idx) => idx !== i) } : s);

  const setScore = (i: number, field: string, val: string) =>
    setEditState((s) => {
      if (!s) return s;
      const next = s.languageScores.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
      return { ...s, languageScores: next };
    });

  const addScore = () =>
    setEditState((s) => s ? {
      ...s,
      languageScores: [...s.languageScores, { examType: "", listening: "", reading: "", writing: "", speaking: "", overallBand: "" }],
    } : s);

  const removeScore = (i: number) =>
    setEditState((s) => s ? { ...s, languageScores: s.languageScores.filter((_, idx) => idx !== i) } : s);

  const setFamily = (i: number, field: string, val: string) =>
    setEditState((s) => {
      if (!s) return s;
      const next = s.familyMembers.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
      return { ...s, familyMembers: next };
    });

  const addFamily = () =>
    setEditState((s) => s ? {
      ...s,
      familyMembers: [...s.familyMembers, { memberName: "", phoneNumber: "" }],
    } : s);

  const removeFamily = (i: number) =>
    setEditState((s) => s ? { ...s, familyMembers: s.familyMembers.filter((_, idx) => idx !== i) } : s);

  return (
    <div className="space-y-4 mt-4">

      {/* ── Header card with edit/cancel/save ── */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <User className="h-4 w-4" /> Personal Information
          </CardTitle>
          {!readOnly && (
            !editing ? (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onEditStart}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onEditCancel}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button size="sm" className="gap-1.5" disabled={submitting} onClick={onEditSave}>
                  <Save className="h-3.5 w-3.5" /> {submitting ? "Saving…" : "Save"}
                </Button>
              </div>
            )
          )}
        </CardHeader>

        <CardContent className="space-y-2">
          {!editing ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField label="Gender" value={profile?.gender} />
              <InfoField label="Date of Birth" value={formatDobDisplay(profile?.dateOfBirth)} />
              <InfoField label="Alternate Phone" value={profile?.alternatePhone} />
              <InfoField label="Has Passport" value={profile?.hasPassport ? "Yes" : "No"} />
              {profile?.hasPassport && (
                <InfoField label="Passport Number" value={profile.passportNumber} />
              )}
              <InfoField label="Language Exam Given" value={profile?.languageExamGiven ? "Yes" : "No"} />
              <InfoField label="Preferred Country" value={profile?.preferredCountry} />
              <InfoField label="Field of Interest" value={profile?.fieldOfInterest} />
              <InfoField label="Visa Refusal Details" value={profile?.visaRefusalDetails} />
            </div>
          ) : (
            editState && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FieldGroup label="Gender">
                  <Select value={editState.gender} onValueChange={(v) => set("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Date of Birth">
                  <DobPicker value={editState.dateOfBirth} onChange={(v) => set("dateOfBirth", v)} />
                </FieldGroup>

                <FieldGroup label="Alternate Phone">
                  <Input value={editState.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} />
                </FieldGroup>

                <FieldGroup label="Has Passport">
                  <Select value={editState.hasPassport} onValueChange={(v) => set("hasPassport", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>

                {editState.hasPassport === "yes" && (
                  <FieldGroup label="Passport Number">
                    <Input
                      value={editState.passportNumber}
                      onChange={(e) => set("passportNumber", e.target.value)}
                      placeholder="e.g. A1234567"
                    />
                  </FieldGroup>
                )}

                <FieldGroup label="Language Exam Given">
                  <Select value={editState.languageExamGiven} onValueChange={(v) => set("languageExamGiven", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Preferred Country">
                  <Input value={editState.preferredCountry} onChange={(e) => set("preferredCountry", e.target.value)} />
                </FieldGroup>

                <FieldGroup label="Field of Interest">
                  <Textarea value={editState.fieldOfInterest} onChange={(e) => set("fieldOfInterest", e.target.value)} rows={2} className="resize-y" />
                </FieldGroup>

                <FieldGroup label="Visa Refusal Details">
                  <Textarea value={editState.visaRefusalDetails} onChange={(e) => set("visaRefusalDetails", e.target.value)} placeholder="None" rows={2} className="resize-y" />
                </FieldGroup>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* ── Education ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <GraduationCap className="h-4 w-4" /> Education
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!editing ? (
            education.length === 0 ? (
              <p className="rounded-md bg-muted/30 py-4 text-center text-sm text-muted-foreground">No education records.</p>
            ) : (
              <div className="space-y-3">
                {education.map((edu, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3 rounded-md border p-3 sm:grid-cols-3">
                    <InfoField label="Level" value={edu.educationLevel} />
                    <InfoField label="School / College" value={edu.schoolName} />
                    <InfoField label="Specialization" value={edu.specialization} />
                    <InfoField label="Year of Completion" value={edu.yearOfCompletion?.toString()} />
                    <InfoField label="% / CGPA" value={edu.percentageOrCgpa} />
                    <InfoField label="Backlogs" value={edu.numberOfBacklogs?.toString() ?? "0"} />
                  </div>
                ))}
              </div>
            )
          ) : (
            editState && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={addEdu} className="h-7 gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                {editState.education.length === 0 && (
                  <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
                    No education records. Click Add.
                  </p>
                )}
                {editState.education.map((edu, i) => (
                  <div key={i} className="relative rounded-lg border bg-muted/20 p-3">
                    <Button
                      type="button" size="icon" variant="ghost"
                      className="absolute right-2 top-2 h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => removeEdu(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="grid grid-cols-2 gap-2 pr-8 sm:grid-cols-3">
                      <FieldGroup label="Level">
                        <Select value={edu.educationLevel} onValueChange={(v) => setEdu(i, "educationLevel", v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select level" /></SelectTrigger>
                          <SelectContent>
                            {EDUCATION_LEVELS.map((l) => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                      <FieldGroup label="School / College">
                        <Input value={edu.schoolName} onChange={(e) => setEdu(i, "schoolName", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Specialization">
                        <Input value={edu.specialization} onChange={(e) => setEdu(i, "specialization", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Year of Completion">
                        <Input type="number" value={edu.yearOfCompletion} onChange={(e) => setEdu(i, "yearOfCompletion", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="% / CGPA">
                        <Input value={edu.percentageOrCgpa} onChange={(e) => setEdu(i, "percentageOrCgpa", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Backlogs">
                        <Input type="number" min="0" value={edu.numberOfBacklogs} onChange={(e) => setEdu(i, "numberOfBacklogs", e.target.value)} />
                      </FieldGroup>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* ── Language Exam Scores ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-4 w-4" /> Language Exam Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!editing ? (
            languageScores.length === 0 ? (
              <p className="rounded-md bg-muted/30 py-4 text-center text-sm text-muted-foreground">No language scores recorded.</p>
            ) : (
              <div className="space-y-3">
                {languageScores.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-3 rounded-md border p-3 sm:grid-cols-6">
                    <InfoField label="Exam" value={s.examType} />
                    <InfoField label="Listening" value={s.listening} />
                    <InfoField label="Reading" value={s.reading} />
                    <InfoField label="Writing" value={s.writing} />
                    <InfoField label="Speaking" value={s.speaking} />
                    <InfoField label="Overall" value={s.overallBand} />
                  </div>
                ))}
              </div>
            )
          ) : (
            editState && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={addScore} className="h-7 gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                {editState.languageScores.length === 0 && (
                  <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
                    No scores. Click Add.
                  </p>
                )}
                {editState.languageScores.map((s, i) => (
                  <div key={i} className="relative rounded-lg border bg-muted/20 p-3">
                    <Button
                      type="button" size="icon" variant="ghost"
                      className="absolute right-2 top-2 h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => removeScore(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="grid grid-cols-3 gap-2 pr-8 sm:grid-cols-6">
                      <FieldGroup label="Exam Type">
                        <Select value={s.examType} onValueChange={(v) => setScore(i, "examType", v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IELTS">IELTS</SelectItem>
                            <SelectItem value="PTE">PTE</SelectItem>
                            <SelectItem value="TOEFL">TOEFL</SelectItem>
                            <SelectItem value="Duolingo">Duolingo</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                      <FieldGroup label="Listening">
                        <Input type="number" step="0.5" value={s.listening} onChange={(e) => setScore(i, "listening", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Reading">
                        <Input type="number" step="0.5" value={s.reading} onChange={(e) => setScore(i, "reading", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Writing">
                        <Input type="number" step="0.5" value={s.writing} onChange={(e) => setScore(i, "writing", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Speaking">
                        <Input type="number" step="0.5" value={s.speaking} onChange={(e) => setScore(i, "speaking", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Overall">
                        <Input type="number" step="0.5" value={s.overallBand} onChange={(e) => setScore(i, "overallBand", e.target.value)} />
                      </FieldGroup>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* ── Family Members ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Users className="h-4 w-4" /> Family Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!editing ? (
            familyMembers.length === 0 ? (
              <p className="rounded-md bg-muted/30 py-4 text-center text-sm text-muted-foreground">No family members added.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {familyMembers.map((f, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-md border p-3">
                    <InfoField label="Name" value={f.memberName} />
                    <InfoField label="Phone" value={f.phoneNumber} />
                  </div>
                ))}
              </div>
            )
          ) : (
            editState && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={addFamily} className="h-7 gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                {editState.familyMembers.length === 0 && (
                  <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
                    No family members. Click Add.
                  </p>
                )}
                {editState.familyMembers.map((f, i) => (
                  <div key={i} className="relative rounded-lg border bg-muted/20 p-3">
                    <Button
                      type="button" size="icon" variant="ghost"
                      className="absolute right-2 top-2 h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => removeFamily(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="grid grid-cols-2 gap-2 pr-8">
                      <FieldGroup label="Name">
                        <Input value={f.memberName} onChange={(e) => setFamily(i, "memberName", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Phone">
                        <Input value={f.phoneNumber} onChange={(e) => setFamily(i, "phoneNumber", e.target.value)} />
                      </FieldGroup>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
