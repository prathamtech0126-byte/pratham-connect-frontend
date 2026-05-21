/** Auth user shape used for performer resolution. */
type AuthUserLike = { id?: string | number; name?: string } | null | undefined;

type StaffRow = { id: number; fullName: string };

const GENERIC_NAMES = new Set(["user", "system", ""]);

/**
 * Resolve a display name for timeline / activity attribution.
 * Prefers real full name from auth or staff lists; never returns generic "User".
 */
export function resolvePerformerDisplayName(
  user: AuthUserLike,
  telecallers: StaffRow[] = [],
  counsellors: StaffRow[] = []
): string {
  const rawName = user?.name?.trim() ?? "";
  if (rawName && !GENERIC_NAMES.has(rawName.toLowerCase())) {
    return rawName;
  }

  const uid = user?.id != null ? Number(user.id) : NaN;
  if (Number.isFinite(uid)) {
    const tc = telecallers.find((t) => t.id === uid);
    if (tc?.fullName?.trim()) return tc.fullName.trim();
    const co = counsellors.find((c) => c.id === uid);
    if (co?.fullName?.trim()) return co.fullName.trim();
  }

  return rawName || "System";
}
