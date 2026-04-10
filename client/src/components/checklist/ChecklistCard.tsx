// client/src/components/checklist/ChecklistCard.tsx
import { Globe, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChecklistSummary } from "@/api/checklist.api";

interface Props {
  checklist: ChecklistSummary;
  countryName: string | null;
  onView: (slug: string) => void;
}

export function ChecklistCard({ checklist, countryName, onView }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col p-5 gap-4">
      {/* Title + sub-type */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800 leading-snug flex-1">
          {checklist.title}
        </h3>
        {checklist.subType && (
          <span className="flex-shrink-0 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
            {checklist.subType}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{countryName ?? "All Countries"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {checklist.sectionCount > 0
              ? `${checklist.sectionCount} sections · ${checklist.itemCount} items`
              : "—"}
          </span>
        </div>
      </div>

      {/* Action */}
      <Button
        onClick={() => onView(checklist.slug)}
        className="mt-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
      >
        View Checklist
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
