import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cxApi } from "../services/cx.api";
import { CX_QUERY_KEYS } from "../constants/cx.constants";

export function useClients(filters = {}) {
  const query = useQuery({
    queryKey: [...CX_QUERY_KEYS.clients, filters],
    queryFn: () => cxApi.getClients(filters),
  });

  const clients = useMemo(() => query.data || [], [query.data]);

  return {
    ...query,
    clients,
  };
}
