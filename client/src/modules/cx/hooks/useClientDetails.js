import { useQuery } from "@tanstack/react-query";
import { cxApi } from "../services/cx.api";
import { CX_QUERY_KEYS } from "../constants/cx.constants";

export function useClientDetails(clientId) {
  const detailsQuery = useQuery({
    queryKey: CX_QUERY_KEYS.clientDetails(clientId),
    queryFn: () => cxApi.getClientById(clientId),
    enabled: Boolean(clientId),
  });

  const timelineQuery = useQuery({
    queryKey: CX_QUERY_KEYS.clientTimeline(clientId),
    queryFn: () => cxApi.getClientTimeline(clientId),
    enabled: Boolean(clientId),
  });

  return {
    client: detailsQuery.data || null,
    timeline: timelineQuery.data || [],
    isLoading: detailsQuery.isLoading || timelineQuery.isLoading,
    isError: detailsQuery.isError || timelineQuery.isError,
    refetch: () => Promise.all([detailsQuery.refetch(), timelineQuery.refetch()]),
  };
}
