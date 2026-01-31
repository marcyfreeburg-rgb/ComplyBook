import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  Contact, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Calendar,
  Building2,
  User,
  Clock,
  ArrowRight,
  Plus,
  UsersRound
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Organization, Team, Employee } from "@shared/schema";

interface CRMProps {
  currentOrganization: Organization;
  userId: string;
}

type LeadStatus = "new" | "contacted" | "qualified" | "unqualified";
type OpportunityStage = "discovery" | "proposal" | "negotiation" | "closed-won" | "closed-lost";

interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  status: LeadStatus;
  lastContactDate: string;
  assignedToEmployeeId: number | null;
  source: string;
  createdAt: string;
}

interface Opportunity {
  id: number;
  name: string;
  company: string;
  value: number;
  stage: OpportunityStage;
  lastContactDate: string;
  assignedToEmployeeId: number | null;
  probability: number;
  expectedCloseDate: string;
  leadId: number;
}

interface ContactPerson {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  title: string;
  lastContactDate: string;
  notes: string;
}

interface Activity {
  id: number;
  type: "call" | "email" | "meeting" | "note" | "stage_change";
  description: string;
  timestamp: string;
  entityType: "lead" | "opportunity" | "contact";
  entityName: string;
}

const initialLeads: Lead[] = [
  { id: 1, name: "Tech Solutions RFP", company: "Acme Corp", email: "john@acme.com", phone: "555-0101", value: 75000, status: "new", lastContactDate: "2026-01-28", assignedToEmployeeId: null, source: "Website", createdAt: "2026-01-25" },
  { id: 2, name: "Consulting Engagement", company: "Global Industries", email: "mike@global.com", phone: "555-0102", value: 120000, status: "contacted", lastContactDate: "2026-01-27", assignedToEmployeeId: null, source: "Referral", createdAt: "2026-01-20" },
  { id: 3, name: "Software Integration", company: "StartUp Inc", email: "lisa@startup.com", phone: "555-0103", value: 45000, status: "qualified", lastContactDate: "2026-01-26", assignedToEmployeeId: null, source: "Trade Show", createdAt: "2026-01-15" },
  { id: 4, name: "Data Migration Project", company: "Legacy Systems", email: "bob@legacy.com", phone: "555-0104", value: 30000, status: "unqualified", lastContactDate: "2026-01-20", assignedToEmployeeId: null, source: "Cold Call", createdAt: "2026-01-10" },
  { id: 5, name: "Cloud Infrastructure", company: "Modern Tech", email: "amy@modern.com", phone: "555-0105", value: 200000, status: "new", lastContactDate: "2026-01-29", assignedToEmployeeId: null, source: "LinkedIn", createdAt: "2026-01-28" },
];

const initialOpportunities: Opportunity[] = [
  { id: 1, name: "Enterprise Platform", company: "MegaCorp", value: 500000, stage: "negotiation", lastContactDate: "2026-01-28", assignedToEmployeeId: null, probability: 75, expectedCloseDate: "2026-02-15", leadId: 101 },
  { id: 2, name: "Security Audit", company: "FinTech Ltd", value: 85000, stage: "proposal", lastContactDate: "2026-01-27", assignedToEmployeeId: null, probability: 50, expectedCloseDate: "2026-03-01", leadId: 102 },
  { id: 3, name: "Custom Development", company: "Retail Plus", value: 150000, stage: "discovery", lastContactDate: "2026-01-25", assignedToEmployeeId: null, probability: 25, expectedCloseDate: "2026-04-01", leadId: 103 },
  { id: 4, name: "Annual Support Contract", company: "HealthCare Inc", value: 60000, stage: "closed-won", lastContactDate: "2026-01-20", assignedToEmployeeId: null, probability: 100, expectedCloseDate: "2026-01-20", leadId: 104 },
  { id: 5, name: "Mobile App Development", company: "Quick Services", value: 95000, stage: "closed-lost", lastContactDate: "2026-01-15", assignedToEmployeeId: null, probability: 0, expectedCloseDate: "2026-01-15", leadId: 105 },
];

const contacts: ContactPerson[] = [
  { id: 1, name: "John Smith", company: "Acme Corp", email: "john@acme.com", phone: "555-0101", title: "VP of Technology", lastContactDate: "2026-01-28", notes: "Interested in long-term partnership" },
  { id: 2, name: "Mike Chen", company: "Global Industries", email: "mike@global.com", phone: "555-0102", title: "CTO", lastContactDate: "2026-01-27", notes: "Decision maker for all tech initiatives" },
  { id: 3, name: "Lisa Park", company: "StartUp Inc", email: "lisa@startup.com", phone: "555-0103", title: "CEO", lastContactDate: "2026-01-26", notes: "Fast-growing company, budget approval needed" },
  { id: 4, name: "Robert Brown", company: "MegaCorp", email: "robert@megacorp.com", phone: "555-0106", title: "Director of Operations", lastContactDate: "2026-01-28", notes: "Key stakeholder for enterprise deal" },
  { id: 5, name: "Amanda White", company: "FinTech Ltd", email: "amanda@fintech.com", phone: "555-0107", title: "CISO", lastContactDate: "2026-01-27", notes: "Primary contact for security projects" },
];

const recentActivity: Activity[] = [
  { id: 1, type: "stage_change", description: "Moved to Negotiation stage", timestamp: "2026-01-29 10:30 AM", entityType: "opportunity", entityName: "Enterprise Platform" },
  { id: 2, type: "call", description: "Discovery call completed", timestamp: "2026-01-29 09:15 AM", entityType: "lead", entityName: "Cloud Infrastructure" },
  { id: 3, type: "email", description: "Proposal sent", timestamp: "2026-01-28 04:45 PM", entityType: "opportunity", entityName: "Security Audit" },
  { id: 4, type: "meeting", description: "In-person demo scheduled", timestamp: "2026-01-28 02:00 PM", entityType: "lead", entityName: "Consulting Engagement" },
  { id: 5, type: "note", description: "Added follow-up notes", timestamp: "2026-01-28 11:30 AM", entityType: "contact", entityName: "John Smith" },
];

export default function CRM({ currentOrganization, userId }: CRMProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const [showTeamView, setShowTeamView] = useState(false);
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false);

  // Fetch real teams and employees data
  const { data: realTeams = [] } = useQuery<Team[]>({
    queryKey: [`/api/teams/${currentOrganization.id}`],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: [`/api/employees/${currentOrganization.id}`],
  });

  // Helper function to get team members
  const getTeamMembers = (teamId: number) => {
    return employees.filter(e => e.teamId === teamId);
  };

  // Helper: Organize employees by team, sorted alphabetically within each team
  const getEmployeesGroupedByTeam = () => {
    // Sort teams alphabetically by name
    const sortedTeams = [...realTeams].sort((a, b) => a.name.localeCompare(b.name));
    
    // Group employees by team, sorted alphabetically within each team
    const grouped: { team: Team | null; employees: Employee[] }[] = [];
    
    // Add employees with teams
    for (const team of sortedTeams) {
      const teamEmployees = employees
        .filter(e => e.teamId === team.id)
        .sort((a, b) => {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
      if (teamEmployees.length > 0) {
        grouped.push({ team, employees: teamEmployees });
      }
    }
    
    // Add employees without a team (unassigned to any team)
    const unassignedEmployees = employees
      .filter(e => !e.teamId)
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    if (unassignedEmployees.length > 0) {
      grouped.push({ team: null, employees: unassignedEmployees });
    }
    
    return grouped;
  };

  // Helper: Get employee display name with team info
  const getEmployeeDisplayInfo = (employeeId: number | null) => {
    if (!employeeId) return { name: "Unassigned", team: null };
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { name: "Unassigned", team: null };
    const team = realTeams.find(t => t.id === employee.teamId);
    return {
      name: `${employee.firstName} ${employee.lastName}`,
      team: team?.name || null
    };
  };
  const [showViewLeadDialog, setShowViewLeadDialog] = useState(false);
  const [showEditLeadDialog, setShowEditLeadDialog] = useState(false);
  const [showAddOpportunityDialog, setShowAddOpportunityDialog] = useState(false);
  const [showViewOpportunityDialog, setShowViewOpportunityDialog] = useState(false);
  const [showEditOpportunityDialog, setShowEditOpportunityDialog] = useState(false);
  const [showViewContactDialog, setShowViewContactDialog] = useState(false);
  const [showEditContactDialog, setShowEditContactDialog] = useState(false);
  const [showEmailContactDialog, setShowEmailContactDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactPerson | null>(null);
  const [contactsList, setContactsList] = useState<ContactPerson[]>(contacts);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [newLead, setNewLead] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    value: "",
    source: "Website",
    assignedToEmployeeId: null as number | null
  });
  const [newOpportunity, setNewOpportunity] = useState({
    name: "",
    company: "",
    value: "",
    stage: "discovery" as OpportunityStage,
    probability: "25",
    expectedCloseDate: "",
    assignedToEmployeeId: null as number | null
  });
  const { toast } = useToast();

  const leadStatuses: LeadStatus[] = ["new", "contacted", "qualified", "unqualified"];
  const opportunityStages: OpportunityStage[] = ["discovery", "proposal", "negotiation", "closed-won", "closed-lost"];

  const leadsThisMonth = leads.filter(l => {
    const createdDate = new Date(l.createdAt);
    const now = new Date();
    return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
  }).length;

  const activeOpportunities = opportunities.filter(o => !["closed-won", "closed-lost"].includes(o.stage)).length;
  
  const pipelineValue = opportunities
    .filter(o => !["closed-won", "closed-lost"].includes(o.stage))
    .reduce((sum, o) => sum + o.value * (o.probability / 100), 0);

  const closedOpps = opportunities.filter(o => ["closed-won", "closed-lost"].includes(o.stage));
  const wonOpps = opportunities.filter(o => o.stage === "closed-won");
  const winRate = closedOpps.length > 0 ? Math.round((wonOpps.length / closedOpps.length) * 100) : 0;

  const handleLeadStatusChange = (leadId: number, newStatus: LeadStatus) => {
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
    toast({
      title: "Lead status updated",
      description: `Lead moved to ${newStatus.replace("-", " ")} status`,
    });
  };

  const handleOpportunityStageChange = (oppId: number, newStage: OpportunityStage) => {
    setOpportunities(prevOpps => 
      prevOpps.map(opp => {
        if (opp.id === oppId) {
          let newProbability = opp.probability;
          if (newStage === "closed-won") newProbability = 100;
          else if (newStage === "closed-lost") newProbability = 0;
          else if (newStage === "discovery") newProbability = 25;
          else if (newStage === "proposal") newProbability = 50;
          else if (newStage === "negotiation") newProbability = 75;
          return { ...opp, stage: newStage, probability: newProbability };
        }
        return opp;
      })
    );
    toast({
      title: "Opportunity stage updated",
      description: `Opportunity moved to ${newStage.replace("-", " ")} stage`,
    });
  };

  const getLeadStatusColor = (status: LeadStatus) => {
    switch (status) {
      case "new": return "default";
      case "contacted": return "secondary";
      case "qualified": return "default";
      case "unqualified": return "destructive";
      default: return "outline";
    }
  };

  const getOpportunityStageColor = (stage: OpportunityStage) => {
    switch (stage) {
      case "discovery": return "outline";
      case "proposal": return "secondary";
      case "negotiation": return "default";
      case "closed-won": return "default";
      case "closed-lost": return "destructive";
      default: return "outline";
    }
  };

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "call": return <Contact className="h-4 w-4" />;
      case "email": return <ArrowRight className="h-4 w-4" />;
      case "meeting": return <Users className="h-4 w-4" />;
      case "note": return <Clock className="h-4 w-4" />;
      case "stage_change": return <TrendingUp className="h-4 w-4" />;
    }
  };

  const handleAddLead = () => {
    if (!newLead.name || !newLead.company || !newLead.email) {
      toast({
        title: "Missing information",
        description: "Please fill in name, company, and email",
        variant: "destructive"
      });
      return;
    }

    const lead: Lead = {
      id: Math.max(...leads.map(l => l.id)) + 1,
      name: newLead.name,
      company: newLead.company,
      email: newLead.email,
      phone: newLead.phone,
      value: parseFloat(newLead.value) || 0,
      status: "new",
      lastContactDate: new Date().toISOString().split('T')[0],
      assignedToEmployeeId: newLead.assignedToEmployeeId,
      source: newLead.source,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setLeads([lead, ...leads]);
    setNewLead({ name: "", company: "", email: "", phone: "", value: "", source: "Website", assignedToEmployeeId: null });
    setShowAddLeadDialog(false);
    setActiveTab("leads");
    toast({
      title: "Lead added",
      description: `${lead.name} has been added to your leads`
    });
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowViewLeadDialog(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowEditLeadDialog(true);
  };

  const handleSaveEditLead = () => {
    if (!selectedLead) return;
    setLeads(leads.map(l => l.id === selectedLead.id ? selectedLead : l));
    setShowEditLeadDialog(false);
    toast({
      title: "Lead updated",
      description: `${selectedLead.name} has been updated`
    });
  };

  const handleAddOpportunity = () => {
    if (!newOpportunity.name || !newOpportunity.company) {
      toast({
        title: "Missing information",
        description: "Please fill in name and company",
        variant: "destructive"
      });
      return;
    }

    const opp: Opportunity = {
      id: Math.max(...opportunities.map(o => o.id)) + 1,
      name: newOpportunity.name,
      company: newOpportunity.company,
      value: parseFloat(newOpportunity.value) || 0,
      stage: newOpportunity.stage,
      lastContactDate: new Date().toISOString().split('T')[0],
      assignedToEmployeeId: newOpportunity.assignedToEmployeeId,
      probability: parseInt(newOpportunity.probability) || 25,
      expectedCloseDate: newOpportunity.expectedCloseDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      leadId: 0
    };

    setOpportunities([opp, ...opportunities]);
    setNewOpportunity({ name: "", company: "", value: "", stage: "discovery", probability: "25", expectedCloseDate: "", assignedToEmployeeId: null });
    setShowAddOpportunityDialog(false);
    toast({
      title: "Opportunity created",
      description: `${opp.name} has been added to your pipeline`
    });
  };

  const handleViewOpportunity = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setShowViewOpportunityDialog(true);
  };

  const handleEditOpportunity = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setShowEditOpportunityDialog(true);
  };

  const handleSaveEditOpportunity = () => {
    if (!selectedOpportunity) return;
    setOpportunities(opportunities.map(o => o.id === selectedOpportunity.id ? selectedOpportunity : o));
    setShowEditOpportunityDialog(false);
    toast({
      title: "Opportunity updated",
      description: `${selectedOpportunity.name} has been updated`
    });
  };

  const handleViewContact = (contact: ContactPerson) => {
    setSelectedContact(contact);
    setShowViewContactDialog(true);
  };

  const handleEditContact = (contact: ContactPerson) => {
    setSelectedContact(contact);
    setShowEditContactDialog(true);
  };

  const handleSaveEditContact = () => {
    if (!selectedContact) return;
    setContactsList(contactsList.map(c => c.id === selectedContact.id ? selectedContact : c));
    setShowEditContactDialog(false);
    toast({
      title: "Contact updated",
      description: `${selectedContact.name} has been updated`
    });
  };

  const handleEmailContact = (contact: ContactPerson) => {
    setSelectedContact(contact);
    setEmailSubject("");
    setEmailBody("");
    setShowEmailContactDialog(true);
  };

  const handleSendEmail = () => {
    if (!selectedContact || !emailSubject) {
      toast({
        title: "Missing information",
        description: "Please enter a subject for your email",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, this would send via API
    toast({
      title: "Email sent",
      description: `Email sent to ${selectedContact.email}`
    });
    setShowEmailContactDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">CRM</h1>
          <p className="text-muted-foreground">Manage leads, opportunities, and client relationships</p>
        </div>
        <Button data-testid="button-add-lead" onClick={() => setShowAddLeadDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads (This Month)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-leads-count">{leadsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {leads.filter(l => l.status === "new").length} new, {leads.filter(l => l.status === "qualified").length} qualified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-active-opps">{activeOpportunities}</div>
            <p className="text-xs text-muted-foreground">
              In progress deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-pipeline-value">
              ${pipelineValue >= 1000000 
                ? `${(pipelineValue / 1000000).toFixed(2)}M` 
                : pipelineValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Weighted by probability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-win-rate">{winRate}%</div>
            <p className="text-xs text-muted-foreground">
              {wonOpps.length} won of {closedOpps.length} closed
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-leads">
            <Users className="h-4 w-4 mr-2" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="opportunities" data-testid="tab-opportunities">
            <Target className="h-4 w-4 mr-2" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts">
            <Contact className="h-4 w-4 mr-2" />
            Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline by Stage</CardTitle>
                <CardDescription>Current opportunities breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {opportunityStages.map(stage => {
                  const stageOpps = opportunities.filter(o => o.stage === stage);
                  const stageValue = stageOpps.reduce((sum, o) => sum + o.value, 0);
                  return (
                    <div key={stage} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getOpportunityStageColor(stage)} className="capitalize">
                          {stage.replace("-", " ")}
                        </Badge>
                        <span className="text-sm text-muted-foreground">({stageOpps.length})</span>
                      </div>
                      <span className="font-semibold">${stageValue.toLocaleString()}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest CRM updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="mt-1 text-muted-foreground">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.entityName}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {activity.entityType}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>Where leads are coming from</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from(new Set(leads.map(l => l.source))).map(source => {
                  const sourceLeads = leads.filter(l => l.source === source);
                  return (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-sm">{source}</span>
                      <Badge variant="secondary">{sourceLeads.length}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>{showTeamView ? "Team Performance" : "Individual Performance"}</CardTitle>
                    <CardDescription>{showTeamView ? "Performance by team" : "Sales rep activity"}</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowTeamView(!showTeamView)}
                    data-testid="button-toggle-performance-view"
                  >
                    {showTeamView ? (
                      <>
                        <User className="h-4 w-4 mr-2" />
                        Show Individual
                      </>
                    ) : (
                      <>
                        <UsersRound className="h-4 w-4 mr-2" />
                        Show Teams
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {showTeamView ? (
                  // Team rollup view from real data
                  realTeams.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No teams created yet. Create teams in the Employees & Teams section.
                    </div>
                  ) : (
                    realTeams.filter((team: Team) => getTeamMembers(team.id).length > 0).length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No teams with members. Assign employees to teams to see team performance.
                      </div>
                    ) : (
                      realTeams.filter((team: Team) => getTeamMembers(team.id).length > 0).map((team: Team) => {
                        const teamMembers = getTeamMembers(team.id);
                        const memberIds = teamMembers.map(m => m.id);
                        // Filter leads/opps by team member IDs
                        const teamLeads = leads.filter(l => l.assignedToEmployeeId && memberIds.includes(l.assignedToEmployeeId));
                        const teamOpps = opportunities.filter(o => o.assignedToEmployeeId && memberIds.includes(o.assignedToEmployeeId));
                        const teamWon = teamOpps.filter(o => o.stage === "closed-won");
                        const totalValue = teamWon.reduce((sum, o) => sum + o.value, 0);
                        return (
                          <div key={team.id} className="p-3 rounded-md border space-y-2" data-testid={`team-performance-${team.id}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <UsersRound className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{team.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{teamLeads.length} leads</Badge>
                                <Badge variant="secondary">{teamWon.length} won</Badge>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>{teamMembers.length} members</span>
                              <span>${totalValue.toLocaleString()} closed</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {teamMembers.map((member: Employee) => (
                                <span key={member.id} className="px-2 py-0.5 rounded-full bg-muted text-xs">
                                  {member.firstName} {member.lastName}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )
                  )
                ) : (
                  // Individual view - group by employee ID
                  (() => {
                    // Get all valid employee IDs from the employees list
                    const validEmployeeIds = new Set(employees.map(e => e.id));
                    
                    const allAssignedEmployeeIds = new Set([
                      ...leads.map(l => l.assignedToEmployeeId),
                      ...opportunities.map(o => o.assignedToEmployeeId)
                    ].filter((id): id is number => id !== null && validEmployeeIds.has(id)));
                    
                    const performanceData = Array.from(allAssignedEmployeeIds).map(empId => {
                      const empInfo = getEmployeeDisplayInfo(empId);
                      const repLeads = leads.filter(l => l.assignedToEmployeeId === empId);
                      const repOpps = opportunities.filter(o => o.assignedToEmployeeId === empId);
                      const repWon = repOpps.filter(o => o.stage === "closed-won");
                      return { empId, empInfo, repLeads, repOpps, repWon };
                    });
                    
                    // Collect unassigned entries (null IDs or IDs for employees who no longer exist)
                    const unassignedLeads = leads.filter(l => 
                      l.assignedToEmployeeId === null || !validEmployeeIds.has(l.assignedToEmployeeId)
                    );
                    const unassignedOpps = opportunities.filter(o => 
                      o.assignedToEmployeeId === null || !validEmployeeIds.has(o.assignedToEmployeeId)
                    );
                    const unassignedWon = unassignedOpps.filter(o => o.stage === "closed-won");
                    if (unassignedLeads.length > 0 || unassignedOpps.length > 0) {
                      performanceData.push({
                        empId: 0,
                        empInfo: { name: "Unassigned", team: null },
                        repLeads: unassignedLeads,
                        repOpps: unassignedOpps,
                        repWon: unassignedWon
                      });
                    }
                    
                    // Sort alphabetically by name
                    performanceData.sort((a, b) => a.empInfo.name.localeCompare(b.empInfo.name));
                    
                    if (performanceData.length === 0) {
                      return (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No leads or opportunities assigned yet.
                        </div>
                      );
                    }
                    
                    return performanceData.map(({ empId, empInfo, repLeads, repWon }) => (
                      <div key={empId} className="flex items-center justify-between" data-testid={`individual-performance-${empInfo.name.replace(/\s+/g, '-').toLowerCase()}`}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {empInfo.name}
                            {empInfo.team && (
                              <span className="text-xs text-muted-foreground ml-1">({empInfo.team})</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{repLeads.length} leads</Badge>
                          <Badge variant="secondary">{repWon.length} won</Badge>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <h2 className="text-xl font-semibold">Lead Pipeline</h2>

          <div className="grid gap-4">
            {leads.map((lead) => (
              <Card key={lead.id} data-testid={`card-lead-${lead.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <CardTitle>{lead.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {lead.company}
                      </CardDescription>
                    </div>
                    <Badge variant={getLeadStatusColor(lead.status)} className="capitalize">
                      {lead.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Value</p>
                      <p className="text-lg font-semibold">${lead.value.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Contact</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.lastContactDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned To</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getEmployeeDisplayInfo(lead.assignedToEmployeeId).name}
                        {getEmployeeDisplayInfo(lead.assignedToEmployeeId).team && (
                          <span className="text-xs text-muted-foreground">
                            ({getEmployeeDisplayInfo(lead.assignedToEmployeeId).team})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <p className="text-sm font-medium">{lead.source}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button variant="outline" size="sm" data-testid={`button-view-lead-${lead.id}`} onClick={() => handleViewLead(lead)}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-edit-lead-${lead.id}`} onClick={() => handleEditLead(lead)}>
                      Edit
                    </Button>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-sm text-muted-foreground">Move to:</span>
                      <Select 
                        value={lead.status} 
                        onValueChange={(value) => handleLeadStatusChange(lead.id, value as LeadStatus)}
                      >
                        <SelectTrigger className="w-[140px]" data-testid={`select-lead-status-${lead.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {leadStatuses.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Opportunity Pipeline</h2>
            <Button data-testid="button-create-opportunity" onClick={() => setShowAddOpportunityDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Opportunity
            </Button>
          </div>

          <div className="grid gap-4">
            {opportunities.map((opp) => (
              <Card key={opp.id} data-testid={`card-opportunity-${opp.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <CardTitle>{opp.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {opp.company}
                      </CardDescription>
                    </div>
                    <Badge variant={getOpportunityStageColor(opp.stage)} className="capitalize">
                      {opp.stage.replace("-", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Value</p>
                      <p className="text-lg font-semibold">${opp.value.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Probability</p>
                      <p className="text-lg font-semibold">{opp.probability}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Contact</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(opp.lastContactDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Close</p>
                      <p className="text-sm font-medium">{new Date(opp.expectedCloseDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned To</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getEmployeeDisplayInfo(opp.assignedToEmployeeId).name}
                        {getEmployeeDisplayInfo(opp.assignedToEmployeeId).team && (
                          <span className="text-xs text-muted-foreground">
                            ({getEmployeeDisplayInfo(opp.assignedToEmployeeId).team})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button variant="outline" size="sm" data-testid={`button-view-opportunity-${opp.id}`} onClick={() => handleViewOpportunity(opp)}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-edit-opportunity-${opp.id}`} onClick={() => handleEditOpportunity(opp)}>
                      Edit
                    </Button>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-sm text-muted-foreground">Move to:</span>
                      <Select 
                        value={opp.stage} 
                        onValueChange={(value) => handleOpportunityStageChange(opp.id, value as OpportunityStage)}
                      >
                        <SelectTrigger className="w-[150px]" data-testid={`select-opportunity-stage-${opp.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {opportunityStages.map(stage => (
                            <SelectItem key={stage} value={stage} className="capitalize">
                              {stage.replace("-", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Client Contacts</h2>
            <Button data-testid="button-add-contact">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          <div className="grid gap-4">
            {contactsList.map((contact) => (
              <Card key={contact.id} data-testid={`card-contact-${contact.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {contact.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {contact.company} - {contact.title}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{contact.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{contact.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Contact</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(contact.lastContactDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {contact.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{contact.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" data-testid={`button-view-contact-${contact.id}`} onClick={() => handleViewContact(contact)}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-edit-contact-${contact.id}`} onClick={() => handleEditContact(contact)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-email-contact-${contact.id}`} onClick={() => handleEmailContact(contact)}>
                      Send Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddLeadDialog} onOpenChange={setShowAddLeadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Enter the lead's information to add them to your pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lead-name">Lead Name *</Label>
              <Input
                id="lead-name"
                data-testid="input-lead-name"
                placeholder="e.g., Enterprise Software RFP"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-company">Company *</Label>
              <Input
                id="lead-company"
                data-testid="input-lead-company"
                placeholder="e.g., Acme Corporation"
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lead-email">Email *</Label>
                <Input
                  id="lead-email"
                  data-testid="input-lead-email"
                  type="email"
                  placeholder="contact@company.com"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-phone">Phone</Label>
                <Input
                  id="lead-phone"
                  data-testid="input-lead-phone"
                  placeholder="555-0100"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lead-value">Estimated Value ($)</Label>
                <Input
                  id="lead-value"
                  data-testid="input-lead-value"
                  type="number"
                  placeholder="50000"
                  value={newLead.value}
                  onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-source">Source</Label>
                <Select value={newLead.source} onValueChange={(value) => setNewLead({ ...newLead, source: value })}>
                  <SelectTrigger data-testid="select-lead-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Trade Show">Trade Show</SelectItem>
                    <SelectItem value="Cold Call">Cold Call</SelectItem>
                    <SelectItem value="Email Campaign">Email Campaign</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-assigned-to">Assign To</Label>
              <Select 
                value={newLead.assignedToEmployeeId?.toString() || "unassigned"} 
                onValueChange={(value) => setNewLead({ ...newLead, assignedToEmployeeId: value === "unassigned" ? null : parseInt(value) })}
              >
                <SelectTrigger data-testid="select-lead-assigned-to">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.length === 0 ? (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      No employees available. Add employees first.
                    </div>
                  ) : (
                    getEmployeesGroupedByTeam().map((group) => (
                      <SelectGroup key={group.team?.id || 'no-team'}>
                        <SelectLabel>{group.team?.name || 'No Team'}</SelectLabel>
                        {group.employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLeadDialog(false)} data-testid="button-cancel-lead">
              Cancel
            </Button>
            <Button onClick={handleAddLead} data-testid="button-save-lead">
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Lead Dialog */}
      <Dialog open={showViewLeadDialog} onOpenChange={setShowViewLeadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              {selectedLead?.company}
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lead Name</p>
                  <p className="font-medium">{selectedLead.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getLeadStatusColor(selectedLead.status)} className="capitalize mt-1">
                    {selectedLead.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedLead.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedLead.phone || "N/A"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Value</p>
                  <p className="font-medium">${selectedLead.value.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium">{selectedLead.source}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <div className="font-medium">
                    {getEmployeeDisplayInfo(selectedLead.assignedToEmployeeId).name}
                    {getEmployeeDisplayInfo(selectedLead.assignedToEmployeeId).team && (
                      <span className="text-sm text-muted-foreground ml-1">
                        ({getEmployeeDisplayInfo(selectedLead.assignedToEmployeeId).team})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Contact</p>
                  <p className="font-medium">{new Date(selectedLead.lastContactDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(selectedLead.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewLeadDialog(false)}>
              Close
            </Button>
            <Button onClick={() => { setShowViewLeadDialog(false); handleEditLead(selectedLead!); }}>
              Edit Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditLeadDialog} onOpenChange={setShowEditLeadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update the lead's information.
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Lead Name</Label>
                <Input
                  data-testid="input-edit-lead-name"
                  value={selectedLead.name}
                  onChange={(e) => setSelectedLead({ ...selectedLead, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Company</Label>
                <Input
                  data-testid="input-edit-lead-company"
                  value={selectedLead.company}
                  onChange={(e) => setSelectedLead({ ...selectedLead, company: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    data-testid="input-edit-lead-email"
                    type="email"
                    value={selectedLead.email}
                    onChange={(e) => setSelectedLead({ ...selectedLead, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    data-testid="input-edit-lead-phone"
                    value={selectedLead.phone}
                    onChange={(e) => setSelectedLead({ ...selectedLead, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Estimated Value ($)</Label>
                  <Input
                    data-testid="input-edit-lead-value"
                    type="number"
                    value={selectedLead.value}
                    onChange={(e) => setSelectedLead({ ...selectedLead, value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={selectedLead.status} onValueChange={(value) => setSelectedLead({ ...selectedLead, status: value as LeadStatus })}>
                    <SelectTrigger data-testid="select-edit-lead-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStatuses.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <Select 
                  value={selectedLead.assignedToEmployeeId?.toString() || "unassigned"} 
                  onValueChange={(value) => setSelectedLead({ ...selectedLead, assignedToEmployeeId: value === "unassigned" ? null : parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-edit-lead-assigned-to">
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.length === 0 ? (
                      <div className="px-2 py-1 text-sm text-muted-foreground">
                        No employees available. Add employees first.
                      </div>
                    ) : (
                      getEmployeesGroupedByTeam().map((group) => (
                        <SelectGroup key={group.team?.id || 'no-team'}>
                          <SelectLabel>{group.team?.name || 'No Team'}</SelectLabel>
                          {group.employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLeadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditLead} data-testid="button-save-edit-lead">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Opportunity Dialog */}
      <Dialog open={showAddOpportunityDialog} onOpenChange={setShowAddOpportunityDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Opportunity</DialogTitle>
            <DialogDescription>
              Create a new opportunity in your pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="opp-name">Opportunity Name *</Label>
              <Input
                id="opp-name"
                data-testid="input-opportunity-name"
                placeholder="e.g., Enterprise Platform Deal"
                value={newOpportunity.name}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opp-company">Company *</Label>
              <Input
                id="opp-company"
                data-testid="input-opportunity-company"
                placeholder="e.g., Acme Corporation"
                value={newOpportunity.company}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, company: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="opp-value">Value ($)</Label>
                <Input
                  id="opp-value"
                  data-testid="input-opportunity-value"
                  type="number"
                  placeholder="100000"
                  value={newOpportunity.value}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, value: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="opp-stage">Stage</Label>
                <Select value={newOpportunity.stage} onValueChange={(value) => {
                  let prob = "25";
                  if (value === "proposal") prob = "50";
                  if (value === "negotiation") prob = "75";
                  setNewOpportunity({ ...newOpportunity, stage: value as OpportunityStage, probability: prob });
                }}>
                  <SelectTrigger data-testid="select-opportunity-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discovery">Discovery</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="opp-probability">Probability (%)</Label>
                <Input
                  id="opp-probability"
                  data-testid="input-opportunity-probability"
                  type="number"
                  min="0"
                  max="100"
                  value={newOpportunity.probability}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, probability: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="opp-close-date">Expected Close Date</Label>
                <Input
                  id="opp-close-date"
                  data-testid="input-opportunity-close-date"
                  type="date"
                  value={newOpportunity.expectedCloseDate}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, expectedCloseDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opp-assigned-to">Assign To</Label>
              <Select 
                value={newOpportunity.assignedToEmployeeId?.toString() || "unassigned"} 
                onValueChange={(value) => setNewOpportunity({ ...newOpportunity, assignedToEmployeeId: value === "unassigned" ? null : parseInt(value) })}
              >
                <SelectTrigger data-testid="select-opportunity-assigned-to">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.length === 0 ? (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      No employees available. Add employees first.
                    </div>
                  ) : (
                    getEmployeesGroupedByTeam().map((group) => (
                      <SelectGroup key={group.team?.id || 'no-team'}>
                        <SelectLabel>{group.team?.name || 'No Team'}</SelectLabel>
                        {group.employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOpportunityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOpportunity} data-testid="button-save-opportunity">
              Create Opportunity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Opportunity Dialog */}
      <Dialog open={showViewOpportunityDialog} onOpenChange={setShowViewOpportunityDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Opportunity Details</DialogTitle>
            <DialogDescription>
              {selectedOpportunity?.company}
            </DialogDescription>
          </DialogHeader>
          {selectedOpportunity && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Opportunity Name</p>
                  <p className="font-medium">{selectedOpportunity.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stage</p>
                  <Badge variant={getOpportunityStageColor(selectedOpportunity.stage)} className="capitalize mt-1">
                    {selectedOpportunity.stage.replace("-", " ")}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Value</p>
                  <p className="font-medium text-lg">${selectedOpportunity.value.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Probability</p>
                  <p className="font-medium">{selectedOpportunity.probability}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Expected Close</p>
                  <p className="font-medium">{new Date(selectedOpportunity.expectedCloseDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Contact</p>
                  <p className="font-medium">{new Date(selectedOpportunity.lastContactDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <div className="font-medium">
                  {getEmployeeDisplayInfo(selectedOpportunity.assignedToEmployeeId).name}
                  {getEmployeeDisplayInfo(selectedOpportunity.assignedToEmployeeId).team && (
                    <span className="text-sm text-muted-foreground ml-1">
                      ({getEmployeeDisplayInfo(selectedOpportunity.assignedToEmployeeId).team})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewOpportunityDialog(false)}>
              Close
            </Button>
            <Button onClick={() => { setShowViewOpportunityDialog(false); handleEditOpportunity(selectedOpportunity!); }}>
              Edit Opportunity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Opportunity Dialog */}
      <Dialog open={showEditOpportunityDialog} onOpenChange={setShowEditOpportunityDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Opportunity</DialogTitle>
            <DialogDescription>
              Update the opportunity details.
            </DialogDescription>
          </DialogHeader>
          {selectedOpportunity && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Opportunity Name</Label>
                <Input
                  data-testid="input-edit-opportunity-name"
                  value={selectedOpportunity.name}
                  onChange={(e) => setSelectedOpportunity({ ...selectedOpportunity, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Company</Label>
                <Input
                  data-testid="input-edit-opportunity-company"
                  value={selectedOpportunity.company}
                  onChange={(e) => setSelectedOpportunity({ ...selectedOpportunity, company: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Value ($)</Label>
                  <Input
                    data-testid="input-edit-opportunity-value"
                    type="number"
                    value={selectedOpportunity.value}
                    onChange={(e) => setSelectedOpportunity({ ...selectedOpportunity, value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Stage</Label>
                  <Select value={selectedOpportunity.stage} onValueChange={(value) => {
                    let prob = selectedOpportunity.probability;
                    if (value === "discovery") prob = 25;
                    else if (value === "proposal") prob = 50;
                    else if (value === "negotiation") prob = 75;
                    else if (value === "closed-won") prob = 100;
                    else if (value === "closed-lost") prob = 0;
                    setSelectedOpportunity({ ...selectedOpportunity, stage: value as OpportunityStage, probability: prob });
                  }}>
                    <SelectTrigger data-testid="select-edit-opportunity-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opportunityStages.map(stage => (
                        <SelectItem key={stage} value={stage} className="capitalize">{stage.replace("-", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Probability (%)</Label>
                  <Input
                    data-testid="input-edit-opportunity-probability"
                    type="number"
                    min="0"
                    max="100"
                    value={selectedOpportunity.probability}
                    onChange={(e) => setSelectedOpportunity({ ...selectedOpportunity, probability: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Expected Close Date</Label>
                  <Input
                    data-testid="input-edit-opportunity-close-date"
                    type="date"
                    value={selectedOpportunity.expectedCloseDate}
                    onChange={(e) => setSelectedOpportunity({ ...selectedOpportunity, expectedCloseDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <Select 
                  value={selectedOpportunity.assignedToEmployeeId?.toString() || "unassigned"} 
                  onValueChange={(value) => setSelectedOpportunity({ ...selectedOpportunity, assignedToEmployeeId: value === "unassigned" ? null : parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-edit-opportunity-assigned-to">
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.length === 0 ? (
                      <div className="px-2 py-1 text-sm text-muted-foreground">
                        No employees available. Add employees first.
                      </div>
                    ) : (
                      getEmployeesGroupedByTeam().map((group) => (
                        <SelectGroup key={group.team?.id || 'no-team'}>
                          <SelectLabel>{group.team?.name || 'No Team'}</SelectLabel>
                          {group.employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditOpportunityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditOpportunity} data-testid="button-save-edit-opportunity">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contact Dialog */}
      <Dialog open={showViewContactDialog} onOpenChange={setShowViewContactDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
            <DialogDescription>
              {selectedContact?.company}
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedContact.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{selectedContact.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedContact.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedContact.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{selectedContact.company}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Contact</p>
                  <p className="font-medium">{new Date(selectedContact.lastContactDate).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedContact.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{selectedContact.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewContactDialog(false)}>
              Close
            </Button>
            <Button onClick={() => { setShowViewContactDialog(false); handleEditContact(selectedContact!); }}>
              Edit Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditContactDialog} onOpenChange={setShowEditContactDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update the contact's information.
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    data-testid="input-edit-contact-name"
                    value={selectedContact.name}
                    onChange={(e) => setSelectedContact({ ...selectedContact, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input
                    data-testid="input-edit-contact-title"
                    value={selectedContact.title}
                    onChange={(e) => setSelectedContact({ ...selectedContact, title: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Company</Label>
                <Input
                  data-testid="input-edit-contact-company"
                  value={selectedContact.company}
                  onChange={(e) => setSelectedContact({ ...selectedContact, company: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    data-testid="input-edit-contact-email"
                    type="email"
                    value={selectedContact.email}
                    onChange={(e) => setSelectedContact({ ...selectedContact, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    data-testid="input-edit-contact-phone"
                    value={selectedContact.phone}
                    onChange={(e) => setSelectedContact({ ...selectedContact, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Input
                  data-testid="input-edit-contact-notes"
                  value={selectedContact.notes}
                  onChange={(e) => setSelectedContact({ ...selectedContact, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditContactDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditContact} data-testid="button-save-edit-contact">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={showEmailContactDialog} onOpenChange={setShowEmailContactDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Compose an email to {selectedContact?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>To</Label>
                <Input
                  value={selectedContact.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label>Subject *</Label>
                <Input
                  data-testid="input-email-subject"
                  placeholder="Enter email subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Message</Label>
                <textarea
                  data-testid="input-email-body"
                  className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Write your message here..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailContactDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} data-testid="button-send-email">
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
