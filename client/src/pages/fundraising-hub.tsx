import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Heart, Gift, Users, Calendar, DollarSign } from "lucide-react";
import type { Organization } from "@shared/schema";

interface FundraisingHubProps {
  currentOrganization: Organization;
  userId: string;
}

export default function FundraisingHub({ currentOrganization, userId }: FundraisingHubProps) {
  const [activeTab, setActiveTab] = useState("campaigns");

  const campaigns = [
    { id: 1, name: "Annual Gala 2025", goal: 50000, raised: 32500, startDate: "2025-01-01", endDate: "2025-12-31", status: "active" },
    { id: 2, name: "Building Fund", goal: 100000, raised: 45000, startDate: "2025-02-01", endDate: "2025-06-30", status: "active" },
  ];

  const inKindDonations = [
    { id: 1, donor: "John Smith", type: "Goods", description: "Office Furniture", value: 5000, date: "2025-10-15" },
    { id: 2, donor: "Jane Doe", type: "Volunteer Hours", description: "Legal Services", hours: 20, hourlyRate: 200, value: 4000, date: "2025-10-20" },
  ];

  const donorTiers = [
    { tier: "Platinum", count: 5, totalGiving: 150000, threshold: "25,000+" },
    { tier: "Gold", count: 12, totalGiving: 180000, threshold: "10,000 - 24,999" },
    { tier: "Silver", count: 25, totalGiving: 125000, threshold: "5,000 - 9,999" },
    { tier: "Bronze", count: 48, totalGiving: 96000, threshold: "1,000 - 4,999" },
  ];

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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">Raising funds now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Raised (YTD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(campaigns.reduce((sum, c) => sum + c.raised, 0)).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-Kind Value</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(inKindDonations.reduce((sum, d) => sum + d.value, 0)).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{inKindDonations.length} donations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Major Donors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{donorTiers[0].count + donorTiers[1].count}</div>
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
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Fundraising Campaigns</h2>
            <Button data-testid="button-create-campaign">
              <TrendingUp className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>

          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{campaign.name}</CardTitle>
                      <CardDescription>
                        {campaign.startDate} - {campaign.endDate}
                      </CardDescription>
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Progress</span>
                      <span className="text-muted-foreground">
                        ${campaign.raised.toLocaleString()} / ${campaign.goal.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={(campaign.raised / campaign.goal) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((campaign.raised / campaign.goal) * 100)}% of goal achieved
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-campaign-${campaign.id}`}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-add-donation-${campaign.id}`}>
                      Add Donation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inkind" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">In-Kind Donations</h2>
            <Button data-testid="button-record-inkind">
              <Gift className="h-4 w-4 mr-2" />
              Record Donation
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {inKindDonations.map((donation) => (
                  <div key={donation.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{donation.description}</p>
                        <Badge variant="outline">{donation.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Donor: {donation.donor} • {donation.date}
                      </p>
                      {donation.type === "Volunteer Hours" && (
                        <p className="text-xs text-muted-foreground">
                          {donation.hours} hours @ ${donation.hourlyRate}/hr
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">${donation.value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Fair Market Value</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Donor Stewardship</h2>
            <Button data-testid="button-send-thankyou">
              <Heart className="h-4 w-4 mr-2" />
              Send Thank You
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {donorTiers.map((tier) => (
              <Card key={tier.tier}>
                <CardHeader>
                  <div className="flex items-center justify-between">
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Lifetime Giving</span>
                      <span className="font-semibold">${tier.totalGiving.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average per Donor</span>
                      <span className="font-semibold">${Math.round(tier.totalGiving / tier.count).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4" data-testid={`button-view-${tier.tier.toLowerCase()}-donors`}>
                    View {tier.tier} Donors
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
