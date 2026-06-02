import api from "@/lib/api";

export async function fetchTourSeenPages(): Promise<string[]> {
  const res = await api.get<{ tourSeenPages?: string[] }>("/api/users/me");
  return res.data.tourSeenPages ?? [];
}

export async function markTourPageSeen(pageKey: string): Promise<void> {
  await api.patch("/api/users/tour-seen", { pageKey });
}
