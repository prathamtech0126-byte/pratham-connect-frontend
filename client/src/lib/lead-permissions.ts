import type { UserRole } from "@/context/auth-context";
import { hasFullAccess } from "@/lib/role-access";

type AutomationAccessUser = {
  role?: string | null;
  backendRole?: string | null;
};

function resolveBackendRole(userOrRole?: AutomationAccessUser | string | null): string | null {
  if (!userOrRole) return null;
  if (typeof userOrRole === "string") return userOrRole;
  return userOrRole.backendRole ?? userOrRole.role ?? null;
}

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

/** Lead automation — backend `admin` only (not superadmin). */
export function canAccessLeadAutomation(
  userOrRole?: AutomationAccessUser | string | null
): boolean {
  return resolveBackendRole(userOrRole) === "admin";
}

export function canConvertToClient(role: UserRole): boolean {
  if (hasFullAccess(role)) return true;
  return role === "telecaller";
}

export function isMarketingHead(role: UserRole): boolean {
  return role === "marketing_head";
}
