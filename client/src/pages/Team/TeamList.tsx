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
import { useState } from "react";
import { Trash2, Plus, Filter, Search, Pencil, X } from "lucide-react";

export default function TeamList() {
  const { toast } = useToast();
  
  // Team State
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Sarah Manager", email: "sarah@pratham.com", role: "Manager", status: "Active", avatar: "", assignedTo: "", password: "" },
    { id: 2, name: "Tom Lead", email: "tom@pratham.com", role: "Team Lead", status: "Active", avatar: "", assignedTo: "Sarah Manager", password: "" },
    { id: 3, name: "Dr. Counsellor", email: "doc@pratham.com", role: "Counsellor", status: "Away", avatar: "", assignedTo: "Tom Lead", password: "" },
    { id: 4, name: "Priya Singh", email: "priya@pratham.com", role: "Counsellor", status: "Active", avatar: "", assignedTo: "Tom Lead", password: "" },
    { id: 5, name: "Amit Director", email: "amit@pratham.com", role: "Director", status: "Active", avatar: "", assignedTo: "", password: "" },
  ]);

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
    name: "",
    email: "",
    password: "",
    role: "Counsellor",
    assignedTo: ""
  });

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewMember(prev => ({ ...prev, password }));
  };

  const handleSaveMember = () => {
    if (!newMember.name || !newMember.email || (!editingId && !newMember.password)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      setTeamMembers(teamMembers.map(member => 
        member.id === editingId 
          ? { ...member, ...newMember, password: newMember.password || member.password } // Keep old password if not changed
          : member
      ));
      toast({
        title: "Success",
        description: "Team member updated successfully",
      });
    } else {
      const member = {
        id: Date.now(),
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        status: "Active",
        avatar: "",
        assignedTo: newMember.assignedTo,
        password: newMember.password
      };
      setTeamMembers([...teamMembers, member]);
      toast({
        title: "Success",
        description: "Team member added successfully",
      });
    }

    setIsAddMemberOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewMember({ name: "", email: "", password: "", role: "Counsellor", assignedTo: "" });
    setEditingId(null);
  };

  const openAddMember = () => {
    resetForm();
    setIsAddMemberOpen(true);
  };

  const openEditMember = (member: any) => {
    setEditingId(member.id);
    setNewMember({
      name: member.name,
      email: member.email,
      password: "", // Don't show existing password
      role: member.role,
      assignedTo: member.assignedTo || ""
    });
    setIsAddMemberOpen(true);
  };

  const assignableManagers = teamMembers.filter(m => m.role === "Manager");
  const assignableTeamLeads = teamMembers.filter(m => m.role === "Team Lead");

  const filteredMembers = teamMembers.filter(member => {
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
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
                  <Label htmlFor="password">Password {editingId && "(Leave blank to keep current)"}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      placeholder={editingId ? "New Password (Optional)" : "Password"}
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
                      <SelectItem value="Director">Director</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Team Lead">Team Lead</SelectItem>
                      <SelectItem value="Counsellor">Counsellor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newMember.role === "Team Lead" && (
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assign to Manager</Label>
                    <Select
                      value={newMember.assignedTo}
                      onValueChange={(value) => setNewMember({ ...newMember, assignedTo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableManagers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.name}>
                            {manager.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {newMember.role === "Counsellor" && (
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assign to Team Lead</Label>
                    <Select
                      value={newMember.assignedTo}
                      onValueChange={(value) => setNewMember({ ...newMember, assignedTo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Team Lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableTeamLeads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.name}>
                            {lead.name}
                          </SelectItem>
                        ))}
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
                  <SelectItem value="Director">Director</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Team Lead">Team Lead</SelectItem>
                  <SelectItem value="Counsellor">Counsellor</SelectItem>
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
