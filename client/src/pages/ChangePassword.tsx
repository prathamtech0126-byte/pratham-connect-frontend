import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ChangePassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Client-side validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setErrors({ general: "Please fill in all fields" });
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword.length < 8) {
      setErrors({ newPassword: "New password must be at least 8 characters" });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setErrors({ newPassword: "New password must be different from current password" });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.put("/api/users/change-password", {
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: response.data.message || "Password changed successfully",
        });
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setErrors({});
        // Optionally redirect back to dashboard
        setTimeout(() => setLocation("/"), 1500);
      }
    } catch (error: any) {
      console.error("Password change error:", error);
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || "Failed to change password. Please try again.";

      // Parse backend errors and map to field names
      const backendErrors: typeof errors = {};

      if (errorData) {
        // Check for field-specific errors
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorData.errors.forEach((err: any) => {
            const fieldName = err.field || err.path || err.param;
            if (fieldName === "oldPassword" || fieldName === "currentPassword") {
              backendErrors.currentPassword = err.message || errorMessage;
            } else if (fieldName === "newPassword") {
              backendErrors.newPassword = err.message || errorMessage;
            }
          });
        }

        // Check if error message mentions specific fields
        const messageLower = errorMessage.toLowerCase();
        if (messageLower.includes("current password") || messageLower.includes("old password") || messageLower.includes("incorrect password")) {
          backendErrors.currentPassword = errorMessage;
        } else if (messageLower.includes("new password")) {
          backendErrors.newPassword = errorMessage;
        } else {
          // General error - show on current password field or as general error
          backendErrors.currentPassword = errorMessage;
        }
      } else {
        backendErrors.general = errorMessage;
      }

      setErrors(backendErrors);

      // Also show toast for user feedback
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <PageWrapper title="Change Password" breadcrumbs={[{ label: "Change Password" }]}>
      <div className="max-w-2xl">
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              Change Your Password
            </CardTitle>
            <CardDescription>
              Keep your account secure by regularly updating your password
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current" className={cn("text-base font-medium", errors.currentPassword && "text-destructive")}>
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="current"
                    type={showPasswords.current ? "text" : "password"}
                    placeholder="Enter your current password"
                    value={formData.currentPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, currentPassword: e.target.value });
                      if (errors.currentPassword) {
                        setErrors({ ...errors, currentPassword: undefined });
                      }
                    }}
                    className={cn("pr-10", errors.currentPassword && "border-destructive focus-visible:ring-destructive")}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("current")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-xs font-medium text-destructive">{errors.currentPassword}</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border/40 pt-6" />

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new" className={cn("text-base font-medium", errors.newPassword && "text-destructive")}>
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new"
                    type={showPasswords.new ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={formData.newPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, newPassword: e.target.value });
                      if (errors.newPassword) {
                        setErrors({ ...errors, newPassword: undefined });
                      }
                    }}
                    className={cn("pr-10", errors.newPassword && "border-destructive focus-visible:ring-destructive")}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("new")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.newPassword ? (
                  <p className="text-xs font-medium text-destructive">{errors.newPassword}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    • At least 8 characters required
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm" className={cn("text-base font-medium", errors.confirmPassword && "text-destructive")}>
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showPasswords.confirm ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: undefined });
                      }
                    }}
                    className={cn("pr-10", errors.confirmPassword && "border-destructive focus-visible:ring-destructive")}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("confirm")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs font-medium text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-6 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card className="border-none shadow-card mt-6 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-base">Security Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>• Use a combination of uppercase, lowercase, numbers, and symbols</p>
            <p>• Avoid using personal information like names or dates</p>
            <p>• Change your password regularly for better security</p>
            <p>• Never share your password with anyone</p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
