import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Heart, Gift, Users, DollarSign, Plus, MoreHorizontal, Archive, Trash2, Edit, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Organization, FundraisingCampaign, InKindDonation, Donor } from "@shared/schema";

interface FundraisingHubProps {
  currentOrganization: Organization;
  userId: string;
}

interface CampaignWithProgress extends FundraisingCampaign {
  raisedAmount?: string;
  donationCount?: number;
}

interface InKindDonationWithDonor extends InKindDonation {
  donorName?: string;
}

interface DonorTier {
  tier: string;
  count: number;
  totalGiving: string;
  threshold: string;
}

export default function FundraisingHub({ currentOrganization, userId }: FundraisingHubProps) {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showInKindDialog, setShowInKindDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithProgress | null>(null);
  const [selectedInKind, setSelectedInKind] = useState<InKindDonationWithDonor | null>(null);
  const [archiveCampaignId, setArchiveCampaignId] = useState<number | null>(null);
  const [deleteCampaignId, setDeleteCampaignId] = useState<number | null>(null);
  const [deleteInKindId, setDeleteInKindId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<CampaignWithProgress[]>({
    queryKey: [`/api/fundraising-campaigns/${currentOrganization.id}`],
    enabled: !!currentOrganization.id,
  });

  const { data: inKindDonations = [], isLoading: inKindLoading } = useQuery<InKindDonationWithDonor[]>({
    queryKey: [`/api/in-kind-donations/${currentOrganization.id}`],
    enabled: !!currentOrganization.id,
  });

  const { data: donorTiers = [], isLoading: tiersLoading } = useQuery<DonorTier[]>({
    queryKey: [`/api/donor-tiers/${currentOrganization.id}`],
    enabled: !!currentOrganization.id,
  });

  const { data: donors = [] } = useQuery<Donor[]>({
    queryKey: [`/api/donors/${currentOrganization.id}`],
    enabled: !!currentOrganization.id,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: Partial<FundraisingCampaign>) => {
      return apiRequest('/api/fundraising-campaigns', {
        method: 'POST',
        body: JSON.stringify({ ...data, organizationId: currentOrganization.id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fundraising-campaigns/${currentOrganization.id}`] });
      setShowCampaignDialog(false);
      setSelectedCampaign(null);
      toast({ title: "Campaign created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create campaign", description: error.message, variant: "destructive" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FundraisingCampaign> }) => {
      return apiRequest(`/api/fundraising-campaigns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fundraising-campaigns/${currentOrganization.id}`] });
      setShowCampaignDialog(false);
      setSelectedCampaign(null);
      toast({ title: "Campaign updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update campaign", description: error.message, variant: "destructive" });
    },
  });

  const archiveCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/fundraising-campaigns/${id}/archive`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fundraising-campaigns/${currentOrganization.id}`] });
      setArchiveCampaignId(null);
      toast({ title: "Campaign archived successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to archive campaign", description: error.message, variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/fundraising-campaigns/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fundraising-campaigns/${currentOrganization.id}`] });
      setDeleteCampaignId(null);
      toast({ title: "Campaign deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete campaign", description: error.message, variant: "destructive" });
    },
  });

  const createInKindMutation = useMutation({
    mutationFn: async (data: Partial<InKindDonation>) => {
      return apiRequest('/api/in-kind-donations', {
        method: 'POST',
        body: JSON.stringify({ ...data, organizationId: currentOrganization.id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/in-kind-donations/${currentOrganization.id}`] });
      setShowInKindDialog(false);
      setSelectedInKind(null);
      toast({ title: "In-kind donation recorded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record in-kind donation", description: error.message, variant: "destructive" });
    },
  });

  const updateInKindMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InKindDonation> }) => {
      return apiRequest(`/api/in-kind-donations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/in-kind-donations/${currentOrganization.id}`] });
      setShowInKindDialog(false);
      setSelectedInKind(null);
      toast({ title: "In-kind donation updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update in-kind donation", description: error.message, variant: "destructive" });
    },
  });

  const deleteInKindMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/in-kind-donations/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/in-kind-donations/${currentOrganization.id}`] });
      setDeleteInKindId(null);
      toast({ title: "In-kind donation deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete in-kind donation", description: error.message, variant: "destructive" });
    },
  });

  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'planning');
  const totalRaised = campaigns.reduce((sum, c) => sum + parseFloat(c.raisedAmount || '0'), 0);
  const totalInKindValue = inKindDonations.reduce((sum, d) => sum + parseFloat(d.fairMarketValue || '0'), 0);
  const majorDonorCount = donorTiers.filter(t => t.tier === 'Platinum' || t.tier === 'Gold').reduce((sum, t) => sum + t.count, 0);

  const handleSaveCampaign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      goalAmount: formData.get('goalAmount') as string,
      campaignType: formData.get('campaignType') as string,
      startDate: formData.get('startDate') ? new Date(formData.get('startDate') as string) : null,
      endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : null,
      status: formData.get('status') as 'planning' | 'active' | 'completed' | 'cancelled',
    };

    if (selectedCampaign?.id) {
      updateCampaignMutation.mutate({ id: selectedCampaign.id, data });
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  const handleSaveInKind = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const donationType = formData.get('donationType') as string;
    const data: Partial<InKindDonation> = {
      donorId: parseInt(formData.get('donorId') as string) || null,
      donationType: donationType as 'goods' | 'services' | 'volunteer_hours',
      description: formData.get('description') as string,
      fairMarketValue: formData.get('fairMarketValue') as string,
      quantity: formData.get('quantity') ? parseInt(formData.get('quantity') as string) : null,
      unitOfMeasure: formData.get('unitOfMeasure') as string || null,
      volunteerHours: donationType === 'volunteer_hours' ? parseFloat(formData.get('volunteerHours') as string) || null : null,
      hourlyRate: donationType === 'volunteer_hours' ? formData.get('hourlyRate') as string || null : null,
      donationDate: formData.get('donationDate') ? new Date(formData.get('donationDate') as string) : new Date(),
      notes: formData.get('notes') as string || null,
    };

    if (selectedInKind?.id) {
      updateInKindMutation.mutate({ id: selectedInKind.id, data });
    } else {
      createInKindMutation.mutate(data);
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount: string | number | null | undefined) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fundraising Hub</h1>
          <p className="text-muted-foreground">Manage campaigns, donations, and donor relationships</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">Raising funds now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Raised (YTD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRaised)}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-Kind Value</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInKindValue)}</div>
            <p className="text-xs text-muted-foreground">{inKindDonations.length} donations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Major Donors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{majorDonorCount}</div>
            <p className="text-xs text-muted-foreground">Platinum & Gold tiers</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <TrendingUp className="h-4 w-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="inkind" data-testid="tab-inkind">
            <Gift className="h-4 w-4 mr-2" />
            In-Kind Donations
          </TabsTrigger>
          <TabsTrigger value="donors" data-testid="tab-donors">
            <Heart className="h-4 w-4 mr-2" />
            Donor Stewardship
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Fundraising Campaigns</h2>
            <Button data-testid="button-create-campaign" onClick={() => { setSelectedCampaign(null); setShowCampaignDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>

          {campaignsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
                <p className="text-muted-foreground text-center mb-4">Create your first fundraising campaign to start tracking progress</p>
                <Button onClick={() => { setSelectedCampaign(null); setShowCampaignDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign) => {
                const raised = parseFloat(campaign.raisedAmount || '0');
                const goal = parseFloat(campaign.goalAmount || '0');
                const progressPercent = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
                
                return (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <CardTitle>{campaign.name}</CardTitle>
                          <CardDescription>
                            {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'}>
                            {campaign.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-campaign-menu-${campaign.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedCampaign(campaign); setShowCampaignDialog(true); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setArchiveCampaignId(campaign.id)}>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCampaignId(campaign.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      )}
                      <div>
                        <div className="flex justify-between text-sm mb-2 flex-wrap gap-1">
                          <span className="font-medium">Progress ({campaign.donationCount || 0} donations)</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(raised)} / {formatCurrency(goal)}
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(progressPercent)}% of goal achieved
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inkind" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">In-Kind Donations</h2>
            <Button data-testid="button-record-inkind" onClick={() => { setSelectedInKind(null); setShowInKindDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Record Donation
            </Button>
          </div>

          {inKindLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : inKindDonations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gift className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No In-Kind Donations Yet</h3>
                <p className="text-muted-foreground text-center mb-4">Record your first in-kind donation (goods, services, or volunteer hours)</p>
                <Button onClick={() => { setSelectedInKind(null); setShowInKindDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Donation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {inKindDonations.map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between border-b pb-4 last:border-0 flex-wrap gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{donation.description}</p>
                          <Badge variant="outline" className="capitalize">{donation.donationType?.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Donor: {donation.donorName || 'Anonymous'} • {formatDate(donation.donationDate)}
                        </p>
                        {donation.donationType === 'volunteer_hours' && donation.volunteerHours && (
                          <p className="text-xs text-muted-foreground">
                            {donation.volunteerHours} hours @ {formatCurrency(donation.hourlyRate)}/hr
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-lg font-semibold">{formatCurrency(donation.fairMarketValue)}</p>
                          <p className="text-xs text-muted-foreground">Fair Market Value</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-inkind-menu-${donation.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedInKind(donation); setShowInKindDialog(true); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteInKindId(donation.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="donors" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Donor Stewardship</h2>
          </div>

          {tiersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : donorTiers.length === 0 || donorTiers.every(t => t.count === 0) ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Donor Tiers Yet</h3>
                <p className="text-muted-foreground text-center">Donor tiers are calculated automatically based on lifetime giving.</p>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Platinum: $25,000+ • Gold: $10,000-$24,999 • Silver: $5,000-$9,999 • Bronze: $1,000-$4,999
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {donorTiers.map((tier) => (
                <Card key={tier.tier}>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-lg">{tier.tier} Tier</CardTitle>
                      <Badge variant={
                        tier.tier === "Platinum" ? "default" : 
                        tier.tier === "Gold" ? "secondary" : 
                        "outline"
                      }>
                        {tier.count} donors
                      </Badge>
                    </div>
                    <CardDescription>{tier.threshold}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm flex-wrap gap-1">
                        <span className="text-muted-foreground">Total Lifetime Giving</span>
                        <span className="font-semibold">{formatCurrency(tier.totalGiving)}</span>
                      </div>
                      <div className="flex justify-between text-sm flex-wrap gap-1">
                        <span className="text-muted-foreground">Average per Donor</span>
                        <span className="font-semibold">
                          {tier.count > 0 ? formatCurrency(parseFloat(tier.totalGiving) / tier.count) : '$0'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
            <DialogDescription>
              {selectedCampaign ? 'Update your fundraising campaign details' : 'Set up a new fundraising campaign to track progress'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCampaign} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input id="name" name="name" defaultValue={selectedCampaign?.name || ''} required data-testid="input-campaign-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={selectedCampaign?.description || ''} data-testid="input-campaign-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goalAmount">Goal Amount</Label>
                <Input id="goalAmount" name="goalAmount" type="number" step="0.01" defaultValue={selectedCampaign?.goalAmount || ''} required data-testid="input-campaign-goal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaignType">Type</Label>
                <Select name="campaignType" defaultValue={selectedCampaign?.campaignType || 'general'}>
                  <SelectTrigger data-testid="select-campaign-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="capital">Capital</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="endowment">Endowment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={selectedCampaign?.startDate ? new Date(selectedCampaign.startDate).toISOString().split('T')[0] : ''} data-testid="input-campaign-start" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={selectedCampaign?.endDate ? new Date(selectedCampaign.endDate).toISOString().split('T')[0] : ''} data-testid="input-campaign-end" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={selectedCampaign?.status || 'planning'}>
                <SelectTrigger data-testid="select-campaign-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCampaignDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending} data-testid="button-save-campaign">
                {(createCampaignMutation.isPending || updateCampaignMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedCampaign ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showInKindDialog} onOpenChange={setShowInKindDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedInKind ? 'Edit In-Kind Donation' : 'Record In-Kind Donation'}</DialogTitle>
            <DialogDescription>
              {selectedInKind ? 'Update the in-kind donation details' : 'Record a donation of goods, services, or volunteer hours'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveInKind} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="donorId">Donor</Label>
              <Select name="donorId" defaultValue={selectedInKind?.donorId?.toString() || ''}>
                <SelectTrigger data-testid="select-inkind-donor">
                  <SelectValue placeholder="Select donor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {donors.map((donor) => (
                    <SelectItem key={donor.id} value={donor.id.toString()}>{donor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="donationType">Donation Type</Label>
              <Select name="donationType" defaultValue={selectedInKind?.donationType || 'goods'}>
                <SelectTrigger data-testid="select-inkind-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goods">Goods</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="volunteer_hours">Volunteer Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" defaultValue={selectedInKind?.description || ''} required data-testid="input-inkind-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fairMarketValue">Fair Market Value</Label>
                <Input id="fairMarketValue" name="fairMarketValue" type="number" step="0.01" defaultValue={selectedInKind?.fairMarketValue || ''} required data-testid="input-inkind-value" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donationDate">Date</Label>
                <Input id="donationDate" name="donationDate" type="date" defaultValue={selectedInKind?.donationDate ? new Date(selectedInKind.donationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} data-testid="input-inkind-date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="volunteerHours">Volunteer Hours</Label>
                <Input id="volunteerHours" name="volunteerHours" type="number" step="0.5" defaultValue={selectedInKind?.volunteerHours || ''} data-testid="input-inkind-hours" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" defaultValue={selectedInKind?.hourlyRate || ''} data-testid="input-inkind-rate" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={selectedInKind?.notes || ''} data-testid="input-inkind-notes" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowInKindDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createInKindMutation.isPending || updateInKindMutation.isPending} data-testid="button-save-inkind">
                {(createInKindMutation.isPending || updateInKindMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedInKind ? 'Update' : 'Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveCampaignId} onOpenChange={() => setArchiveCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this campaign? It will be marked as cancelled and hidden from the default view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveCampaignId && archiveCampaignMutation.mutate(archiveCampaignId)} data-testid="button-confirm-archive">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCampaignId} onOpenChange={() => setDeleteCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteCampaignId && deleteCampaignMutation.mutate(deleteCampaignId)} data-testid="button-confirm-delete-campaign">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteInKindId} onOpenChange={() => setDeleteInKindId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete In-Kind Donation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this in-kind donation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteInKindId && deleteInKindMutation.mutate(deleteInKindId)} data-testid="button-confirm-delete-inkind">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
