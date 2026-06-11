import { useSyncExternalStore } from "react";

/**
 * Document requests raised by the Binding Team to the CX Team.
 *
 * Demo-only store: persisted to localStorage so requests survive reloads and are
 * visible across roles in the same browser. Swap the read/write helpers for a
 * real API when the backend endpoint exists.
 */

export interface DocRequest {
  id: string;
  clientId: string;
  clientName: string;
  document: string;       // which document is needed
  note: string;           // free-text detail from binding
  requestedBy: string;    // binding agent name
  createdAt: string;      // ISO
  status: "open" | "resolved";
  resolvedAt?: string;    // ISO
}

const STORAGE_KEY = "cx_doc_requests";

function read(): DocRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DocRequest[]) : [];
  } catch {
    return [];
  }
}

let snapshot: DocRequest[] = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist(next: DocRequest[]) {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private-mode errors */
  }
  emit();
}

// Keep in sync when another tab (e.g. the CX user) changes the data.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      snapshot = read();
      emit();
    }
  });
}

export function getDocRequests(): DocRequest[] {
  return snapshot;
}

export function addDocRequest(input: Omit<DocRequest, "id" | "createdAt" | "status">): void {
  const req: DocRequest = {
    ...input,
    id: `dr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  persist([req, ...snapshot]);
}

export function resolveDocRequest(id: string): void {
  persist(
    snapshot.map((r) =>
      r.id === id ? { ...r, status: "resolved", resolvedAt: new Date().toISOString() } : r
    )
  );
}

export function deleteDocRequest(id: string): void {
  persist(snapshot.filter((r) => r.id !== id));
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React hook — reactive list of all document requests. */
export function useDocRequests(): DocRequest[] {
  return useSyncExternalStore(subscribe, getDocRequests, getDocRequests);
}

/** React hook — count of open requests (for badges). */
export function useOpenDocRequestCount(): number {
  const all = useDocRequests();
  return all.filter((r) => r.status === "open").length;
}
