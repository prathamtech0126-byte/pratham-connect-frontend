import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Trash2, Plus, Filter, Search, Pencil, X, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function TeamList() {
  const { toast } = useToast();
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/users/users");
      // Use the standard data structure from previous observations
      const data = response.data.data || response.data;
      if (Array.isArray(data)) {
        setTeamMembers(data.map((u: any) => ({
          ...u,
          id: u.id,
          name: u.fullName || u.name,
          email: u.email,
          role: u.role,
          status: "Active",
          assignedTo: u.managerId ? "Assigned" : "",
          emp_id: u.empId || u.emp_id || u.empID,
          company_phone_no: u.officePhone || u.company_phone_no || u.office_phone,
          personal_phone_no: u.personalPhone || u.personal_phone_no || u.personal_phone,
          designation: u.designation
        })));
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  // Filter State
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleClearFilters = () => {
    setRoleFilter("all");
  };

  const isFilterActive = roleFilter !== "all";

  // Add/Edit Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newMember, setNewMember] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "Counsellor",
    managerId: "",
    emp_id: "",
    company_phone_no: "",
    personal_phone_no: "",
    designation: ""
  });

  // Manager fetching state
  const [managers, setManagers] = useState<any[]>([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);

  const fetchManagers = async () => {
    try {
      setIsLoadingManagers(true);
      const response = await api.get("/api/users/managers");
      // The API returns { success: true, count: 1, data: [...] }
      const managersData = response.data.data || response.data;
      setManagers(Array.isArray(managersData) ? managersData : []);
    } catch (error) {
      // Fallback to local state if API fails for demo
      const localManagers = teamMembers.filter((m: any) => m.role === "Manager");
      setManagers(localManagers);
    } finally {
      setIsLoadingManagers(false);
    }
  };

  useEffect(() => {
    if (isAddMemberOpen) {
      fetchManagers();
    }
  }, [isAddMemberOpen]);

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewMember(prev => ({ ...prev, password }));
  };

  const resetForm = () => {
    setNewMember({
      fullName: "",
      email: "",
      password: "",
      role: "Counsellor",
      managerId: "",
      emp_id: "",
      company_phone_no: "",
      personal_phone_no: "",
      designation: ""
    });
    setEditingId(null);
  };

  const handleSaveMember = async () => {
    // Validation
    if (!newMember.fullName || !newMember.email || !newMember.emp_id || !newMember.designation || (!editingId && !newMember.password)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!editingId && newMember.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        const payload = {
          ...newMember,
          email: newMember.email.toLowerCase().trim(),
          role: newMember.role.toLowerCase(),
          managerId: newMember.role.toLowerCase() === "counsellor" ? Number(newMember.managerId) : undefined
        };

        // Call the update API
        await api.put(`/api/users/users-update/${editingId}`, payload);
        
        toast({
          title: "Success",
          description: "Team member updated successfully",
        });
        
        // Refresh the list immediately
        fetchTeamMembers();
      } else {
        const payload = {
          ...newMember,
          email: newMember.email.toLowerCase().trim(),
          role: newMember.role.toLowerCase(),
          managerId: newMember.role.toLowerCase() === "counsellor" ? Number(newMember.managerId) : undefined
        };

        const response = await api.post("/api/users/register", payload);
        
        toast({
          title: "Success",
          description: "Team member registered successfully",
        });
        
        // Refresh the list immediately to show the new user
        fetchTeamMembers();
      }

      setIsAddMemberOpen(false);
      resetForm();
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to register team member";
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const openAddMember = () => {
    resetForm();
    setIsAddMemberOpen(true);
  };

  const openEditMember = (member: any) => {
    setEditingId(member.id);
    // Ensure role is mapped correctly for the Select component (capitalized)
    const displayRole = member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1).toLowerCase() : "Counsellor";
    
    setNewMember({
      fullName: member.fullName || member.name || "",
      email: member.email || "",
      password: "", // Don't show existing password
      role: displayRole,
      managerId: member.managerId?.toString() || "",
      emp_id: member.empId || member.emp_id || member.empID || "",
      company_phone_no: member.officePhone || member.company_phone_no || member.office_phone || "",
      personal_phone_no: member.personalPhone || member.personal_phone_no || member.personal_phone || "",
      designation: member.designation || ""
    });
    setIsAddMemberOpen(true);
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesRole = roleFilter === "all" || member.role.toLowerCase() === roleFilter.toLowerCase();
    const nameToSearch = member.name || member.fullName || "";
    const matchesSearch = nameToSearch.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <PageWrapper title="Team Management" breadcrumbs={[{ label: "Team" }]}>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage your organization's team members.</CardDescription>
          </div>
            <Dialog open={isAddMemberOpen} onOpenChange={(open) => {
              setIsAddMemberOpen(open);
              if (!open) resetForm();
            }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAddMember}>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Update user details." : "Create a new user account. They will receive an email to set their password."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newMember.fullName}
                    onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp_id">Employee ID</Label>
                  <Input
                    id="emp_id"
                    placeholder="EMP123"
                    value={newMember.emp_id}
                    onChange={(e) => setNewMember({ ...newMember, emp_id: e.target.value })}
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
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    placeholder="Senior Counsellor"
                    value={newMember.designation}
                    onChange={(e) => setNewMember({ ...newMember, designation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_phone_no">Office Phone</Label>
                  <Input
                    id="company_phone_no"
                    placeholder="9876543210"
                    value={newMember.company_phone_no}
                    onChange={(e) => setNewMember({ ...newMember, company_phone_no: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personal_phone_no">Personal Phone</Label>
                  <Input
                    id="personal_phone_no"
                    placeholder="9123456789"
                    value={newMember.personal_phone_no}
                    onChange={(e) => setNewMember({ ...newMember, personal_phone_no: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="password">Password {editingId && "(Leave blank to keep current)"}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      placeholder={editingId ? "New Password (Optional)" : "Min 8 characters"}
                      value={newMember.password}
                      onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                    />
                    <Button variant="outline" type="button" onClick={generatePassword}>
                      Generate
                    </Button>
                  </div>
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
                      <SelectItem value="Counsellor">Counsellor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newMember.role === "Counsellor" && (
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assign to Manager</Label>
                    <Select
                      value={newMember.managerId}
                      onValueChange={(value) => setNewMember({ ...newMember, managerId: value })}
                      disabled={isLoadingManagers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingManagers ? "Loading managers..." : "Select Manager"} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingManagers ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm">Loading...</span>
                          </div>
                        ) : managers && managers.length > 0 ? (
                          managers.map((manager: any) => (
                            <SelectItem key={manager.id} value={manager.id.toString()}>
                              {manager.fullName || manager.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-center text-muted-foreground">
                            No managers found
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveMember}>{editingId ? "Update Member" : "Create Account"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Filter by role" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="counsellor">Counsellor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isFilterActive && (
              <Button 
                variant="outline" 
                onClick={handleClearFilters}
                className="bg-white text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
              >
                Clear All
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="rounded-md border">
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
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No team members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
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
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === "Active" ? "default" : "secondary"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 mr-1 text-muted-foreground hover:text-primary"
                          onClick={() => openEditMember(member)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
