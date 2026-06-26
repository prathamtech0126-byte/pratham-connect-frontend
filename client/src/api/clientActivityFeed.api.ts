import api from "@/lib/api";

export type ActivityEventPhase = "LEAD" | "ENROLLMENT" | "PROCESSING" | "ASSIGNMENT" | "DECISION";

export interface ActivityActor {
  id: number;
  name: string;
  role: string;
}

export interface ActivityEvent {
  id: string;
  occurredAt: string;
  phase: ActivityEventPhase;
  type: string;
  title: string;
  description: string | null;
  actor: ActivityActor | null;
  visaCaseId: string | null;
  metadata: {
    entityType?: string;
    newValue?: Record<string, unknown> | null;
    oldValue?: Record<string, unknown> | null;
    [key: string]: unknown;
  };
  source: string;
}

export interface ActivityFeedPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ClientActivityFeed {
  clientId: string;
  legacyClientId: number;
  events: ActivityEvent[];
  pagination: ActivityFeedPagination;
  actors?: ActivityActor[];
}

export interface ActivityFeedFilters {
  phase?: string;
  actorId?: number;
}

export async function fetchClientActivityFeed(
  clientId: number,
  page = 1,
  pageSize = 20,
  filters: ActivityFeedFilters = {}
): Promise<ClientActivityFeed> {
  const params: Record<string, unknown> = { page, pageSize };
  if (filters.phase && filters.phase !== "all") params.phase = filters.phase;
  if (filters.actorId && filters.actorId !== 0) params.actorId = filters.actorId;

  const res = await api.get<ClientActivityFeed>(
    `/api/modules/clients/${clientId}/activity-feed`,
    { params }
  );
  return res.data;
}
