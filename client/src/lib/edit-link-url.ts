/** Build the client-facing edit URL from API response or fallback to current origin. */
export function resolveEditUrl(editUrl: string | null | undefined, token: string): string {
  const trimmed = editUrl?.trim();
  if (trimmed) return trimmed;

  if (typeof window !== "undefined") {
    return `${window.location.origin}/lead/edit?token=${encodeURIComponent(token)}`;
  }
  return `/lead/edit?token=${encodeURIComponent(token)}`;
}
