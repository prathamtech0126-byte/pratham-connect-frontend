import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  PieChart,
  UserPlus,
  Shield,
  UserCog,
  Briefcase,
  Crown,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import logoUrl from "@/assets/images/Pratham Logo.svg";
import { useAuth, UserRole } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarItem {
  icon: any;
  label: string;
  href: string;
  roles?: UserRole[];
}

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Clients", href: "/clients" },
  { 
    icon: Activity, 
    label: "Activity Log", 
    href: "/activity" 
  },
  { 
    icon: UserPlus, 
    label: "Add Client", 
    href: "/clients/new",
    roles: ['superadmin', 'director', 'manager', 'team_lead', 'counsellor'] 
  },
  { icon: PieChart, label: "Reports", href: "/reports" },
  { 
    icon: Users, 
    label: "Team", 
    href: "/team",
    roles: ['superadmin', 'director']
  },
];

import { ProfileDialog } from "@/components/profile-dialog";

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Filter items based on user role
  const filteredItems = sidebarItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  // Logic to determine the active item based on specificity (longest matching path)
  const activeItem = filteredItems.reduce(
    (best, item) => {
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
    },
    filteredItems.find((i) => i.href === "/") || filteredItems[0],
  );

  const getRoleBadge = () => {
    if (!user) return null;
    
    const colors = {
      superadmin: "bg-purple-100 text-purple-700",
      director: "bg-indigo-100 text-indigo-700",
      manager: "bg-blue-100 text-blue-700",
      team_lead: "bg-orange-100 text-orange-700",
      counsellor: "bg-green-100 text-green-700"
    };

    const labels = {
      superadmin: "Super Admin",
      director: "Director",
      manager: "Manager",
      team_lead: "Team Lead",
      counsellor: "Counsellor"
    };

    return (
      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider", colors[user.role])}>
        {labels[user.role]}
      </span>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        className,
      )}
    >
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
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              activeItem?.href === item.href
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border/50 space-y-4">
        {user && (
          <ProfileDialog>
            <div className="flex items-center gap-3 px-2 cursor-pointer hover:bg-sidebar-accent/50 p-2 rounded-md transition-colors group">
              <Avatar className="h-9 w-9 border border-border group-hover:border-primary/50 transition-colors">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{user.name}</span>
                {getRoleBadge()}
              </div>
            </div>
          </ProfileDialog>
        )}
        
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-red-600 hover:bg-red-50"
        >
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
      <SheetContent
        side="left"
        className="p-0 w-72 bg-sidebar border-r-sidebar-border text-sidebar-foreground"
      >
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
