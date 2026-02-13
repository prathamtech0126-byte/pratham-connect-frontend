import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isCollapsed = !isSidebarHovered;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div
        className={cn(
          "hidden md:block shrink-0 h-full border-r border-sidebar-border bg-sidebar shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-72"
        )}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <Sidebar isCollapsed={isCollapsed} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background relative">
        <Topbar />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500 slide-in-from-bottom-4">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
