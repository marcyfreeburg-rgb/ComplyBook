import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Edit2, Mail, Phone, MapPin, DollarSign, Calendar, CreditCard, Badge, Crown } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Employee, Organization, Team } from "@shared/schema";

interface EmployeesProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Employees({ currentOrganization, userId }: EmployeesProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [formData, setFormData] = useState({
    employeeNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    employmentType: "full_time" as "full_time" | "part_time" | "contractor",
    payType: "salary" as "salary" | "hourly",
    payRate: "",
    paySchedule: "biweekly" as "weekly" | "biweekly" | "semimonthly" | "monthly",
    hireDate: "",
    terminationDate: "",
    bankAccountNumber: "",
    bankRoutingNumber: "",
    notes: "",
    isActive: 1,
    teamId: null as number | null,
    isTeamLeader: 0,
  });

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: [`/api/employees/${currentOrganization.id}`],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: [`/api/teams/${currentOrganization.id}`],
  });

  // Team management state
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState({
    name: "",
    description: "",
  });

  const resetTeamForm = () => {
    setTeamFormData({ name: "", description: "" });
  };

  const createTeamMutation = useMutation({
    mutationFn: async () => {
      if (!teamFormData.name.trim()) {
        throw new Error("Team name is required");
      }
      return await apiRequest('POST', '/api/teams', {
        organizationId: currentOrganization.id,
        ...teamFormData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${currentOrganization.id}`] });
      toast({
        title: "Team created",
        description: `${teamFormData.name} has been created successfully.`,
      });
      setIsCreateTeamDialogOpen(false);
      resetTeamForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create team. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async () => {
      if (!editingTeam) return;
      return await apiRequest('PATCH', `/api/teams/${editingTeam.id}`, teamFormData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${currentOrganization.id}`] });
      toast({
        title: "Team updated",
        description: `Team has been updated successfully.`,
      });
      setIsEditTeamDialogOpen(false);
      setEditingTeam(null);
      resetTeamForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      return await apiRequest('DELETE', `/api/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${currentOrganization.id}`] });
      toast({
        title: "Team deleted",
        description: "Team has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamFormData({
      name: team.name,
      description: team.description || "",
    });
    setIsEditTeamDialogOpen(true);
  };

  const getTeamMemberCount = (teamId: number) => {
    return employees.filter(e => e.teamId === teamId).length;
  };

  const getTeamLeader = (teamId: number) => {
    const leader = employees.find(e => e.teamId === teamId && e.isTeamLeader === 1);
    return leader ? `${leader.firstName} ${leader.lastName}` : null;
  };

  const resetForm = () => {
    setFormData({
      employeeNumber: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      employmentType: "full_time",
      payType: "salary",
      payRate: "",
      paySchedule: "biweekly",
      hireDate: "",
      terminationDate: "",
      bankAccountNumber: "",
      bankRoutingNumber: "",
      notes: "",
      isActive: 1,
      teamId: null,
      isTeamLeader: 0,
    });
  };

  const createEmployeeMutation = useMutation({
    mutationFn: async () => {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error("First and last name are required");
      }
      if (!formData.payRate) {
        throw new Error("Pay rate is required");
      }
      return await apiRequest('POST', '/api/employees', {
        organizationId: currentOrganization.id,
        ...formData,
        hireDate: formData.hireDate || null,
        terminationDate: formData.terminationDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${currentOrganization.id}`] });
      toast({
        title: "Employee created",
        description: `${formData.firstName} ${formData.lastName} has been added successfully.`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async () => {
      if (!editingEmployee) return;
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error("First and last name are required");
      }
      if (!formData.payRate) {
        throw new Error("Pay rate is required");
      }
      return await apiRequest('PATCH', `/api/employees/${editingEmployee.id}`, {
        ...formData,
        hireDate: formData.hireDate || null,
        terminationDate: formData.terminationDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${currentOrganization.id}`] });
      toast({
        title: "Employee updated",
        description: "Employee information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      return await apiRequest('DELETE', `/api/employees/${employeeId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${currentOrganization.id}`] });
      toast({
        title: "Employee deleted",
        description: "The employee has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeNumber: employee.employeeNumber || "",
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email || "",
      phone: employee.phone || "",
      address: employee.address || "",
      employmentType: employee.employmentType,
      payType: employee.payType,
      payRate: employee.payRate,
      paySchedule: employee.paySchedule,
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : "",
      terminationDate: employee.terminationDate ? new Date(employee.terminationDate).toISOString().split('T')[0] : "",
      bankAccountNumber: employee.bankAccountNumber || "",
      bankRoutingNumber: employee.bankRoutingNumber || "",
      notes: employee.notes || "",
      isActive: employee.isActive,
      teamId: employee.teamId ?? null,
      isTeamLeader: employee.isTeamLeader,
    });
    setIsEditDialogOpen(true);
  };

  const getTeamName = (teamId: number | null) => {
    if (!teamId) return null;
    const team = teams.find(t => t.id === teamId);
    return team?.name;
  };

  const formatPayRate = (payType: string, payRate: string) => {
    if (payType === 'hourly') {
      return `$${parseFloat(payRate).toFixed(2)}/hr`;
    } else {
      return `$${parseFloat(payRate).toLocaleString()}/year`;
    }
  };

  const formatEmploymentType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatPaySchedule = (schedule: string) => {
    if (schedule === 'semimonthly') return 'Semi-monthly';
    return schedule.charAt(0).toUpperCase() + schedule.slice(1);
  };

  const renderEmployeeForm = (isEdit = false) => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}first-name`}>First Name *</Label>
          <Input
            id={`${isEdit ? 'edit-' : ''}first-name`}
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            data-testid={`input-${isEdit ? 'edit-' : ''}first-name`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}last-name`}>Last Name *</Label>
          <Input
            id={`${isEdit ? 'edit-' : ''}last-name`}
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            data-testid={`input-${isEdit ? 'edit-' : ''}last-name`}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit-' : ''}employee-number`}>Employee Number</Label>
        <Input
          id={`${isEdit ? 'edit-' : ''}employee-number`}
          placeholder="e.g., EMP-001"
          value={formData.employeeNumber}
          onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
          data-testid={`input-${isEdit ? 'edit-' : ''}employee-number`}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}email`}>Email</Label>
          <Input
            id={`${isEdit ? 'edit-' : ''}email`}
            type="email"
            placeholder="john.doe@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            data-testid={`input-${isEdit ? 'edit-' : ''}email`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}phone`}>Phone</Label>
          <Input
            id={`${isEdit ? 'edit-' : ''}phone`}
            placeholder="(555) 123-4567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            data-testid={`input-${isEdit ? 'edit-' : ''}phone`}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit-' : ''}address`}>Address</Label>
        <Textarea
          id={`${isEdit ? 'edit-' : ''}address`}
          placeholder="Street address, city, state, zip"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          data-testid={`input-${isEdit ? 'edit-' : ''}address`}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}employment-type`}>Employment Type *</Label>
          <Select
            value={formData.employmentType}
            onValueChange={(value: any) => setFormData({ ...formData, employmentType: value })}
          >
            <SelectTrigger id={`${isEdit ? 'edit-' : ''}employment-type`} data-testid={`select-${isEdit ? 'edit-' : ''}employment-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full Time</SelectItem>
              <SelectItem value="part_time">Part Time</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}pay-type`}>Pay Type *</Label>
          <Select
            value={formData.payType}
            onValueChange={(value: any) => setFormData({ ...formData, payType: value })}
          >
            <SelectTrigger id={`${isEdit ? 'edit-' : ''}pay-type`} data-testid={`select-${isEdit ? 'edit-' : ''}pay-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}pay-rate`}>
            {formData.payType === 'hourly' ? 'Hourly Rate *' : 'Annual Salary *'}
          </Label>
          <Input
            id={`${isEdit ? 'edit-' : ''}pay-rate`}
            type="number"
            step="0.01"
            placeholder={formData.payType === 'hourly' ? '25.00' : '50000'}
            value={formData.payRate}
            onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
            data-testid={`input-${isEdit ? 'edit-' : ''}pay-rate`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}pay-schedule`}>Pay Schedule *</Label>
          <Select
            value={formData.paySchedule}
            onValueChange={(value: any) => setFormData({ ...formData, paySchedule: value })}
          >
            <SelectTrigger id={`${isEdit ? 'edit-' : ''}pay-schedule`} data-testid={`select-${isEdit ? 'edit-' : ''}pay-schedule`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="semimonthly">Semi-monthly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}team`}>Team</Label>
          <Select
            value={formData.teamId ? String(formData.teamId) : "none"}
            onValueChange={(value: string) => setFormData({ ...formData, teamId: value === "none" ? null : parseInt(value) })}
          >
            <SelectTrigger id={`${isEdit ? 'edit-' : ''}team`} data-testid={`select-${isEdit ? 'edit-' : ''}team`}>
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Team</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={String(team.id)}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Position</Label>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id={`${isEdit ? 'edit-' : ''}team-leader`}
              checked={formData.isTeamLeader === 1}
              onCheckedChange={(checked) => setFormData({ ...formData, isTeamLeader: checked ? 1 : 0 })}
              data-testid={`checkbox-${isEdit ? 'edit-' : ''}team-leader`}
              disabled={!formData.teamId}
            />
            <label
              htmlFor={`${isEdit ? 'edit-' : ''}team-leader`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Team Leader / Manager
            </label>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}hire-date`}>Hire Date</Label>
          <Input
            id={`${isEdit ? 'edit-' : ''}hire-date`}
            type="date"
            value={formData.hireDate}
            onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
            data-testid={`input-${isEdit ? 'edit-' : ''}hire-date`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}termination-date`}>Termination Date</Label>
          <Input
            id={`${isEdit ? 'edit-' : ''}termination-date`}
            type="date"
            value={formData.terminationDate}
            onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
            data-testid={`input-${isEdit ? 'edit-' : ''}termination-date`}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}bank-account`}>Bank Account Number</Label>
          <Input
            id={`${isEdit ? 'edit-' : ''}bank-account`}
            placeholder="For direct deposit"
            value={formData.bankAccountNumber}
            onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
            data-testid={`input-${isEdit ? 'edit-' : ''}bank-account`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}bank-routing`}>Bank Routing Number</Label>
          <Input
            id={`${isEdit ? 'edit-' : ''}bank-routing`}
            placeholder="9-digit routing number"
            value={formData.bankRoutingNumber}
            onChange={(e) => setFormData({ ...formData, bankRoutingNumber: e.target.value })}
            maxLength={20}
            data-testid={`input-${isEdit ? 'edit-' : ''}bank-routing`}
          />
        </div>
      </div>
      {isEdit && (
        <div className="space-y-2">
          <Label htmlFor="edit-status">Status *</Label>
          <Select
            value={formData.isActive.toString()}
            onValueChange={(value) => setFormData({ ...formData, isActive: parseInt(value) })}
          >
            <SelectTrigger id="edit-status" data-testid="select-edit-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Active</SelectItem>
              <SelectItem value="0">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit-' : ''}notes`}>Notes</Label>
        <Textarea
          id={`${isEdit ? 'edit-' : ''}notes`}
          placeholder="Additional information about this employee"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          data-testid={`input-${isEdit ? 'edit-' : ''}notes`}
          rows={3}
        />
      </div>
      <Button
        onClick={() => isEdit ? updateEmployeeMutation.mutate() : createEmployeeMutation.mutate()}
        disabled={
          (isEdit ? updateEmployeeMutation.isPending : createEmployeeMutation.isPending) ||
          !formData.firstName.trim() ||
          !formData.lastName.trim() ||
          !formData.payRate
        }
        className="w-full"
        data-testid={`button-${isEdit ? 'update' : 'create'}-employee-submit`}
      >
        {isEdit
          ? (updateEmployeeMutation.isPending ? "Updating..." : "Update Employee")
          : (createEmployeeMutation.isPending ? "Adding..." : "Add Employee")
        }
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Employees & Teams</h1>
          <p className="text-muted-foreground">Manage employee records, teams, and compensation</p>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          {renderEmployeeForm(true)}
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>
              Create a new team for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team Name *</Label>
              <Input
                id="team-name"
                placeholder="e.g., Sales Team"
                value={teamFormData.name}
                onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                data-testid="input-team-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                placeholder="Brief description of the team's purpose"
                value={teamFormData.description}
                onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                data-testid="input-team-description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateTeamDialogOpen(false); resetTeamForm(); }}>
              Cancel
            </Button>
            <Button onClick={() => createTeamMutation.mutate()} disabled={createTeamMutation.isPending} data-testid="button-submit-team">
              {createTeamMutation.isPending ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditTeamDialogOpen} onOpenChange={setIsEditTeamDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-team-name">Team Name *</Label>
              <Input
                id="edit-team-name"
                value={teamFormData.name}
                onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                data-testid="input-edit-team-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-team-description">Description</Label>
              <Textarea
                id="edit-team-description"
                value={teamFormData.description}
                onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                data-testid="input-edit-team-description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditTeamDialogOpen(false); setEditingTeam(null); resetTeamForm(); }}>
              Cancel
            </Button>
            <Button onClick={() => updateTeamMutation.mutate()} disabled={updateTeamMutation.isPending} data-testid="button-update-team">
              {updateTeamMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList>
          <TabsTrigger value="employees" data-testid="tab-employees">Employees</TabsTrigger>
          <TabsTrigger value="teams" data-testid="tab-teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-employee">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Employee</DialogTitle>
                  <DialogDescription>
                    Add a new employee to your organization
                  </DialogDescription>
                </DialogHeader>
                {renderEmployeeForm()}
              </DialogContent>
            </Dialog>
          </div>

          <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>
            Employees in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading employees...</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No employees yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first employee to start managing payroll
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="p-4 rounded-md border hover-elevate"
                  data-testid={`employee-${employee.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg" data-testid={`employee-name-${employee.id}`}>
                          {employee.firstName} {employee.lastName}
                        </h3>
                        {employee.isActive ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                            Inactive
                          </span>
                        )}
                      </div>
                      {employee.employeeNumber && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Badge className="h-4 w-4" />
                          Employee #{employee.employeeNumber}
                        </div>
                      )}
                      {employee.teamId && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {getTeamName(employee.teamId)}
                          {employee.isTeamLeader === 1 && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <Crown className="h-3 w-3" />
                              Team Leader
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {formatPayRate(employee.payType, employee.payRate)}
                        </div>
                        <div className="flex items-center gap-2">
                          {formatEmploymentType(employee.employmentType)} • {formatPaySchedule(employee.paySchedule)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {employee.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {employee.email}
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {employee.phone}
                          </div>
                        )}
                      </div>
                      {employee.address && (
                        <div className="text-sm text-muted-foreground flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span>{employee.address}</span>
                        </div>
                      )}
                      {employee.hireDate && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Hired: {new Date(employee.hireDate).toLocaleDateString()}
                        </div>
                      )}
                      {employee.bankAccountNumber && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Direct deposit enabled
                        </div>
                      )}
                      {employee.notes && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <p className="font-medium">Notes:</p>
                          <p className="whitespace-pre-wrap">{employee.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(employee)}
                        data-testid={`button-edit-employee-${employee.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEmployeeMutation.mutate(employee.id)}
                        disabled={deleteEmployeeMutation.isPending}
                        data-testid={`button-delete-employee-${employee.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsCreateTeamDialogOpen(true)} data-testid="button-create-team">
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Teams</CardTitle>
              <CardDescription>
                Teams in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No teams yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first team to organize your employees
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="p-4 rounded-md border hover-elevate"
                      data-testid={`team-${team.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-lg" data-testid={`team-name-${team.id}`}>
                              {team.name}
                            </h3>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                              {getTeamMemberCount(team.id)} members
                            </span>
                          </div>
                          {team.description && (
                            <p className="text-sm text-muted-foreground">{team.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {getTeamLeader(team.id) && (
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-amber-500" />
                                <span>Leader: {getTeamLeader(team.id)}</span>
                              </div>
                            )}
                          </div>
                          {getTeamMemberCount(team.id) > 0 && (
                            <div className="text-sm text-muted-foreground mt-2">
                              <p className="font-medium">Team Members:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {employees.filter(e => e.teamId === team.id).map(member => (
                                  <span 
                                    key={member.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs"
                                  >
                                    {member.isTeamLeader === 1 && <Crown className="h-3 w-3 text-amber-500" />}
                                    {member.firstName} {member.lastName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTeam(team)}
                            data-testid={`button-edit-team-${team.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTeamMutation.mutate(team.id)}
                            disabled={deleteTeamMutation.isPending}
                            data-testid={`button-delete-team-${team.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
