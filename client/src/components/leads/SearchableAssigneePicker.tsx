import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type AssigneePickerOption = {
  id: number;
  fullName: string;
  role?: string | null;
};

export function formatAssigneeRoleLabel(role: string | null | undefined): string {
  if (!role) return "";
  const r = role.trim().toLowerCase();
  if (r === "telecaller") return "Telecaller";
  if (r === "counsellor" || r === "counselor") return "Counsellor";
  if (r === "manager") return "Manager";
  if (r === "marketing_head") return "Marketing Head";
  if (r === "director") return "Director";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function filterAssigneeOptions(options: AssigneePickerOption[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((opt) => {
    const name = opt.fullName.toLowerCase();
    const roleKey = (opt.role ?? "").toLowerCase();
    const roleLabel = formatAssigneeRoleLabel(opt.role).toLowerCase();
    return name.includes(q) || roleKey.includes(q) || roleLabel.includes(q);
  });
}

type Props = {
  options: AssigneePickerOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  showRole?: boolean;
  className?: string;
  listMaxHeight?: number;
};

/** Searchable + scrollable assignee picker (works inside dialogs). */
export function SearchableAssigneePicker({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  emptyMessage = "No matches found",
  disabled = false,
  showRole = true,
  className,
  listMaxHeight = 280,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => String(o.id) === value),
    [options, value]
  );

  const filtered = useMemo(
    () => filterAssigneeOptions(options, query),
    [options, query]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-9 px-3",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">
            {selected ? (
              <>
                {selected.fullName}
                {showRole && selected.role ? (
                  <span className="text-muted-foreground">
                    {" "}
                    ({formatAssigneeRoleLabel(selected.role)})
                  </span>
                ) : null}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[250] w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
            />
          </div>

          <div
            className="overflow-y-auto overflow-x-hidden overscroll-contain p-1"
            style={{ maxHeight: listMaxHeight }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = value === String(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      "flex w-full cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => {
                      onValueChange(String(opt.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 truncate text-left">{opt.fullName}</span>
                    {showRole && opt.role ? (
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {formatAssigneeRoleLabel(opt.role)}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
