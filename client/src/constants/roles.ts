import type { UserRole } from "@/context/auth-context";

export const BACKEND_TEAM_ROLES = {
  BACKEND_MANAGER: "backend_manager",
  APPLICATION_TEAM: "application_team",
  CUSTOMER_EXPERIENCE: "customer_experience",
  BINDING_TEAM: "binding_team",
} as const;

export const CX_ALLOWED_ROLES: UserRole[] = [
  BACKEND_TEAM_ROLES.CUSTOMER_EXPERIENCE,
  BACKEND_TEAM_ROLES.BACKEND_MANAGER,
  "superadmin",
  "developer",
];

export const BINDING_ALLOWED_ROLES: UserRole[] = [
  BACKEND_TEAM_ROLES.BINDING_TEAM,
  BACKEND_TEAM_ROLES.BACKEND_MANAGER,
  "superadmin",
  "developer",
];

export const APPLICATION_ALLOWED_ROLES: UserRole[] = [
  BACKEND_TEAM_ROLES.APPLICATION_TEAM,
  BACKEND_TEAM_ROLES.BACKEND_MANAGER,
  "superadmin",
  "developer",
];

export const BACKEND_ALLOWED_ROLES: UserRole[] = [
  BACKEND_TEAM_ROLES.BACKEND_MANAGER,
  BACKEND_TEAM_ROLES.APPLICATION_TEAM,
  BACKEND_TEAM_ROLES.CUSTOMER_EXPERIENCE,
  BACKEND_TEAM_ROLES.BINDING_TEAM,
  "superadmin",
  "developer",
];

export const BACKEND_CHECKLIST_ADMIN_ROLES: UserRole[] = [
  BACKEND_TEAM_ROLES.BACKEND_MANAGER,
  "superadmin",
  "developer",
];

export const CLIENT_FOLDER_ALLOWED_ROLES: UserRole[] = [...BACKEND_ALLOWED_ROLES];
