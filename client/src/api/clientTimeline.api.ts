import api from "@/lib/api";

export type TimelineEventPhase = "ASSIGNMENT" | "PROCESSING" | "DECISION" | "ENROLLMENT";

export interface TimelineActor {
  id: string;
  name: string;
  role: string;
}

export interface TimelineEvent {
  id: string;
  occurredAt: string;
  phase: TimelineEventPhase;
  type: string;
  title: string;
  description: string | null;
  actor: TimelineActor | null;
  visaCaseId: string | null;
  metadata: Record<string, unknown>;
  source: string;
}

export interface ClientJourneyTimeline {
  clientId: string;
  legacyClientId: string | number;
  counsellorId: string;
  events: TimelineEvent[];
  total: number;
}

export async function fetchClientJourneyTimeline(
  clientId: number | string
): Promise<ClientJourneyTimeline> {
  const res = await api.get<ClientJourneyTimeline>(
    `/api/modules/clients/${clientId}/journey-timeline`
  );
  return res.data;
}
