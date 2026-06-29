import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchClientActivityFeed, type ActivityFeedFilters } from "@/api/clientActivityFeed.api";

export function useClientActivityFeed(
  clientId: number | null,
  page = 1,
  pageSize = 20,
  filters: ActivityFeedFilters = {}
) {
  return useQuery({
    queryKey: ["client-activity-feed", clientId, page, pageSize, filters.phase, filters.actorId],
    queryFn: () => fetchClientActivityFeed(clientId!, page, pageSize, filters),
    enabled: !!clientId,
    staleTime: 30 * 1000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}
