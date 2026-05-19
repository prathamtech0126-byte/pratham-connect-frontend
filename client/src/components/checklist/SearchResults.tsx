// client/src/components/checklist/SearchResults.tsx
import { FileSearch, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "@/api/checklist.api";

interface Props {
  results: SearchResult[];
  isLoading: boolean;
  onView: (slug: string) => void;
}

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between animate-pulse"
        >
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-3/4" />
          </div>
          <div className="h-8 w-16 bg-slate-100 rounded ml-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SearchResults({ results, isLoading, onView }: Props) {
  if (isLoading) return <SearchSkeleton />;

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileSearch className="w-14 h-14 text-slate-300 mb-4" />
        <h3 className="text-base font-semibold text-slate-700">No results found</h3>
        <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">
        {results.length} result{results.length !== 1 ? "s" : ""} found
      </p>
      {results.map((result) => (
        <div
          key={result.itemId}
          className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between gap-4 hover:border-indigo-200 hover:shadow-sm transition-all"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {result.itemName}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              in{" "}
              <span className="text-slate-500">{result.sectionTitle}</span>
              {" · "}
              <span className="text-indigo-600">{result.checklistTitle}</span>
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(result.checklistSlug)}
            className="flex-shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            View
          </Button>
        </div>
      ))}
    </div>
  );
}
