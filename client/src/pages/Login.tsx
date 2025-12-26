import { useState } from "react";
import { useAuth, UserRole } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Users, Briefcase, Crown, ArrowRight, CheckCircle2 } from "lucide-react";
import logoUrl from "@/assets/images/Pratham Logo.svg";
import { ModeToggle } from "@/components/mode-toggle";

import api from "@/lib/api";

import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { toast } = useToast();
  const { login, isLoading: authLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("superadmin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username || !password) {
      setErrorMessage("Please enter both username and password");
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log("Attempting login to:", `https://cradle-playback-strengths-assumption.trycloudflare.com/api/users/login`);
      const response = await api.post("/api/users/login", {
        email: username,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("API Response:", response.data);

      const { accessToken, role } = response.data;
      
      if (!accessToken) {
        throw new Error("No access token received from server");
      }

      localStorage.setItem("accessToken", accessToken);
      const mappedRole = (role === "admin" ? "superadmin" : role) as UserRole;
      login(mappedRole);
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${mappedRole}!`,
      });
    } catch (error: any) {
      console.error("Full Login Error:", error);
      
      // If the backend returns a specific error message for empty fields or invalid credentials,
      // it will be captured here and displayed under the password field.
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || "Could not connect to the server";
      setErrorMessage(msg);
      
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="min-h-screen w-full flex bg-background transition-colors duration-300">
        <div className="absolute top-4 right-4 z-50">
            <ModeToggle />
        </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-slate-950 relative overflow-hidden items-center justify-center p-12 border-r border-border/10">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497294815431-9365093b7331?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-primary/20" />
        
        <div className="relative z-10 max-w-lg text-white space-y-8">
            <div className="h-20 w-auto bg-white/10 backdrop-blur-md p-4 rounded-xl inline-block mb-4 border border-white/10 shadow-xl">
                <img src={logoUrl} alt="Logo" className="h-full w-auto brightness-0 invert" />
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight leading-tight text-white drop-shadow-sm">
                Professional Consultancy Management
            </h1>
            
            <p className="text-xl text-slate-300 leading-relaxed">
                Streamline your operations, manage clients efficiently, and track performance with our comprehensive admin solution.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="flex items-start gap-3 group">
                    <div className="mt-1 p-1 bg-primary/20 rounded-full group-hover:bg-primary/30 transition-colors">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Client Tracking</h3>
                        <p className="text-sm text-slate-400 mt-1">Full lifecycle management</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 group">
                    <div className="mt-1 p-1 bg-primary/20 rounded-full group-hover:bg-primary/30 transition-colors">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Financial Reports</h3>
                        <p className="text-sm text-slate-400 mt-1">Real-time revenue insights</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 group">
                    <div className="mt-1 p-1 bg-primary/20 rounded-full group-hover:bg-primary/30 transition-colors">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Team Performance</h3>
                        <p className="text-sm text-slate-400 mt-1">Monitor productivity</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 group">
                    <div className="mt-1 p-1 bg-primary/20 rounded-full group-hover:bg-primary/30 transition-colors">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Secure Access</h3>
                        <p className="text-sm text-slate-400 mt-1">Role-based permissions</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative">
        <div className="w-full max-w-[420px] space-y-8">
            <div className="text-center lg:text-left space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
                <p className="text-muted-foreground">Please sign in to your account to continue.</p>
            </div>

            <Card className="border border-border/50 shadow-2xl shadow-primary/5 bg-card/50 backdrop-blur-sm">
                <CardContent className="pt-8 pb-8 px-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-foreground font-medium">Select Role (Demo)</Label>
                            <Select
                                value={selectedRole}
                                onValueChange={(value) => setSelectedRole(value as UserRole)}
                            >
                                <SelectTrigger className="h-12 bg-background border-input focus:ring-primary/20 focus:border-primary text-foreground">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="superadmin" className="focus:bg-primary/10">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-primary" />
                                            <span>Super Admin</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="director" className="focus:bg-primary/10">
                                        <div className="flex items-center gap-2">
                                            <Crown className="h-4 w-4 text-primary" />
                                            <span>Director</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="manager" className="focus:bg-primary/10">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-primary" />
                                            <span>Manager</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="counsellor" className="focus:bg-primary/10">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 text-primary" />
                                            <span>Counsellor</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-foreground font-medium">Username</Label>
                            <Input
                                id="username"
                                placeholder="name@company.com"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="h-12 bg-background border-input focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                                <a href="#" className="text-xs font-medium text-primary hover:text-primary/80">Forgot password?</a>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`h-12 bg-background border-input focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground ${errorMessage ? 'border-destructive' : ''}`}
                            />
                            {errorMessage && (
                                <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in slide-in-from-top-1">
                                    {errorMessage}
                                </p>
                            )}
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" 
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                            {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Pratham Consultancy. All rights reserved.
            </p>
        </div>
      </div>
    </div>
  );
}
