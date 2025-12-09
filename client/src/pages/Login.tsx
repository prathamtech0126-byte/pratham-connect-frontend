import { useState } from "react";
import { useAuth, UserRole } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Lock, Shield, Users, UserCog, Briefcase } from "lucide-react";

export default function Login() {
  const { login, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("superadmin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "superadmin":
        return <Shield className="h-5 w-5 text-purple-600" />;
      case "manager":
        return <Users className="h-5 w-5 text-blue-600" />;
      case "team_lead":
        return <UserCog className="h-5 w-5 text-orange-600" />;
      case "consultant":
        return <Briefcase className="h-5 w-5 text-green-600" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 bg-[url('https://images.unsplash.com/photo-1497294815431-9365093b7331?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
      
      <Card className="w-full max-w-md relative z-10 shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            Welcome Back
          </CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Select Role (Demo Mode)</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRole)}
              >
                <SelectTrigger className="h-11">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(selectedRole)}
                    <SelectValue placeholder="Select a role" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <span>Super Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>Manager</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="team_lead">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-orange-600" />
                      <span>Team Lead</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="consultant">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-green-600" />
                      <span>Consultant</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base mt-2" 
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4 bg-gray-50/50 rounded-b-xl">
          <p className="text-xs text-gray-500 text-center">
            Secured by Pratham Consultancy System
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
