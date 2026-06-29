import { useQuery } from "@tanstack/react-query";
import { fetchClientJourneyTimeline } from "@/api/clientTimeline.api";

export function useClientTimeline(clientId: number | null) {
  return useQuery({
    queryKey: ["client-journey-timeline", clientId],
    queryFn: () => fetchClientJourneyTimeline(clientId!),
    enabled: !!clientId,
    staleTime: 30 * 1000,
    retry: false,
  });
}
