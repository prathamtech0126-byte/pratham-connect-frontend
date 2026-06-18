import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface SectionTabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface SectionTabsProps {
  items: SectionTabItem[];
  defaultValue?: string;
}

export function SectionTabs({ items, defaultValue }: SectionTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue || items[0].value);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
      {/* Mobile: dropdown */}
      <div className="md:hidden w-full">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger>
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: underline tab bar */}
      <div className="hidden md:block border-b border-border">
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0 overflow-x-auto">
          {items.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className={[
                "relative rounded-none border-b-2 px-5 py-3 text-sm font-medium transition-colors",
                "border-transparent text-muted-foreground",
                "hover:text-foreground hover:bg-accent/40",
                "data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                "focus-visible:ring-0 focus-visible:outline-none",
              ].join(" ")}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {items.map((item) => (
        <TabsContent key={item.value} value={item.value} className="mt-0 focus-visible:ring-0">
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
