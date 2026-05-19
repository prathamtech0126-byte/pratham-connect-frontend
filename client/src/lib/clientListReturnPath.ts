/** Return paths stored in sessionStorage when opening a client from a list view. */
export function isClientListReturnPath(path: string | null): boolean {
  if (!path || !path.startsWith("/")) return false;
  const base = path.split("?")[0] ?? "";
  return (
    base.startsWith("/clients/counsellor/") ||
    base.startsWith("/clients/archive/counsellor/") ||
    base.startsWith("/clients/all-counsellor-clients")
  );
}
