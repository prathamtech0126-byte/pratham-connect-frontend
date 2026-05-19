import type { UserRole } from "@/context/auth-context";

/** All roles that can access lead list, detail, kanban, assign, notes */
export function canAccessLeads(role: UserRole): boolean {
  return ["superadmin", "manager", "counsellor", "telecaller"].includes(role);
}

export function canAssignLead(role: UserRole): boolean {
  return ["superadmin", "manager", "counsellor", "telecaller"].includes(role);
}

export function canAccessCustomReports(role: UserRole): boolean {
  return ["superadmin", "manager"].includes(role);
}

export function canUseCsvImportExport(role: UserRole): boolean {
  return ["superadmin", "manager"].includes(role);
}

export function canConvertToClient(role: UserRole): boolean {
  return role === "telecaller";
}
