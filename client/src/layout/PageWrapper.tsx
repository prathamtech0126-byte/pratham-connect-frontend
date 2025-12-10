import { cn } from "@/lib/utils";
import { useLayout } from "./LayoutContext";
import { useEffect } from "react";

interface PageWrapperProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ title, breadcrumbs, actions, children, className }: PageWrapperProps) {
  const { setTitle, setBreadcrumbs, setActions } = useLayout();

  useEffect(() => {
    setTitle(title);
    setBreadcrumbs(breadcrumbs || []);
    setActions(actions || null);
    
    // Cleanup function to clear title/breadcrumbs when component unmounts
    // This prevents stale titles if the next page doesn't use PageWrapper immediately
    return () => {
      // We might not want to clear immediately to avoid flickering, 
      // but for now let's leave it or the next page will overwrite it.
      // If we clear, the topbar might blink empty.
      // Let's rely on the next page overwriting it.
    };
  }, [title, breadcrumbs, actions, setTitle, setBreadcrumbs, setActions]);

  return (
    <div className={cn("space-y-6 animate-in fade-in-50 duration-500", className)}>
      <div className="hidden md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5 hidden">
           {/* Title and breadcrumbs are now in Topbar */}
        </div>
        {/* Actions are now in Topbar */}
      </div>
      
      <div className="min-h-[calc(100vh-200px)]">
        {children}
      </div>
    </div>
  );
}
