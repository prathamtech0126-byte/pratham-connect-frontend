// client/src/hooks/useChecklists.ts
import { useQuery } from "@tanstack/react-query";
import {
  fetchCategories,
  fetchCountries,
  fetchChecklists,
  fetchChecklistDetail,
  searchItems,
} from "@/api/checklist.api";

export function useCategories() {
  return useQuery({
    queryKey: ["checklist-categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ["checklist-countries"],
    queryFn: fetchCountries,
    staleTime: 1000 * 60 * 10,
  });
}

export function useChecklists(
  category: string | null,
  country: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["checklists", category, country],
    queryFn: () => fetchChecklists(category, country),
    enabled,
  });
}

export function useChecklistDetail(slug: string | null) {
  return useQuery({
    queryKey: ["checklist-detail", slug],
    queryFn: () => fetchChecklistDetail(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["checklist-search", query],
    queryFn: () => searchItems(query),
    enabled: query.length >= 2,
  });
}
