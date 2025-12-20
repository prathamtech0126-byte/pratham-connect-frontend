import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import { Mail, MapPin, Phone, Building2, User as UserIcon, IdCard } from "lucide-react";
import { useState, useEffect } from "react";

export function ProfileDialog({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar);

  useEffect(() => {
    setAvatar(user?.avatar);
  }, [user?.avatar]);

  // Mock data extended from user
  const profileData = {
    designation: user?.role === 'superadmin' ? 'Senior System Administrator' : 
                 user?.role === 'manager' ? 'Regional Manager' : 'Staff Member',
    empId: "EMP-2024-001",
    name: user?.name || "User",
    email: `${user?.username || 'user'}@pratham.com`,
    location: "Mumbai Head Office",
    companyPhone: "+91 22 1234 5678",
    personalPhone: "+91 98765 43210"
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24 border-2 border-primary/10">
              <AvatarImage src={avatar} alt={profileData.name} />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">{getInitials(profileData.name)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{profileData.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <UserIcon className="w-4 h-4" /> Designation
              </Label>
              <Input value={profileData.designation} readOnly className="bg-muted/50" />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <IdCard className="w-4 h-4" /> Employee ID
              </Label>
              <Input value={profileData.empId} readOnly className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <UserIcon className="w-4 h-4" /> Full Name
              </Label>
              <Input value={profileData.name} readOnly className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" /> Email Address
              </Label>
              <Input value={profileData.email} readOnly className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" /> Office Location
              </Label>
              <Input value={profileData.location} readOnly className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" /> Company Phone
              </Label>
              <Input value={profileData.companyPhone} readOnly className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" /> Personal Phone
              </Label>
              <Input value={profileData.personalPhone} readOnly className="bg-muted/50" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
