import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  PieChart,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import logoUrl from "@/assets/images/Pratham-international-logo.svg";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Clients", href: "/students" },
  { icon: UserPlus, label: "Add Client", href: "/students/new" },
  { icon: PieChart, label: "Reports", href: "/reports" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();

  // Logic to determine the active item based on specificity (longest matching path)
  const activeItem = sidebarItems.reduce((best, item) => {
    // If exact match, return this item (highest priority)
    if (location === item.href) return item;
    
    // Check if it's a prefix match
    if (location.startsWith(item.href)) {
      // Special case: Root "/" only matches if location is exactly "/"
      if (item.href === "/" && location !== "/") return best;

      // If we don't have a best match yet, or this one is more specific (longer)
      if (!best || item.href.length > best.href.length) {
        return item;
      }
    }
    return best;
  }, sidebarItems.find(i => i.href === "/") || sidebarItems[0]);

  return (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border", className)}>
      <div className="p-6 border-b border-sidebar-border/50 bg-white">
        <div className="flex items-center justify-center">
          <img 
            src={logoUrl} 
            alt="Consultancy Logo" 
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1">
        {sidebarItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              activeItem?.href === item.href
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border/50">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r-sidebar-border text-sidebar-foreground">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
