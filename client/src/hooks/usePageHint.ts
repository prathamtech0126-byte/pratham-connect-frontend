import { useState, useEffect } from "react";
import { fetchTourSeenPages, markTourPageSeen } from "@/api/user.api";

export function usePageHint(pageKey: string) {
  const storageKey = `hint_seen_${pageKey}`;
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Fast path: localStorage cache already has it
    if (localStorage.getItem(storageKey)) return;

    // Slow path: check DB (handles cache clears and cross-device)
    let cancelled = false;
    fetchTourSeenPages()
      .then((seenPages) => {
        if (cancelled) return;
        if (seenPages.includes(pageKey)) {
          localStorage.setItem(storageKey, "1");
        } else {
          setShowHint(true);
        }
      })
      .catch(() => {
        // If API fails, show the tour (non-critical)
        if (!cancelled) setShowHint(true);
      });

    return () => { cancelled = true; };
  }, [storageKey, pageKey]);

  async function dismissHint() {
    localStorage.setItem(storageKey, "1");
    setShowHint(false);
    try {
      await markTourPageSeen(pageKey);
    } catch {
      // localStorage already updated; DB will sync next time
    }
  }

  function resetHint() {
    localStorage.removeItem(storageKey);
    setShowHint(true);
  }

  return { showHint, dismissHint, resetHint };
}
