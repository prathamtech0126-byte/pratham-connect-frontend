import { cn } from "@/lib/utils";
import { Bell, Search, User, Settings, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSidebar } from "./Sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ProfileDialog } from "@/components/profile-dialog";
import { useAuth } from "@/context/auth-context";
import { useAlert } from "@/context/alert-context";
import { AlertTriangle } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";

export function Topbar() {
  const { user, logout } = useAuth();
  const { triggerAlert } = useAlert();
  
  return (
    <header className="h-20 px-6 md:px-8 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 transition-all duration-200">
      <div className="flex items-center gap-4">
        <MobileSidebar />
        
        {/* Optional: Add page title or breadcrumbs here if needed, or keeping it clean */}
        <div className="hidden md:flex items-center text-muted-foreground text-sm">
           {/* Breadcrumbs removed as they are handled in PageWrapper */}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Search Bar - hidden on mobile */}
        <div className="hidden md:flex relative w-64 mr-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                type="search" 
                placeholder="Search..." 
                className="pl-9 h-9 bg-white/50 border-border/60 focus:bg-white transition-all rounded-full text-sm" 
            />
        </div>

        <ModeToggle />

        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors w-10 h-10"
          onClick={() => triggerAlert("URGENT: All counselors and managers please report to the main office immediately. This is a mandatory briefing.")}
          title="Simulate Admin Emergency Alert"
        >
          <AlertTriangle className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full transition-colors w-10 h-10">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse" />
        </Button>

        <div className="h-8 w-px bg-border/60 hidden sm:block mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all p-0 overflow-hidden">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 mt-2 p-1 rounded-xl shadow-lg border-border/60" align="end" forceMount>
            <DropdownMenuLabel className="font-normal px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-slate-900">{user?.name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.username || 'user@example.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuGroup>
              <ProfileDialog>
                <DropdownMenuItem 
                  className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary"
                  onSelect={(e) => e.preventDefault()}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
              </ProfileDialog>
              <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuItem 
                className="text-red-600 focus:text-red-700 focus:bg-red-50 rounded-lg cursor-pointer"
                onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
