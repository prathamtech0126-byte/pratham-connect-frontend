import type { QueryClient } from "@tanstack/react-query";
import type { FrontDeskLead, FrontDeskLeadDetail, LeadsListResponse } from "@/api/frontdesk.api";

/** Refetch all front desk dashboard queries (works with global staleTime: Infinity). */
export async function refreshFrontDeskDashboardCaches(
  queryClient: QueryClient,
  opts?: { leadId?: number }
): Promise<void> {
  const tasks: Promise<unknown>[] = [
    queryClient.refetchQueries({ queryKey: ["frontdesk-leads"], type: "all" }),
    queryClient.refetchQueries({ queryKey: ["frontdesk-stats"], type: "all" }),
    queryClient.refetchQueries({ queryKey: ["frontdesk-activity"], type: "all" }),
  ];
  if (opts?.leadId != null) {
    tasks.push(
      queryClient.refetchQueries({
        queryKey: ["frontdesk-lead-detail", opts.leadId],
        type: "all",
      })
    );
  }
  await Promise.all(tasks);
}

const INBOUND_REASONS = new Set([
  "frontdesk:registered",
  "frontdesk:inbound_updated",
  "lead:created",
]);

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

const bool = (v: unknown): boolean => v === true || v === "true";

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Map socket / lead-change payload into a list row (best-effort). */
export function snapshotToListRow(
  leadId: number,
  snapshot: Record<string, unknown>
): FrontDeskLead | null {
  const fullName = str(snapshot.fullName);
  const phone = str(snapshot.phone);
  if (!fullName && !phone) return null;

  return {
    id: num(snapshot.id) ?? leadId,
    fullName: fullName ?? "—",
    phone: phone ?? "—",
    email: str(snapshot.email),
    city: str(snapshot.city),
    leadSource: str(snapshot.leadSource),
    leadType: str(snapshot.leadType),
    externalLeadId: str(snapshot.externalLeadId),
    assignmentStatus: str(snapshot.assignmentStatus) ?? "not_assigned",
    progressStatus: str(snapshot.progressStatus) ?? "active",
    isVerified: bool(snapshot.isVerified),
    verifiedAt: str(snapshot.verifiedAt),
    createdAt: str(snapshot.createdAt) ?? new Date().toISOString(),
    currentCounsellorId: num(snapshot.currentCounsellorId),
    counsellorName: str(snapshot.counsellorName),
  };
}

/**
 * Apply socket snapshot to React Query cache immediately (before REST refetch).
 * Makes list/detail/stats update on the same tick as the socket event.
 */
export function applyFrontDeskSocketSnapshot(
  queryClient: QueryClient,
  leadId: number,
  snapshot: Record<string, unknown>,
  reason?: string
): void {
  const row = snapshotToListRow(leadId, snapshot);
  if (!row) return;

  const isNewInbound = INBOUND_REASONS.has(reason ?? "");

  queryClient.setQueriesData<LeadsListResponse>(
    { queryKey: ["frontdesk-leads"] },
    (old) => {
      if (!old?.rows) return old;
      const idx = old.rows.findIndex((r) => r.id === leadId);
      if (idx >= 0) {
        const rows = old.rows.slice();
        rows[idx] = { ...rows[idx], ...row };
        return { ...old, rows };
      }
      if (!isNewInbound) return old;
      return {
        ...old,
        rows: [row, ...old.rows],
        total: old.total + 1,
      };
    }
  );

  queryClient.setQueryData<{ success: boolean; data: FrontDeskLeadDetail }>(
    ["frontdesk-lead-detail", leadId],
    (old) => {
      const base = (old?.data ?? row) as FrontDeskLeadDetail;
      return {
        success: true,
        data: {
          ...base,
          ...row,
          profile:
            (snapshot.profile as FrontDeskLeadDetail["profile"]) ??
            base.profile ??
            null,
          education:
            (snapshot.education as FrontDeskLeadDetail["education"]) ??
            base.education ??
            [],
          languageScores:
            (snapshot.languageScores as FrontDeskLeadDetail["languageScores"]) ??
            base.languageScores ??
            [],
          familyMembers:
            (snapshot.familyMembers as FrontDeskLeadDetail["familyMembers"]) ??
            base.familyMembers ??
            [],
        },
      };
    }
  );

  if (isNewInbound) {
    queryClient.setQueriesData<{ success: boolean; data: { total: number; verified: number; assigned: number; notAssigned: number } }>(
      { queryKey: ["frontdesk-stats"] },
      (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            total: old.data.total + 1,
            notAssigned: old.data.notAssigned + 1,
          },
        };
      }
    );
  }
}

/** Patch list row fields immediately after a local save (before refetch completes). */
export function patchFrontDeskListRow(
  queryClient: QueryClient,
  leadId: number,
  fields: Pick<FrontDeskLeadDetail, "fullName" | "phone" | "email" | "city">
): void {
  queryClient.setQueriesData<LeadsListResponse>({ queryKey: ["frontdesk-leads"] }, (old) => {
    if (!old?.rows) return old;
    return {
      ...old,
      rows: old.rows.map((row) => (row.id === leadId ? { ...row, ...fields } : row)),
    };
  });
}

/** Patch detail cache from the PUT body so the read-only view updates instantly. */
export function patchFrontDeskDetailFromEdit(
  queryClient: QueryClient,
  leadId: number,
  body: Record<string, unknown>
): void {
  queryClient.setQueryData<{ success: boolean; data: FrontDeskLeadDetail }>(
    ["frontdesk-lead-detail", leadId],
    (old) => {
      if (!old?.data) return old;
      const profilePatch = (body.profile as Record<string, unknown> | undefined) ?? {};
      const education = body.education as FrontDeskLeadDetail["education"] | undefined;
      const languageScores = body.languageScores as FrontDeskLeadDetail["languageScores"] | undefined;
      const familyMembers = body.familyMembers as FrontDeskLeadDetail["familyMembers"] | undefined;

      return {
        ...old,
        data: {
          ...old.data,
          fullName: (body.fullName as string) ?? old.data.fullName,
          phone: (body.phone as string) ?? old.data.phone,
          email: body.email !== undefined ? (body.email as string | null) : old.data.email,
          city: body.city !== undefined ? (body.city as string | null) : old.data.city,
          profile: old.data.profile
            ? { ...old.data.profile, ...profilePatch }
            : old.data.profile,
          ...(education !== undefined
            ? {
                education: education.map((e, i) => ({
                  id: old.data.education[i]?.id ?? -(i + 1),
                  ...e,
                })),
              }
            : {}),
          ...(languageScores !== undefined
            ? {
                languageScores: languageScores.map((s, i) => ({
                  id: old.data.languageScores[i]?.id ?? -(i + 1),
                  ...s,
                })),
              }
            : {}),
          ...(familyMembers !== undefined
            ? {
                familyMembers: familyMembers.map((f, i) => ({
                  id: old.data.familyMembers[i]?.id ?? -(i + 1),
                  ...f,
                })),
              }
            : {}),
        },
      };
    }
  );
}

/** Extract lead id from generic `lead:created` / `lead:updated` socket payloads. */
export function leadIdFromSocketPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const nested =
    record.lead && typeof record.lead === "object"
      ? (record.lead as Record<string, unknown>)
      : null;
  const raw = record.id ?? record.leadId ?? nested?.id ?? nested?.leadId;
  const id = typeof raw === "string" ? parseInt(raw, 10) : raw;
  return typeof id === "number" && Number.isFinite(id) && id > 0 ? id : null;
}
