import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
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

      <TabsList className="hidden md:inline-flex w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto">
        {items.map((item) => (
          <TabsTrigger 
            key={item.value} 
            value={item.value}
            className="px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {items.map((item) => (
        <TabsContent key={item.value} value={item.value} className="mt-0 focus-visible:ring-0">
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
