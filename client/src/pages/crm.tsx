import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Organization } from "@shared/schema";

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
  assignedTo: string;
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
  assignedTo: string;
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
  { id: 1, name: "Tech Solutions RFP", company: "Acme Corp", email: "john@acme.com", phone: "555-0101", value: 75000, status: "new", lastContactDate: "2026-01-28", assignedTo: "Sarah Johnson", source: "Website", createdAt: "2026-01-25" },
  { id: 2, name: "Consulting Engagement", company: "Global Industries", email: "mike@global.com", phone: "555-0102", value: 120000, status: "contacted", lastContactDate: "2026-01-27", assignedTo: "Tom Wilson", source: "Referral", createdAt: "2026-01-20" },
  { id: 3, name: "Software Integration", company: "StartUp Inc", email: "lisa@startup.com", phone: "555-0103", value: 45000, status: "qualified", lastContactDate: "2026-01-26", assignedTo: "Sarah Johnson", source: "Trade Show", createdAt: "2026-01-15" },
  { id: 4, name: "Data Migration Project", company: "Legacy Systems", email: "bob@legacy.com", phone: "555-0104", value: 30000, status: "unqualified", lastContactDate: "2026-01-20", assignedTo: "Tom Wilson", source: "Cold Call", createdAt: "2026-01-10" },
  { id: 5, name: "Cloud Infrastructure", company: "Modern Tech", email: "amy@modern.com", phone: "555-0105", value: 200000, status: "new", lastContactDate: "2026-01-29", assignedTo: "Sarah Johnson", source: "LinkedIn", createdAt: "2026-01-28" },
];

const initialOpportunities: Opportunity[] = [
  { id: 1, name: "Enterprise Platform", company: "MegaCorp", value: 500000, stage: "negotiation", lastContactDate: "2026-01-28", assignedTo: "Sarah Johnson", probability: 75, expectedCloseDate: "2026-02-15", leadId: 101 },
  { id: 2, name: "Security Audit", company: "FinTech Ltd", value: 85000, stage: "proposal", lastContactDate: "2026-01-27", assignedTo: "Tom Wilson", probability: 50, expectedCloseDate: "2026-03-01", leadId: 102 },
  { id: 3, name: "Custom Development", company: "Retail Plus", value: 150000, stage: "discovery", lastContactDate: "2026-01-25", assignedTo: "Sarah Johnson", probability: 25, expectedCloseDate: "2026-04-01", leadId: 103 },
  { id: 4, name: "Annual Support Contract", company: "HealthCare Inc", value: 60000, stage: "closed-won", lastContactDate: "2026-01-20", assignedTo: "Tom Wilson", probability: 100, expectedCloseDate: "2026-01-20", leadId: 104 },
  { id: 5, name: "Mobile App Development", company: "Quick Services", value: 95000, stage: "closed-lost", lastContactDate: "2026-01-15", assignedTo: "Sarah Johnson", probability: 0, expectedCloseDate: "2026-01-15", leadId: 105 },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">CRM</h1>
          <p className="text-muted-foreground">Manage leads, opportunities, and client relationships</p>
        </div>
        <Button data-testid="button-add-lead">
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
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>Sales rep activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from(new Set([...leads.map(l => l.assignedTo), ...opportunities.map(o => o.assignedTo)])).map(rep => {
                  const repLeads = leads.filter(l => l.assignedTo === rep);
                  const repOpps = opportunities.filter(o => o.assignedTo === rep);
                  const repWon = repOpps.filter(o => o.stage === "closed-won");
                  return (
                    <div key={rep} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{rep}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{repLeads.length} leads</Badge>
                        <Badge variant="secondary">{repWon.length} won</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Lead Pipeline</h2>
            <Button data-testid="button-create-lead">
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
          </div>

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
                        {lead.assignedTo}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <p className="text-sm font-medium">{lead.source}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button variant="outline" size="sm" data-testid={`button-view-lead-${lead.id}`}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-edit-lead-${lead.id}`}>
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
            <Button data-testid="button-create-opportunity">
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
                        {opp.assignedTo}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button variant="outline" size="sm" data-testid={`button-view-opportunity-${opp.id}`}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-edit-opportunity-${opp.id}`}>
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
            {contacts.map((contact) => (
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
                    <Button variant="outline" size="sm" data-testid={`button-view-contact-${contact.id}`}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-edit-contact-${contact.id}`}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-email-contact-${contact.id}`}>
                      Send Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
