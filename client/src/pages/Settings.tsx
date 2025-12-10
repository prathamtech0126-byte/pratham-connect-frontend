import { PageWrapper } from "@/layout/PageWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Trash2, Plus, Camera, Moon, Sun, Monitor, User, MapPin, Phone, Mail, Hash, Briefcase } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Profile State
  const [profile, setProfile] = useState({
    name: "Super Admin",
    email: "superadmin@pratham.com",
    role: "Super Admin",
    designation: "Senior System Administrator",
    employeeId: "EMP-2024-001",
    officeLocation: "Mumbai Head Office",
    companyPhone: "+91 22 1234 5678",
    personalPhone: "+91 98765 43210",
    username: "Superadmin"
  });

  // Team State
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Sarah Manager", email: "sarah@pratham.com", role: "Manager", status: "Active", avatar: "" },
    { id: 2, name: "Tom Lead", email: "tom@pratham.com", role: "Team Lead", status: "Active", avatar: "" },
    { id: 3, name: "Dr. Counsellor", email: "doc@pratham.com", role: "Counsellor", status: "Away", avatar: "" },
    { id: 4, name: "Priya Singh", email: "priya@pratham.com", role: "Counsellor", status: "Active", avatar: "" },
  ]);

  // Add Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "Counsellor"
  });

  const handleAddMember = () => {
    if (!newMember.name || !newMember.email) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const member = {
      id: Date.now(),
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      status: "Active",
      avatar: ""
    };

    setTeamMembers([...teamMembers, member]);
    setIsAddMemberOpen(false);
    setNewMember({ name: "", email: "", role: "Counsellor" });
    toast({
      title: "Success",
      description: "Team member added successfully",
    });
  };

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
          <Card className="border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle>User Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Header Section with Avatar */}
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                      {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 flex w-full justify-center gap-2">
                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-md">
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-md">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  <p className="text-sm text-muted-foreground">{profile.username}</p>
                </div>
              </div>

              {/* Fields Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    Designation
                  </Label>
                  <Input 
                    value={profile.designation} 
                    readOnly 
                    className="bg-muted/50 border-none shadow-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    Employee ID
                  </Label>
                  <Input 
                    value={profile.employeeId} 
                    readOnly 
                    className="bg-muted/50 border-none shadow-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input 
                    value={profile.name} 
                    readOnly 
                    className="bg-muted/50 border-none shadow-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input 
                    value={profile.email} 
                    readOnly 
                    className="bg-muted/50 border-none shadow-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Office Location
                  </Label>
                  <Input 
                    value={profile.officeLocation} 
                    readOnly 
                    className="bg-muted/50 border-none shadow-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    Company Phone
                  </Label>
                  <Input 
                    value={profile.companyPhone} 
                    readOnly 
                    className="bg-muted/50 border-none shadow-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Personal Phone
                  </Label>
                  <Input 
                    value={profile.personalPhone} 
                    readOnly 
                    className="bg-muted/50 border-none shadow-sm" 
                  />
                </div>
              </div>
            </CardContent>
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
              <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Create a new user account. They will receive an email to set their password.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={newMember.name}
                        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@pratham.com"
                        value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={newMember.role}
                        onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Team Lead">Team Lead</SelectItem>
                          <SelectItem value="Counsellor">Counsellor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddMember}>Create Account</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
