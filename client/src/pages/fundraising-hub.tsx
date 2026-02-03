import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
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
import { TrendingUp, Heart, Gift, Users, DollarSign, Plus, MoreHorizontal, Archive, Trash2, Edit, Loader2, AlertTriangle, Star, Mail, Eye, Calendar, ArrowUp, Award, TrendingDown } from "lucide-react";
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

interface DonorStewardshipData {
  tiers: Array<{
    tier: string;
    count: number;
    totalGiving: string;
    threshold: string;
    minAmount: number;
    nextTierMin: number | null;
    donors: Array<{
      id: number;
      name: string;
      email: string | null;
      totalGiving: number;
      lastDonation: string | null;
      donationCount: number;
      progressToNextTier: number;
      amountToNextTier: number;
      daysSinceLastContact: number | null;
      stewardshipHealth: 'good' | 'needs_attention' | 'at_risk';
    }>;
  }>;
  topDonors: Array<{
    id: number;
    name: string;
    totalGiving: number;
    tier: string;
  }>;
  alerts: Array<{
    type: 'lapsed' | 'anniversary' | 'upgrade_opportunity';
    donorId: number;
    donorName: string;
    message: string;
  }>;
  summary: {
    totalDonors: number;
    totalLifetimeGiving: number;
    repeatDonorRate: number;
    avgDonationAmount: number;
  };
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

  const { data: stewardshipData, isLoading: stewardshipLoading } = useQuery<DonorStewardshipData>({
    queryKey: [`/api/donor-stewardship/${currentOrganization.id}`],
    enabled: !!currentOrganization.id,
  });

  const { data: donors = [] } = useQuery<Donor[]>({
    queryKey: [`/api/donors/${currentOrganization.id}`],
    enabled: !!currentOrganization.id,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: Partial<FundraisingCampaign>) => {
      return apiRequest('POST', '/api/fundraising-campaigns', { ...data, organizationId: currentOrganization.id });
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
      return apiRequest('PATCH', `/api/fundraising-campaigns/${id}`, data);
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
      return apiRequest('POST', `/api/fundraising-campaigns/${id}/archive`);
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
      return apiRequest('DELETE', `/api/fundraising-campaigns/${id}`);
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
      return apiRequest('POST', '/api/in-kind-donations', { ...data, organizationId: currentOrganization.id });
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
      return apiRequest('PATCH', `/api/in-kind-donations/${id}`, data);
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
      return apiRequest('DELETE', `/api/in-kind-donations/${id}`);
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
            <div>
              <h2 className="text-xl font-semibold">Donor Stewardship</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Track relationships with supporters, recognize their generosity, and help them see the impact of their gifts.
              </p>
            </div>
          </div>

          {stewardshipLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !stewardshipData || stewardshipData.summary.totalDonors === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Donor Data Yet</h3>
                <p className="text-muted-foreground text-center">Donor tiers are calculated automatically based on lifetime giving.</p>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Platinum: $25,000+ | Gold: $10,000-$24,999 | Silver: $5,000-$9,999 | Bronze: $1,000-$4,999
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card data-testid="card-total-donors">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Donors</span>
                    </div>
                    <p className="text-2xl font-bold mt-1" data-testid="text-total-donors">{stewardshipData.summary.totalDonors}</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-lifetime-giving">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Lifetime Giving</span>
                    </div>
                    <p className="text-2xl font-bold mt-1" data-testid="text-lifetime-giving">{formatCurrency(stewardshipData.summary.totalLifetimeGiving)}</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-repeat-donor-rate">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Repeat Donor Rate</span>
                    </div>
                    <p className="text-2xl font-bold mt-1" data-testid="text-repeat-donor-rate">{stewardshipData.summary.repeatDonorRate.toFixed(0)}%</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-avg-donation">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Avg Donation</span>
                    </div>
                    <p className="text-2xl font-bold mt-1" data-testid="text-avg-donation">{formatCurrency(stewardshipData.summary.avgDonationAmount)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts Section */}
              {stewardshipData.alerts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Stewardship Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stewardshipData.alerts.map((alert, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/50" data-testid={`alert-stewardship-${idx}`}>
                          <div className="flex items-center gap-2">
                            {alert.type === 'lapsed' && <TrendingDown className="h-4 w-4 text-red-500" />}
                            {alert.type === 'anniversary' && <Calendar className="h-4 w-4 text-blue-500" />}
                            {alert.type === 'upgrade_opportunity' && <ArrowUp className="h-4 w-4 text-green-500" />}
                            <span className="text-sm" data-testid={`text-alert-message-${idx}`}>{alert.message}</span>
                          </div>
                          <Link href={`/donors?id=${alert.donorId}`}>
                            <Button size="icon" variant="ghost" data-testid={`button-view-donor-${alert.donorId}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Donors Spotlight */}
              {stewardshipData.topDonors.length > 0 && (
                <Card data-testid="card-top-donors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      Top Donors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-5 gap-3">
                      {stewardshipData.topDonors.map((donor, idx) => (
                        <div key={donor.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50" data-testid={`card-top-donor-${donor.id}`}>
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate" data-testid={`text-top-donor-name-${donor.id}`}>{donor.name}</p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-top-donor-giving-${donor.id}`}>{formatCurrency(donor.totalGiving)}</p>
                          </div>
                          <Badge variant={donor.tier === 'Platinum' ? 'default' : donor.tier === 'Gold' ? 'secondary' : 'outline'} className="text-xs">
                            {donor.tier}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tier Cards with Donors */}
              <div className="grid md:grid-cols-2 gap-4">
                {stewardshipData.tiers.map((tier) => (
                  <Card key={tier.tier} className={tier.count === 0 ? 'opacity-60' : ''} data-testid={`card-tier-${tier.tier.toLowerCase()}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Award className={`h-5 w-5 ${
                            tier.tier === 'Platinum' ? 'text-slate-400' :
                            tier.tier === 'Gold' ? 'text-amber-500' :
                            tier.tier === 'Silver' ? 'text-slate-400' :
                            'text-amber-700'
                          }`} />
                          <CardTitle className="text-lg">{tier.tier} Tier</CardTitle>
                        </div>
                        <Badge variant={
                          tier.tier === "Platinum" ? "default" : 
                          tier.tier === "Gold" ? "secondary" : 
                          "outline"
                        } data-testid={`badge-tier-count-${tier.tier.toLowerCase()}`}>
                          {tier.count} donor{tier.count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <CardDescription>{tier.threshold}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm flex-wrap gap-1">
                          <span className="text-muted-foreground">Total Lifetime Giving</span>
                          <span className="font-semibold" data-testid={`text-tier-giving-${tier.tier.toLowerCase()}`}>{formatCurrency(tier.totalGiving)}</span>
                        </div>
                        
                        {tier.count > 0 && tier.donors.length > 0 && (
                          <div className="border-t pt-3 mt-3 space-y-2">
                            {tier.donors.slice(0, 3).map((donor) => (
                              <div key={donor.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30" data-testid={`row-tier-donor-${donor.id}`}>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    donor.stewardshipHealth === 'good' ? 'bg-green-500' :
                                    donor.stewardshipHealth === 'needs_attention' ? 'bg-amber-500' :
                                    'bg-red-500'
                                  }`} title={`Health: ${donor.stewardshipHealth.replace('_', ' ')}`} data-testid={`status-health-${donor.id}`} />
                                  <span className="text-sm font-medium truncate" data-testid={`text-tier-donor-name-${donor.id}`}>{donor.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground" data-testid={`text-tier-donor-giving-${donor.id}`}>{formatCurrency(donor.totalGiving)}</span>
                                  {tier.nextTierMin && donor.progressToNextTier < 100 && (
                                    <div className="w-16" data-testid={`progress-tier-${donor.id}`}>
                                      <Progress value={donor.progressToNextTier} className="h-1" />
                                    </div>
                                  )}
                                  {donor.email && (
                                    <Button size="icon" variant="ghost" title="Send thank-you" data-testid={`button-email-donor-${donor.id}`}>
                                      <Mail className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {tier.donors.length > 3 && (
                              <p className="text-xs text-muted-foreground text-center">
                                +{tier.donors.length - 3} more donor{tier.donors.length - 3 !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {tier.count === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">No donors in this tier yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
