// client/src/components/checklist/CategoryTabs.tsx
import { cn } from "@/lib/utils";
import type { Category } from "@/api/checklist.api";

interface Props {
  categories: Category[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}

export function CategoryTabs({ categories, activeSlug, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => onSelect(cat.slug)}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
            activeSlug === cat.slug
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
          )}
        >
          {cat.name}
          <span
            className={cn(
              "text-xs rounded-full px-2 py-0.5 font-bold",
              activeSlug === cat.slug
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {cat.checklistCount}
          </span>
        </button>
      ))}
    </div>
  );
}
