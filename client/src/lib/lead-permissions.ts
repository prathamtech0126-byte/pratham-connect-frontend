import type { UserRole } from "@/context/auth-context";
import { hasFullAccess } from "@/lib/role-access";

/** All roles that can access lead list, detail, kanban, assign, notes */
export function canAccessLeads(role: UserRole): boolean {
  if (hasFullAccess(role)) return true;
  return ["superadmin", "developer", "manager", "counsellor", "telecaller", "marketing_head"].includes(role);
}

export function canAssignLead(role: UserRole): boolean {
  if (hasFullAccess(role)) return true;
  return ["superadmin", "developer", "manager", "counsellor", "telecaller"].includes(role);
}

export function canAccessCustomReports(role: UserRole): boolean {
  if (hasFullAccess(role)) return true;
  return ["superadmin", "developer", "manager", "marketing_head"].includes(role);
}

export function canUseCsvImportExport(role: UserRole): boolean {
  if (hasFullAccess(role)) return true;
  return ["superadmin", "developer", "manager", "marketing_head"].includes(role);
}

export function canConvertToClient(role: UserRole): boolean {
  if (hasFullAccess(role)) return true;
  return role === "telecaller";
}

export function isMarketingHead(role: UserRole): boolean {
  return role === "marketing_head";
}
