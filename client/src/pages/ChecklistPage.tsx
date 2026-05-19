// client/src/pages/ChecklistPage.tsx
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, X, FileSearch, Plus } from "lucide-react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryTabs, ALL_SLUG } from "@/components/checklist/CategoryTabs";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistDrawer } from "@/components/checklist/ChecklistDrawer";
import { SearchResults } from "@/components/checklist/SearchResults";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCategories,
  useCountries,
  useChecklists,
  useSearch,
} from "@/hooks/useChecklists";

// ─── Skeletons ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-4/5" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-2/5" />
      </div>
      <div className="h-9 bg-slate-100 rounded-lg mt-auto" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center col-span-full">
      <FileSearch className="w-14 h-14 text-slate-300 mb-4" />
      <h3 className="text-base font-semibold text-slate-700">No checklists found</h3>
      <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search query</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeSlug, setActiveSlug] = useState(ALL_SLUG);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [drawerSlug, setDrawerSlug] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: countries = [] } = useCountries();
  const isSearchMode = debouncedQuery.length >= 2;

  const {
    data: checklists = [],
    isLoading: checklistsLoading,
  } = useChecklists(
    activeSlug === ALL_SLUG ? null : activeSlug,
    selectedCountry || null,
    !isSearchMode
  );

  const { data: searchResults = [], isLoading: searchLoading } = useSearch(debouncedQuery);

  // ── Debounce search query ──────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length === 0) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Reset country when category changes ───────────────────────────────────
  const handleCategorySelect = (slug: string) => {
    setActiveSlug(slug);
    setSelectedCountry("");
  };

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const countryById = useMemo(() => {
    const map: Record<string, string> = {};
    countries.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [countries]);

  const relevantCountryCodes = countries;
  const showCountryDropdown = countries.length > 0;

  // ── Clear filters ──────────────────────────────────────────────────────────
  const clearFilters = () => {
    setSelectedCountry("");
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const hasFilters = !!selectedCountry || !!searchQuery;

  // ── Country name for drawer ────────────────────────────────────────────────
  const drawerCountryName = useMemo(() => {
    if (!drawerSlug) return null;
    const checklist = checklists.find((c) => c.slug === drawerSlug);
    if (!checklist || !checklist.countryId) return null;
    return countryById[checklist.countryId] ?? null;
  }, [drawerSlug, checklists, countryById]);

  // ── Handle add checklist ───────────────────────────────────────────────────
  const handleAddChecklist = () => {
    setLocation("/add-checklist");
  };

  return (
    <PageWrapper
      title="Checklists"
      breadcrumbs={[{ label: "Checklists" }]}
    >
      <div className="space-y-6">
        {/* Search bar and Add button — always visible */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents across all checklists…"
              className="pl-9 pr-4"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setDebouncedQuery(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddChecklist}
              className="bg-[#0063cc] hover:bg-[#0052a3] text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Checklist
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {isSearchMode ? (
          /* ── Search mode ──────────────────────────────────────────────────── */
          <SearchResults
            results={searchResults}
            isLoading={searchLoading}
            onView={(slug) => setDrawerSlug(slug)}
          />
        ) : (
          /* ── Browse mode ──────────────────────────────────────────────────── */
          <>
            {/* Category tabs */}
            {catsLoading ? (
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 w-32 rounded-full bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <CategoryTabs
                categories={categories}
                activeSlug={activeSlug}
                onSelect={handleCategorySelect}
              />
            )}

            {/* Filters row */}
            {showCountryDropdown && (
              <div className="flex items-center gap-3">
                <Select
                  value={selectedCountry || "all"}
                  onValueChange={(v) => setSelectedCountry(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {relevantCountryCodes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {checklistsLoading ? (
                Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              ) : checklists.length === 0 ? (
                <EmptyState />
              ) : (
                checklists.map((checklist) => (
                  <ChecklistCard
                    key={checklist.id}
                    checklist={checklist}
                    countryName={
                      checklist.countryId ? countryById[checklist.countryId] ?? null : null
                    }
                    allTitles={checklists.map((c) => c.title)}
                    onView={(slug) => setDrawerSlug(slug)}
                    onDeleted={() => {
                      queryClient.invalidateQueries({ queryKey: ["checklists"] });
                      queryClient.invalidateQueries({ queryKey: ["checklist-categories"] });
                    }}
                    onUpdated={() => queryClient.invalidateQueries({ queryKey: ["checklists"] })}
                    onDuplicated={() => {
                      queryClient.invalidateQueries({ queryKey: ["checklists"] });
                      queryClient.invalidateQueries({ queryKey: ["checklist-categories"] });
                    }}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Drawer — rendered outside main flow so it overlays everything */}
      <ChecklistDrawer
        slug={drawerSlug}
        countryName={drawerCountryName}
        onClose={() => setDrawerSlug(null)}
      />
    </PageWrapper>
  );
}
