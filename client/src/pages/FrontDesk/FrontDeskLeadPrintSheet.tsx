import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import type { FrontDeskLeadDetail } from "@/api/frontdesk.api";
import prathamLogo from "@/assets/Pratham-international-logo orignal.webp";

/** Pratham brand colors for print */
const C = {
  orange: "#f17e3a",
  gray: "#808080",
  dark: "#2c2c2c",
  lightBg: "#f5f5f5",
  border: "#e5e5e5",
};

function PrintField({ label, value }: { label: string; value?: string | null }) {
  const display = value?.trim() ?? "";
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.orange }}>
        {label}
      </p>
      <p className="mt-0.5 min-h-[1.1em] text-[13px] leading-snug break-words" style={{ color: C.dark }}>
        {display}
      </p>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3 last:mb-0">
      <h3
        className="mb-2 border-b pb-1 text-[11px] font-bold uppercase tracking-wider"
        style={{ color: C.orange, borderColor: `${C.orange}40` }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

interface PrintEditLink {
  url: string;
  expiresAt: string;
}

const QR_SIZE = 52;

function PrintHeader({
  lead,
  editLink,
}: {
  lead: FrontDeskLeadDetail;
  editLink?: PrintEditLink | null;
}) {
  return (
    <header className="mb-4 pb-3" style={{ borderBottom: `2px solid ${C.orange}` }}>
      <div className="print-header-row flex w-full flex-row items-center justify-between gap-4">
        {/* Left — logo */}
        <div className="print-logo-wrap flex shrink-0 justify-start">
          <img
            src={prathamLogo}
            alt="Pratham International"
            className="print-logo h-10 w-auto max-w-[180px] object-contain object-left"
            decoding="sync"
            loading="eager"
          />
        </div>

        {/* Right — QR */}
        <div className="print-qr-block ml-auto flex shrink-0 flex-col items-end text-right">
          {editLink ? (
            <>
              <div
                className="print-qr-frame inline-flex items-center justify-center rounded bg-white p-1"
                style={{ border: `1px solid ${C.orange}` }}
              >
                <QRCodeSVG
                  value={editLink.url}
                  size={QR_SIZE}
                  level="M"
                  className="print-qr-code block"
                />
              </div>
              <p className="mt-1 text-[8px] font-semibold leading-tight" style={{ color: C.dark }}>
                Scan to update
              </p>
              <p className="mt-0.5 text-[7px] leading-tight" style={{ color: C.gray }}>
                Until {format(new Date(editLink.expiresAt), "d MMM, HH:mm")}
              </p>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <h1 className="text-2xl font-bold" style={{ color: C.dark }}>{lead.fullName}</h1>
      </div>
    </header>
  );
}

interface Props {
  lead: FrontDeskLeadDetail;
  editLink?: PrintEditLink | null;
}

export default function FrontDeskLeadPrintSheet({ lead, editLink }: Props) {
  const profile = lead.profile;

  return (
    <div className="front-desk-print-sheet mx-auto w-full max-w-[210mm] bg-white p-0" style={{ color: C.dark }}>
      <PrintHeader lead={lead} editLink={editLink} />

      {/* Summary strip */}
      <div
        className="mb-4 grid grid-cols-4 gap-3 rounded-lg p-2.5"
        style={{ backgroundColor: C.lightBg, border: `1px solid ${C.border}` }}
      >
        <PrintField label="Lead Type" value={lead.leadType} />
        <PrintField label="City" value={lead.city} />
        <PrintField
          label="Registered"
          value={lead.createdAt ? format(new Date(lead.createdAt), "d MMM yyyy, HH:mm") : undefined}
        />
        <PrintField label="Counsellor" value={lead.counsellorName} />
      </div>

      <PrintSection title="Personal Information">
        <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
          <PrintField label="Full Name" value={lead.fullName} />
          <PrintField label="Phone" value={lead.phone} />
          <PrintField label="Alternate Phone" value={profile?.alternatePhone} />
          <PrintField label="Email" value={lead.email} />
          <PrintField
            label="Date of Birth"
            value={profile?.dateOfBirth ? format(new Date(profile.dateOfBirth), "d MMM yyyy") : undefined}
          />
          <PrintField label="Gender" value={profile?.gender} />
          <PrintField label="City" value={lead.city} />
          <PrintField label="Language Exam" value={profile?.languageExamGiven ? "Yes" : "No"} />
          <PrintField label="Passport" value={profile?.hasPassport ? "Yes" : "No"} />
          <PrintField label="Preferred Country" value={profile?.preferredCountry} />
          <PrintField label="Field of Interest" value={profile?.fieldOfInterest} />
          <PrintField label="Visa Refusal" value={profile?.visaRefusalDetails} />
        </div>
      </PrintSection>

      {lead.education.length > 0 && (
        <PrintSection title={`Education (${lead.education.length})`}>
          <div className="space-y-2">
            {lead.education.map((edu) => (
              <div
                key={edu.id}
                className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-md p-2"
                style={{ backgroundColor: C.lightBg, border: `1px solid ${C.border}` }}
              >
                <PrintField label="Level" value={edu.educationLevel} />
                <PrintField label="School / College" value={edu.schoolName} />
                <PrintField label="Specialization" value={edu.specialization} />
                <PrintField label="Year" value={edu.yearOfCompletion?.toString()} />
                <PrintField label="% / CGPA" value={edu.percentageOrCgpa} />
                <PrintField label="Backlogs" value={edu.numberOfBacklogs?.toString() ?? "0"} />
              </div>
            ))}
          </div>
        </PrintSection>
      )}

      {lead.languageScores.length > 0 && (
        <PrintSection title={`Language Scores (${lead.languageScores.length})`}>
          <div className="space-y-2">
            {lead.languageScores.map((score) => (
              <div
                key={score.id}
                className="grid grid-cols-6 gap-2 rounded-md p-2"
                style={{ backgroundColor: C.lightBg, border: `1px solid ${C.border}` }}
              >
                <PrintField label="Exam" value={score.examType} />
                <PrintField label="L" value={score.listening} />
                <PrintField label="R" value={score.reading} />
                <PrintField label="W" value={score.writing} />
                <PrintField label="S" value={score.speaking} />
                <PrintField label="Overall" value={score.overallBand} />
              </div>
            ))}
          </div>
        </PrintSection>
      )}

      {lead.familyMembers.length > 0 && (
        <PrintSection title={`Family (${lead.familyMembers.length})`}>
          <div className="grid grid-cols-2 gap-2">
            {lead.familyMembers.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-2 gap-2 rounded-md p-2"
                style={{ backgroundColor: C.lightBg, border: `1px solid ${C.border}` }}
              >
                <PrintField label="Name" value={member.memberName} />
                <PrintField label="Phone" value={member.phoneNumber} />
              </div>
            ))}
          </div>
        </PrintSection>
      )}

      <footer className="mt-4 flex items-end justify-between pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="min-w-0">
          <p className="text-[11px]" style={{ color: C.gray }}>
            {format(new Date(), "d MMM yyyy, HH:mm")}
          </p>
          {lead.externalLeadId ? (
            <p className="mt-0.5 text-[10px]" style={{ color: C.gray }}>Ref: {lead.externalLeadId}</p>
          ) : null}
        </div>
        <p className="shrink-0 text-[11px] font-medium" style={{ color: C.orange }}>
          Pratham International
        </p>
      </footer>
    </div>
  );
}
