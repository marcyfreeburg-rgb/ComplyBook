import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Users, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { Organization } from "@shared/schema";

interface GovernmentContractsHubProps {
  currentOrganization: Organization;
  userId: string;
}

export default function GovernmentContractsHub({ currentOrganization, userId }: GovernmentContractsHubProps) {
  const [activeTab, setActiveTab] = useState("proposals");

  const proposals = [
    { id: 1, rfp: "FA8307-25-R-0001", title: "IT Support Services", client: "U.S. Air Force", value: 2500000, status: "submitted", probability: 75, deadline: "2025-11-15" },
    { id: 2, rfp: "W911W5-25-R-0023", title: "Engineering Services", client: "Army Corps", value: 1800000, status: "draft", probability: 60, deadline: "2025-12-01" },
  ];

  const subcontractors = [
    { id: 1, company: "Tech Solutions LLC", contact: "Mike Johnson", totalPaid: 125000, compliance: "compliant", insurance: "2026-03-15", certifications: "2026-01-20" },
    { id: 2, company: "Engineering Partners Inc", contact: "Sarah Lee", totalPaid: 85000, compliance: "expiring_soon", insurance: "2025-11-30", certifications: "2026-06-15" },
  ];

  const changeOrders = [
    { id: 1, contract: "FA8307-24-C-0015", number: "CO-001", title: "Additional Scope - Phase 2", amount: 250000, status: "approved", requestDate: "2025-10-01" },
    { id: 2, contract: "W911W5-24-C-0008", number: "CO-002", title: "Timeline Extension", amount: 0, status: "under_review", requestDate: "2025-10-15" },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case "won": case "approved": case "compliant": return "default";
      case "submitted": case "under_review": case "expiring_soon": return "secondary";
      case "lost": case "rejected": case "non_compliant": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Government Contracts Hub</h1>
          <p className="text-muted-foreground">Manage proposals, subcontractors, and change orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposals.length}</div>
            <p className="text-xs text-muted-foreground">Total pipeline value: ${(proposals.reduce((sum, p) => sum + p.value, 0) / 1000000).toFixed(1)}M</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subcontractors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subcontractors.length}</div>
            <p className="text-xs text-muted-foreground">Total paid: ${(subcontractors.reduce((sum, s) => sum + s.totalPaid, 0)).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Change Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{changeOrders.length}</div>
            <p className="text-xs text-muted-foreground">Contract modifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">1</div>
            <p className="text-xs text-muted-foreground">Expiring certifications</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="proposals" data-testid="tab-proposals">
            <FileText className="h-4 w-4 mr-2" />
            Proposals & Bids
          </TabsTrigger>
          <TabsTrigger value="subcontractors" data-testid="tab-subcontractors">
            <Users className="h-4 w-4 mr-2" />
            Subcontractors
          </TabsTrigger>
          <TabsTrigger value="changes" data-testid="tab-changeorders">
            <TrendingUp className="h-4 w-4 mr-2" />
            Change Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Bid Pipeline</h2>
            <Button data-testid="button-create-proposal">
              <FileText className="h-4 w-4 mr-2" />
              New Proposal
            </Button>
          </div>

          <div className="grid gap-4">
            {proposals.map((proposal) => (
              <Card key={proposal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{proposal.title}</CardTitle>
                      <CardDescription>
                        {proposal.rfp} • {proposal.client}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusColor(proposal.status)}>
                      {proposal.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Proposed Value</p>
                      <p className="text-lg font-semibold">${(proposal.value / 1000000).toFixed(2)}M</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Win Probability</p>
                      <p className="text-lg font-semibold">{proposal.probability}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Deadline</p>
                      <p className="text-lg font-semibold">{proposal.deadline}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-proposal-${proposal.id}`}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-edit-proposal-${proposal.id}`}>
                      Edit Proposal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subcontractors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Subcontractor Management</h2>
            <Button data-testid="button-add-subcontractor">
              <Users className="h-4 w-4 mr-2" />
              Add Subcontractor
            </Button>
          </div>

          <div className="grid gap-4">
            {subcontractors.map((sub) => (
              <Card key={sub.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{sub.company}</CardTitle>
                      <CardDescription>Contact: {sub.contact}</CardDescription>
                    </div>
                    <Badge variant={getStatusColor(sub.compliance)}>
                      {sub.compliance.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-lg font-semibold">${sub.totalPaid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Insurance Exp.</p>
                      <p className="text-sm font-medium">{sub.insurance}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Certifications Exp.</p>
                      <p className="text-sm font-medium">{sub.certifications}</p>
                    </div>
                  </div>
                  {sub.compliance === "expiring_soon" && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <p className="text-sm text-destructive">Insurance expires within 30 days</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-sub-${sub.id}`}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-payments-${sub.id}`}>
                      Payment History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Change Orders</h2>
            <Button data-testid="button-create-changeorder">
              <TrendingUp className="h-4 w-4 mr-2" />
              Submit Change Order
            </Button>
          </div>

          <div className="grid gap-4">
            {changeOrders.map((co) => (
              <Card key={co.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{co.number}: {co.title}</CardTitle>
                      <CardDescription>Contract: {co.contract}</CardDescription>
                    </div>
                    <Badge variant={getStatusColor(co.status)}>
                      {co.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Change Amount</p>
                      <p className="text-lg font-semibold">
                        {co.amount === 0 ? "No Cost" : `$${co.amount.toLocaleString()}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Request Date</p>
                      <p className="text-sm font-medium">{co.requestDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2">
                        {co.status === "approved" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                        <p className="text-sm font-medium capitalize">{co.status.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-co-${co.id}`}>
                      View Details
                    </Button>
                    {co.status === "under_review" && (
                      <Button variant="outline" size="sm" data-testid={`button-approve-co-${co.id}`}>
                        Approve
                      </Button>
                    )}
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
