// client/src/components/checklist/SectionAccordion.tsx
import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Section } from "@/api/checklist.api";

interface Props {
  section: Section;
}

export function SectionAccordion({ section }: Props) {
  const [open, setOpen] = useState(true);

  const sortedItems = section.items
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">
            {section.title}
          </span>
          {section.isConditional && (
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              {section.conditionText ?? "Conditional"}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 py-3 space-y-3">
          {/* Description info box */}
          {section.description && (
            <div className="flex gap-2 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg px-3 py-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700">{section.description}</p>
            </div>
          )}

          {/* Items */}
          {sortedItems.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No documents listed yet.
            </p>
          ) : (
            <ol className="space-y-3">
              {sortedItems.map((item, index) => (
                <li key={item.id} className="flex items-start gap-3">
                  {/* Number */}
                  <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 shrink-0 text-right">
                    {index + 1}.
                  </span>

                  {/* Name + notes */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-800">
                      {item.name}
                    </span>
                    {item.notes && (
                      <p className="text-xs italic text-slate-500 mt-0.5">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    {item.quantityNote && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                        {item.quantityNote}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border font-medium",
                        item.isMandatory
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}
                    >
                      {item.isMandatory ? "Required" : "Optional"}
                    </span>
                    {item.isConditional && (
                      <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        Conditional
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
