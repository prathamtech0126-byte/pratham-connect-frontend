import ExcelJS from "exceljs";
import { format } from "date-fns";
import type { LeadEntity } from "@/api/leads.api";
import { getLeadSourceLabel, type LeadSourceOption } from "@/lib/lead-source-display";

function humanizeEnum(value?: string | null): string {
  if (!value?.trim()) return "";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveLeadTypeLabel(
  slug: string | null | undefined,
  saleTypes: { saleType: string; displayAlias?: string | null }[]
): string {
  if (!slug?.trim()) return "";
  const match = saleTypes.find((t) => t.saleType === slug);
  return match?.displayAlias?.trim() || humanizeEnum(slug);
}

function formatTransferredAt(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "dd/MM/yyyy HH:mm");
}

const HEADERS = [
  "Lead Name",
  "Mobile Number",
  "Current Telecaller",
  "Current Counsellor",
  "Assignment Status",
  "Eligibility Status",
  "Quality",
  "All Notes",
  "Transferred At",
  "Lead Source",
  "Lead Type",
] as const;

export async function downloadLeadsExcel(input: {
  leads: LeadEntity[];
  notesByLeadId: Record<number, string>;
  sourceOptions: LeadSourceOption[];
  saleTypes: { saleType: string; displayAlias?: string | null }[];
  filename?: string;
}): Promise<void> {
  const { leads, notesByLeadId, sourceOptions, saleTypes } = input;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");

  sheet.columns = [
    { key: "name", width: 28 },
    { key: "phone", width: 16 },
    { key: "telecaller", width: 22 },
    { key: "counsellor", width: 22 },
    { key: "assignment", width: 18 },
    { key: "eligibility", width: 18 },
    { key: "quality", width: 14 },
    { key: "notes", width: 48 },
    { key: "transferredAt", width: 20 },
    { key: "source", width: 18 },
    { key: "type", width: 18 },
  ];

  sheet.addRow([...HEADERS]);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };

  for (const lead of leads) {
    sheet.addRow({
      name: lead.fullName ?? "",
      phone: lead.phone ?? "",
      telecaller:
        lead.telecallerName?.trim() ||
        (lead.currentTelecallerId ? `User #${lead.currentTelecallerId}` : ""),
      counsellor:
        lead.counsellorName?.trim() ||
        (lead.currentCounsellorId ? `User #${lead.currentCounsellorId}` : ""),
      assignment: humanizeEnum(lead.assignmentStatus),
      eligibility: humanizeEnum(lead.eligibilityStatus),
      quality: humanizeEnum(lead.leadQuality),
      notes: notesByLeadId[lead.id] ?? lead.latestNote?.trim() ?? "",
      transferredAt: formatTransferredAt(lead.transferredAt),
      source: getLeadSourceLabel(lead.leadSource, sourceOptions) || lead.leadSource || "",
      type: resolveLeadTypeLabel(lead.leadType, saleTypes),
    });
  }

  for (const row of sheet.getRows(2, leads.length) ?? []) {
    row.alignment = { vertical: "top", wrapText: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    input.filename ?? `Leads_Export_${format(new Date(), "dd-MM-yyyy_HHmm")}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
