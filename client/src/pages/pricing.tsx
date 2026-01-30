import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, Sparkles, Building2, Users, Zap, Shield, Phone, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@shared/schema";

const TIER_ORDER: SubscriptionTier[] = ['free', 'core', 'professional', 'growth', 'enterprise'];

const TIER_ICONS: Record<SubscriptionTier, typeof Sparkles> = {
  free: Sparkles,
  core: Building2,
  professional: Users,
  growth: Zap,
  enterprise: Crown,
};

const FEATURE_LABELS: Record<keyof typeof SUBSCRIPTION_TIERS.free.features, string> = {
  basicReports: 'Basic Reports',
  plaidSandbox: 'Plaid Sandbox',
  plaidLive: 'Live Bank Connection',
  stripeInvoicing: 'Stripe Invoicing',
  fundAccounting: 'Fund Accounting',
  form990Export: 'Form 990 Export',
  sf425Export: 'SF-425 Export',
  grantTracking: 'Grant Tracking',
  dcaaTimeTracking: 'DCAA Time Tracking',
  payrollModule: 'Payroll Module',
  indirectRateCalcs: 'Indirect Rate Calculations',
  advancedForecasting: 'Advanced Forecasting',
  apiAccess: 'API Access',
  whiteLabel: 'White Label Option',
  prioritySupport: 'Priority Support',
  dedicatedOnboarding: 'Dedicated Onboarding',
  customIntegrations: 'Custom Integrations',
  recurringTransactions: 'Recurring Transactions',
  expenseApprovals: 'Expense Approvals',
  donorBasics: 'Donor Management',
  fundraisingBasics: 'Fundraising Tools',
};

const SUPPORT_LABELS: Record<string, string> = {
  community: 'Community Support',
  email: 'Email Support',
  priority_chat_email: 'Priority Chat + Email',
  '4hr_email_sla': '4-Hour Email SLA',
  phone_sla: 'Phone + SLA Support',
};

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const { toast } = useToast();

  const { data: user } = useQuery<{ id: string; subscriptionTier: SubscriptionTier; subscriptionStatus: string } | null>({
    queryKey: ['/api/auth/user'],
  });

  const { data: subscription } = useQuery({
    queryKey: ['/api/stripe/subscription'],
    enabled: !!user,
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ tier, interval }: { tier: SubscriptionTier; interval: 'monthly' | 'annual' }) => {
      const response = await apiRequest('POST', '/api/stripe/checkout', { tier, interval });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/portal');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Portal Failed",
        description: error.message || "Unable to open billing portal.",
        variant: "destructive",
      });
    },
  });

  const currentTier = user?.subscriptionTier || 'free';

  const handleSelectPlan = (tier: SubscriptionTier) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to subscribe to a plan.",
        variant: "destructive",
      });
      return;
    }

    if (tier === 'free') {
      return; // Already on free, nothing to do
    }

    if (tier === 'enterprise') {
      toast({
        title: "Contact Sales",
        description: "Enterprise plans require a custom quote. Please contact us.",
      });
      return;
    }

    checkoutMutation.mutate({ tier, interval: isAnnual ? 'annual' : 'monthly' });
  };

  const getTierIndex = (tier: SubscriptionTier) => TIER_ORDER.indexOf(tier);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4" data-testid="text-pricing-title">
            One Platform Replaces Five Tools
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            Replace your accounting software, grant tracking, compliance reporting, donor management, and payroll systems with ComplyBook.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Start with a 30-day free trial - full access, no charge until day 31</span>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <Label htmlFor="billing-toggle" className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              data-testid="switch-billing-toggle"
            />
            <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
              Annual
              <Badge variant="secondary" className="ml-2">Save 17%</Badge>
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16">
          {TIER_ORDER.map((tier) => {
            const config = SUBSCRIPTION_TIERS[tier];
            const Icon = TIER_ICONS[tier];
            const price = isAnnual ? config.annualPrice : config.monthlyPrice;
            const isCurrentPlan = currentTier === tier;
            const isUpgrade = getTierIndex(tier) > getTierIndex(currentTier);
            const isDowngrade = getTierIndex(tier) < getTierIndex(currentTier);
            const isProfessional = tier === 'professional';

            return (
              <Card 
                key={tier} 
                className={`relative flex flex-col ${isProfessional ? 'border-primary shadow-lg scale-105' : ''}`}
                data-testid={`card-pricing-${tier}`}
              >
                {isProfessional && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{config.name}</CardTitle>
                  <CardDescription className="text-sm min-h-[40px]">
                    {config.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        ${price}
                      </span>
                      {price > 0 && (
                        <span className="text-muted-foreground">/mo</span>
                      )}
                    </div>
                    {isAnnual && price > 0 && tier !== 'enterprise' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        billed annually (${price * 12}/yr)
                      </p>
                    )}
                    {tier === 'enterprise' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        starting price, custom quote
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>
                        {config.maxOrganizations === null ? 'Unlimited' : config.maxOrganizations} organization{config.maxOrganizations !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>
                        {config.maxUsers === null ? 'Unlimited' : config.maxUsers} user{config.maxUsers !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>{SUPPORT_LABELS[config.supportLevel]}</span>
                    </div>
                    
                    {config.maxTransactionsPerMonth && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="ml-6">{config.maxTransactionsPerMonth} transactions/mo</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-4">
                  {isCurrentPlan ? (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      disabled
                      data-testid={`button-current-plan-${tier}`}
                    >
                      Current Plan
                    </Button>
                  ) : tier === 'free' ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={currentTier !== 'free'}
                      data-testid={`button-select-${tier}`}
                    >
                      {currentTier === 'free' ? 'Current Plan' : 'Downgrade'}
                    </Button>
                  ) : tier === 'enterprise' ? (
                    <Button 
                      variant={isProfessional ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => handleSelectPlan(tier)}
                      data-testid={`button-select-${tier}`}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Contact Sales
                    </Button>
                  ) : (
                    <Button 
                      variant={isProfessional ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => handleSelectPlan(tier)}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-select-${tier}`}
                    >
                      {checkoutMutation.isPending ? 'Loading...' : 
                       currentTier === 'free' && !user?.subscriptionStatus ? 'Start Free Trial' :
                       isUpgrade ? 'Upgrade' : 'Select Plan'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {user && currentTier !== 'free' && (
          <div className="text-center mb-16">
            <Button
              variant="outline"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-manage-subscription"
            >
              Manage Subscription
            </Button>
          </div>
        )}

        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Compare All Features</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-medium">Feature</th>
                  {TIER_ORDER.map((tier) => (
                    <th key={tier} className="text-center py-4 px-4 font-medium">
                      {SUBSCRIPTION_TIERS[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(FEATURE_LABELS) as Array<keyof typeof FEATURE_LABELS>).map((feature) => (
                  <tr key={feature} className="border-b">
                    <td className="py-3 px-4 text-sm">{FEATURE_LABELS[feature]}</td>
                    {TIER_ORDER.map((tier) => {
                      const hasFeature = SUBSCRIPTION_TIERS[tier].features[feature];
                      return (
                        <td key={tier} className="text-center py-3 px-4">
                          {hasFeature ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center mt-16 text-muted-foreground">
          <p className="mb-2">All plans include secure data encryption, regular backups, and 99.9% uptime SLA.</p>
          <p>Questions? Contact us at <a href="mailto:tech@jandmsolutions.com" className="text-primary hover:underline">tech@jandmsolutions.com</a></p>
        </div>
      </div>
    </div>
  );
}
