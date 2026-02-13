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
import { Mail, Phone, Building2, User as UserIcon, IdCard, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { clientService } from "@/services/clientService";

interface UserProfileData {
  fullname: string;
  email: string;
  empid: string | null;
  officePhone: string | null;
  personalPhone: string | null;
  designation: string;
  role: string;
  managerId: number | null;
  isSupervisor: boolean;
}

export function ProfileDialog({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setAvatar(user?.avatar);
  }, [user?.avatar]);

  // Fetch user profile when dialog opens, clear when it closes
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    } else {
      // Clear profile data when dialog closes to prevent stale data on next open
      setProfileData(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const data = await clientService.getUserProfile();
      setProfileData({
        fullname: data.fullname || user?.name || "User",
        email: data.email || user?.username || "",
        empid: data.empid || null,
        officePhone: data.officePhone || null,
        personalPhone: data.personalPhone || null,
        designation: data.designation || "",
        role: data.role || user?.role || "",
        managerId: data.managerId || null,
        isSupervisor: data.isSupervisor || false,
      });
    } catch (error: any) {
      console.error("Failed to fetch user profile:", error);

      // Show user-friendly error message based on error type
      if (error.response?.status === 404) {
        console.error("⚠️ The /api/users/me endpoint is not available on the backend.");
        console.error("   This endpoint needs to be implemented on the backend server.");
      }

      // Fallback to user data from auth context if API fails
      setProfileData({
        fullname: user?.name || "User",
        email: user?.username || "",
        empid: null,
        officePhone: null,
        personalPhone: null,
        designation: "",
        role: user?.role || "",
        managerId: null,
        isSupervisor: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        ) : profileData ? (
          <div className="grid gap-6 py-4">
            {/* Profile Image Section */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24 border-2 border-primary/10">
                <AvatarImage src={avatar} alt={profileData.fullname || "User"} />
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                  {getInitials(profileData.fullname || "User")}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{profileData.fullname || "User"}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {profileData.role === 'admin' ? 'Super Admin' : profileData.role || user?.role || ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="w-4 h-4" /> Designation
                </Label>
                <Input
                  value={profileData.designation || "Not set"}
                  readOnly
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <IdCard className="w-4 h-4" /> Employee ID
                </Label>
                <Input
                  value={profileData.empid || "Not set"}
                  readOnly
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="w-4 h-4" /> Full Name
                </Label>
                <Input
                  value={profileData.fullname || "Not set"}
                  readOnly
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" /> Email Address
                </Label>
                <Input
                  value={profileData.email || "Not set"}
                  readOnly
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" /> Company Phone
                </Label>
                <Input
                  value={profileData.officePhone || "Not set"}
                  readOnly
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /> Personal Phone
                </Label>
                <Input
                  value={profileData.personalPhone || "Not set"}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Failed to load profile</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
