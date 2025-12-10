import { PageWrapper } from "@/layout/PageWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";
import { useState } from "react";
import { Trash2, Plus, Save, Bell, Moon, Sun, Monitor, User } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  
  // Profile State
  const [profile, setProfile] = useState({
    name: user?.username || "Super Admin",
    email: "admin@pratham.com",
    role: "Super Admin"
  });

  // Team State
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Sarah Manager", email: "sarah@pratham.com", role: "Manager", status: "Active", avatar: "" },
    { id: 2, name: "Tom Lead", email: "tom@pratham.com", role: "Team Lead", status: "Active", avatar: "" },
    { id: 3, name: "Dr. Counsellor", email: "doc@pratham.com", role: "Counsellor", status: "Away", avatar: "" },
    { id: 4, name: "Priya Singh", email: "priya@pratham.com", role: "Counsellor", status: "Active", avatar: "" },
  ]);

  // System State
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    marketing: false
  });
  const [theme, setTheme] = useState("system");

  // Dropdowns State
  const [salesTypes, setSalesTypes] = useState([
    { id: 1, label: "Canada Student", value: "canada_student" },
    { id: 2, label: "UK Student", value: "uk_student" },
    { id: 3, label: "USA Visitor", value: "usa_visitor" },
    { id: 4, label: "Spouse Visa", value: "spouse_visa" },
    { id: 5, label: "Australia PR", value: "australia_pr" },
  ]);
  const [newSalesType, setNewSalesType] = useState("");

  const handleAddSalesType = () => {
    if (newSalesType.trim()) {
      setSalesTypes([...salesTypes, { 
        id: Date.now(), 
        label: newSalesType, 
        value: newSalesType.toLowerCase().replace(/ /g, '_') 
      }]);
      setNewSalesType("");
    }
  };

  const handleDeleteSalesType = (id: number) => {
    setSalesTypes(salesTypes.filter(type => type.id !== id));
  };

  return (
    <PageWrapper title="Settings" breadcrumbs={[{ label: "Settings" }]}>
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="dropdowns">Dropdowns</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">Change Avatar</Button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={profile.name} 
                    onChange={(e) => setProfile({...profile, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    value={profile.email} 
                    onChange={(e) => setProfile({...profile, email: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={profile.role} disabled className="bg-muted" />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Role management is handled by system administrators.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Team Management */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage your team members and their permissions.</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-xs">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{member.name}</span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === "Active" ? "default" : "secondary"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Preferences */}
        <TabsContent value="system">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure how you receive alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive daily summaries and critical alerts.</p>
                  </div>
                  <Switch 
                    checked={notifications.email} 
                    onCheckedChange={(c) => setNotifications({...notifications, email: c})} 
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive real-time updates in the browser.</p>
                  </div>
                  <Switch 
                    checked={notifications.push} 
                    onCheckedChange={(c) => setNotifications({...notifications, push: c})} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the interface look and feel.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${theme === 'light' ? 'border-primary' : 'border-muted'}`}
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Light</span>
                  </div>
                  <div 
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${theme === 'dark' ? 'border-primary' : 'border-muted'}`}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Dark</span>
                  </div>
                  <div 
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${theme === 'system' ? 'border-primary' : 'border-muted'}`}
                    onClick={() => setTheme('system')}
                  >
                    <Monitor className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">System</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dropdown Management */}
        <TabsContent value="dropdowns">
          <Card>
            <CardHeader>
              <CardTitle>Sales Types</CardTitle>
              <CardDescription>Manage the options available in the Sales Type dropdown.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="Add new sales type (e.g., Business Visa)" 
                  value={newSalesType}
                  onChange={(e) => setNewSalesType(e.target.value)}
                />
                <Button onClick={handleAddSalesType}>Add</Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Value Key</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.label}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{type.value}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteSalesType(type.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
