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
  Activity,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Archive,
  Trophy,
  List,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import lightLogoUrl from "@/assets/images/pratham-logo-light-mode.svg";
import darkLogoUrl from "@/assets/images/pratham-logo-dark-mode.svg";
import { useAuth, UserRole } from "@/context/auth-context";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileDialog } from "@/components/profile-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import { Loader2 } from "lucide-react";

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
    href: "/activity",
  },
  {
    icon: Megaphone,
    label: "Messages",
    href: "/messages",
  },
  // { icon: PieChart, label: "Reports", href: "/reports" },
  {
    icon: Users,
    label: "Team",
    href: "/team",
    roles: ["superadmin", "director"],
  },
  {
    icon: Trophy,
    label: "Counsellor Leaderboard",
    href: "/counsellor-leaderboard",
    roles: ["superadmin", "manager"],
  },
  {
    icon: FileText,
    label: "Additional Info",
    href: "/additional-info",
    roles: ["superadmin", "director"],
  },
  {
    icon: FileSpreadsheet,
    label: "University List",
    href: "/university-db",
    roles: ["superadmin", "manager", "counsellor"],
  },
];

export function Sidebar({ className, isCollapsed }: { className?: string; isCollapsed?: boolean }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [isClientsOpen, setIsClientsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Determine if we're in dark mode and listen for system theme changes
  useEffect(() => {
    const updateDarkMode = () => {
      if (theme === "dark") {
        setIsDarkMode(true);
      } else if (theme === "light") {
        setIsDarkMode(false);
      } else {
        // System theme - check current preference
        setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    };

    updateDarkMode();

    // Listen for system theme changes if theme is "system"
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => updateDarkMode();
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }
  }, [theme]);

  // Select logo based on theme
  const currentLogo = isDarkMode ? darkLogoUrl : lightLogoUrl;

  const { data: clients } = useQuery({
    queryKey: ["sidebar-clients"],
    queryFn: clientService.getClients,
  });

  // Fetch real user profile data
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: clientService.getUserProfile,
    retry: 1,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Filter items based on user role
  const filteredItems = sidebarItems.filter((item) => {
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

  // Auto-expand clients if we are on a client page
  useEffect(() => {
    if (location.startsWith("/clients")) {
      setIsClientsOpen(true);
    }
  }, [location]);

  const getRoleBadge = () => {
    if (!user) return null;

    const colors = {
      superadmin: "bg-purple-50 text-purple-700 border-purple-200",
      director: "bg-indigo-50 text-indigo-700 border-indigo-200",
      manager: "bg-blue-50 text-blue-700 border-blue-200",
      team_lead: "bg-orange-50 text-orange-700 border-orange-200",
      counsellor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };

    const labels = {
      superadmin: "Super Admin",
      director: "Director",
      manager: "Manager",
      team_lead: "Team Lead",
      counsellor: "Counsellor",
    };

    return (
      <span
        className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border",
          colors[user.role],
        )}
      >
        {labels[user.role]}
      </span>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300",
        className,
      )}
    >
      <div className={cn(
        "h-20 flex items-center justify-center border-b border-sidebar-border/60 transition-all duration-300",
        isCollapsed ? "px-2" : "px-6"
      )}>
        {isCollapsed ? (
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">P</span>
          </div>
        ) : (
          <img
            src={currentLogo}
            alt="Consultancy Logo"
            className="h-12 w-auto object-contain transition-all hover:scale-105"
          />
        )}
      </div>

      <div className={cn(
        "flex-1 py-8 space-y-1.5 overflow-y-auto custom-scrollbar transition-all duration-300",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {!isCollapsed && (
          <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Menu
          </div>
        )}
        {filteredItems.map((item) => {
          const isActive = activeItem?.href === item.href;

          if (item.label === "Clients") {
            return (
              <Collapsible
                key={item.href}
                open={isClientsOpen}
                onOpenChange={setIsClientsOpen}
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <div
                      className={cn(
                        "flex flex-1 items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative cursor-pointer select-none",
                        isCollapsed ? "px-2 justify-center" : "px-3",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "transition-transform group-hover:scale-110 shrink-0",
                          isCollapsed ? "w-5 h-5" : "w-5 h-5",
                          isActive
                            ? "text-sidebar-primary-foreground"
                            : "text-muted-foreground group-hover:text-sidebar-primary",
                        )}
                      />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {isClientsOpen ? (
                            <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                          )}
                        </>
                      )}

                      {isActive && !isClientsOpen && !isCollapsed && (
                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/50" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                </div>

                {!isCollapsed && (
                  <CollapsibleContent className="pl-4 space-y-1 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <Link
                      href="/clients"
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-2",
                        location === "/clients"
                          ? "border-primary text-primary font-medium bg-primary/5"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
                      )}
                    >
                      <List className="w-4 h-4" />
                      <span className="truncate">All Clients</span>
                    </Link>
                    {user && ["superadmin", "manager", "counsellor"].includes(user.role) && (
                      <Link
                        href="/clients/new"
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-2",
                          location === "/clients/new"
                            ? "border-primary text-primary font-medium bg-primary/5"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
                        )}
                      >
                        <UserPlus className="w-4 h-4" />
                        <span className="truncate">Add Client</span>
                      </Link>
                    )}
                    <Link
                      href="/clients/archive"
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-2",
                        location === "/clients/archive"
                          ? "border-primary text-primary font-medium bg-primary/5"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
                      )}
                    >
                      <Archive className="w-4 h-4" />
                      <span className="truncate">Archive</span>
                    </Link>
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                isCollapsed ? "px-2 justify-center" : "px-3",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "transition-transform group-hover:scale-110 shrink-0",
                  isCollapsed ? "w-5 h-5" : "w-5 h-5",
                  isActive
                    ? "text-sidebar-primary-foreground"
                    : "text-muted-foreground group-hover:text-sidebar-primary",
                )}
              />
              {!isCollapsed && (
                <>
                  {item.label}
                  {isActive && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/50" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>

      <div className={cn(
        "border-t border-sidebar-border/60 space-y-2 bg-sidebar-accent/10 transition-all duration-300",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {user && (
          <ProfileDialog>
            <div className={cn(
              "flex items-center cursor-pointer hover:bg-sidebar-accent hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-sidebar-border group",
              isCollapsed ? "px-2 py-2 justify-center" : "px-3 py-3 gap-3"
            )}>
              {isLoadingProfile ? (
                  <div className={cn(
                    "flex items-center w-full",
                    isCollapsed ? "justify-center" : "gap-3"
                  )}>
                    <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  {!isCollapsed && (
                    <div className="flex flex-col overflow-hidden flex-1">
                      <div className="h-4 w-24 bg-sidebar-accent rounded animate-pulse mb-2" />
                      <div className="h-3 w-16 bg-sidebar-accent rounded animate-pulse" />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Avatar className="h-10 w-10 border-2 border-sidebar-border shadow-sm group-hover:border-primary/20 transition-colors shrink-0">
                    <AvatarImage src={user.avatar} alt={userProfile?.fullname || user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {userProfile?.fullname
                        ? (userProfile.fullname.split(' ').length >= 2
                            ? (userProfile.fullname.split(' ')[0].charAt(0) + userProfile.fullname.split(' ')[userProfile.fullname.split(' ').length - 1].charAt(0)).toUpperCase()
                            : userProfile.fullname.charAt(0).toUpperCase())
                        : user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                        {userProfile?.fullname || user.name}
                      </span>
                      <div className="mt-1">{getRoleBadge()}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ProfileDialog>
        )}

        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            "w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all duration-200",
            isCollapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className={cn("shrink-0", isCollapsed ? "w-4 h-4" : "w-4 h-4 mr-2")} />
          {!isCollapsed && "Sign Out"}
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
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-72 bg-sidebar border-r-sidebar-border text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
