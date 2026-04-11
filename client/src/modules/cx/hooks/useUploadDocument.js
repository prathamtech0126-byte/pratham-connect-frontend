import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cxApi } from "../services/cx.api";
import { CX_QUERY_KEYS } from "../constants/cx.constants";

export function useUploadDocument(clientId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => cxApi.uploadClientDocument(clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CX_QUERY_KEYS.clientDetails(clientId) });
      queryClient.invalidateQueries({ queryKey: CX_QUERY_KEYS.clientTimeline(clientId) });
      queryClient.invalidateQueries({ queryKey: CX_QUERY_KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: CX_QUERY_KEYS.activity });
    },
  });
}
