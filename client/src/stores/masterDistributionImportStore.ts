export type MasterDistributionImportState =
  | { phase: "idle" }
  | { phase: "persist"; pageId: string }
  | { phase: "import"; pageId: string; current: number; total: number; formName: string };

let snapshot: MasterDistributionImportState = { phase: "idle" };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getMasterDistributionImport(): MasterDistributionImportState {
  return snapshot;
}

export function setMasterDistributionImport(next: MasterDistributionImportState): void {
  snapshot = next;
  emit();
}

export function subscribeMasterDistributionImport(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}
