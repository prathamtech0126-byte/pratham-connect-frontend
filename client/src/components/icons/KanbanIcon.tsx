import { cn } from "@/lib/utils";

/**
 * Kanban / Board icon using the Flaticon UIcons "regular rounded" font
 * (fi fi-rr-chart-kanban) — weight matches the lucide outline icons around it.
 * The stylesheet is loaded in client/index.html.
 *
 * Shaped like a lucide icon (accepts `className`) so it can be dropped into the
 * sidebar's `icon` slot. Font glyphs size via font-size, so we set an explicit
 * 20px size (= lucide w-5) and center it inside the box the sidebar passes in.
 */
export function KanbanIcon({ className }: { className?: string }) {
  return (
    <i
      aria-hidden
      className={cn(
        "fi fi-rr-chart-kanban inline-flex items-center justify-center not-italic text-[20px] leading-none",
        className
      )}
    />
  );
}
