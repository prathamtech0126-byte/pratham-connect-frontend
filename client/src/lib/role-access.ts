import type { UserRole } from "@/context/auth-context";

/** Developer role bypasses UI route and feature gates (full CRM access). */
export function isDeveloper(role: string | undefined | null): boolean {
  return role === "developer";
}

export function hasFullAccess(role: string | undefined | null): boolean {
  return isDeveloper(role);
}

export function canAccessByRole(
  role: string | undefined | null,
  allowedRoles?: readonly UserRole[]
): boolean {
  if (hasFullAccess(role)) return true;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!role) return false;
  return allowedRoles.includes(role as UserRole);
}
