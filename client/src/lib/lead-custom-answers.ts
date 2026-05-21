import type { LeadEntity } from "@/api/leads.api";

/** Keys Meta / forms use for fields we already show on lead detail. */
const STANDARD_FIELD_ALIASES = new Set([
  "full_name",
  "fullname",
  "name",
  "student_name",
  "candidate_name",
  "applicant_name",
  "phone",
  "phone_number",
  "phonenumber",
  "mobile",
  "mobile_number",
  "contact_number",
  "contact_no",
  "tel",
  "telephone",
  "whatsapp",
  "whats_app",
  "wa_number",
  "whatsapp_number",
  "email",
  "email_address",
  "emailaddress",
  "e_mail",
  "city",
  "location",
  "town",
  "residence",
  "residence_city",
]);

const KEY_PREFIX_STRIP =
  /^(enter_|your_|what_is_your_|please_enter_|input_|student_|candidate_)/;

export function normalizeCustomAnswerKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[?.,']/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
}

function formatAnswerForCompare(val: unknown): string {
  if (val == null || val === "") return "";
  if (Array.isArray(val)) {
    return val
      .map((v) => String(v).trim())
      .filter(Boolean)
      .join(", ");
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val).trim();
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function scalarEquals(a: string, b: string, phone = false): boolean {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  if (phone) return normalizePhone(left) === normalizePhone(right);
  return left.toLowerCase() === right.toLowerCase();
}

export function isStandardCustomAnswerKey(key: string): boolean {
  const normalized = normalizeCustomAnswerKey(key);
  if (STANDARD_FIELD_ALIASES.has(normalized)) return true;

  const stripped = normalized.replace(KEY_PREFIX_STRIP, "");
  if (STANDARD_FIELD_ALIASES.has(stripped)) return true;

  return Array.from(STANDARD_FIELD_ALIASES).some(
    (alias) => normalized.endsWith(`_${alias}`) || normalized.startsWith(`${alias}_`)
  );
}

export function customAnswerMatchesLeadField(
  val: unknown,
  lead: Pick<LeadEntity, "fullName" | "phone" | "whatsapp" | "email" | "city">
): boolean {
  const answer = formatAnswerForCompare(val);
  if (!answer) return false;

  const pairs: { value?: string | null; phone?: boolean }[] = [
    { value: lead.fullName },
    { value: lead.email },
    { value: lead.city },
    { value: lead.phone, phone: true },
    { value: lead.whatsapp, phone: true },
  ];

  return pairs.some(({ value, phone }) => value && scalarEquals(answer, value, phone));
}

/** Keys from customAnswers that are not already represented in lead detail fields. */
export function getUnmatchedCustomAnswerKeys(
  customAnswers: Record<string, unknown>,
  lead: Pick<LeadEntity, "fullName" | "phone" | "whatsapp" | "email" | "city">
): string[] {
  return Object.keys(customAnswers).filter((key) => {
    if (isStandardCustomAnswerKey(key)) return false;
    return !customAnswerMatchesLeadField(customAnswers[key], lead);
  });
}
