// client/src/components/checklist/ChecklistDrawer.tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SectionAccordion } from "@/components/checklist/SectionAccordion";
import { useChecklistDetail } from "@/hooks/useChecklists";

interface Props {
  slug: string | null;
  countryName: string | null;
  onClose: () => void;
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse px-6 pt-2 pb-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="h-11 bg-slate-100" />
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-7 bg-slate-50 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChecklistDrawer({ slug, countryName, onClose }: Props) {
  const { data, isLoading, isError } = useChecklistDetail(slug);

  const sortedSections = data
    ? data.sections.slice().sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  return (
    <Sheet
      open={!!slug}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="sm:max-w-[600px] p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-slate-200 shrink-0 pr-14">
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-base font-bold text-slate-900 leading-tight">
              {data?.title ?? (isLoading ? "Loading…" : "Checklist")}
            </SheetTitle>
            {data?.subType && (
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                {data.subType}
              </span>
            )}
          </div>
          <SheetDescription className="text-xs text-slate-400 mt-1">
            {countryName ?? "All Countries"}
          </SheetDescription>
        </SheetHeader>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && <DrawerSkeleton />}

          {isError && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <p className="text-sm text-slate-500">
                Failed to load checklist. Please try again.
              </p>
            </div>
          )}

          {data && (
            <div className="px-6 pt-4 pb-8 space-y-3">
              {sortedSections.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-12">
                  No sections added to this checklist yet.
                </p>
              ) : (
                sortedSections.map((section) => (
                  <SectionAccordion key={section.id} section={section} />
                ))
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
