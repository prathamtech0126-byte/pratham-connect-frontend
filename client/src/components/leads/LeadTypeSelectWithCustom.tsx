import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CUSTOM_LEAD_TYPE_VALUE,
  MAX_CUSTOM_LEAD_TYPE_LENGTH,
} from "@/lib/lead-type-selection";

export type SaleTypeOption = {
  id: number;
  saleType: string;
  categoryName?: string | null;
};

type Props = {
  saleTypes: SaleTypeOption[];
  selectedLeadType: string;
  customLeadTypeName: string;
  onSelectedLeadTypeChange: (value: string) => void;
  onCustomLeadTypeNameChange: (value: string) => void;
  disabled?: boolean;
  triggerClassName?: string;
  placeholder?: string;
};

export function LeadTypeSelectWithCustom({
  saleTypes,
  selectedLeadType,
  customLeadTypeName,
  onSelectedLeadTypeChange,
  onCustomLeadTypeNameChange,
  disabled,
  triggerClassName,
  placeholder = "Select lead type",
}: Props) {
  const showCustomInput = selectedLeadType === CUSTOM_LEAD_TYPE_VALUE;

  return (
    <div className="space-y-3">
      <Select
        value={selectedLeadType}
        onValueChange={(value) => {
          onSelectedLeadTypeChange(value);
          if (value !== CUSTOM_LEAD_TYPE_VALUE) onCustomLeadTypeNameChange("");
        }}
        disabled={disabled}
      >
        <SelectTrigger className={triggerClassName ?? "w-full max-w-md"}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-64 overflow-y-auto">
          {saleTypes.map((type) => (
            <SelectItem key={type.id} value={String(type.id)}>
              {type.saleType}
              {type.categoryName ? ` (${type.categoryName})` : ""}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_LEAD_TYPE_VALUE}>Custom…</SelectItem>
        </SelectContent>
      </Select>

      {showCustomInput ? (
        <div className="space-y-1.5 max-w-md">
          <Input
            value={customLeadTypeName}
            onChange={(e) =>
              onCustomLeadTypeNameChange(e.target.value.slice(0, MAX_CUSTOM_LEAD_TYPE_LENGTH))
            }
            placeholder="Enter custom lead type name"
            maxLength={MAX_CUSTOM_LEAD_TYPE_LENGTH}
            disabled={disabled}
          />
          <p className="text-[10px] text-muted-foreground">
            {customLeadTypeName.length}/{MAX_CUSTOM_LEAD_TYPE_LENGTH} characters
          </p>
        </div>
      ) : null}
    </div>
  );
}
