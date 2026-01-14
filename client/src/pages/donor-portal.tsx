import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  DollarSign, 
  FileText, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { safeFormatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface DonorPortalData {
  donor: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  organization: {
    id: number;
    name: string;
  };
  pledges: Array<{
    id: number;
    amount: string;
    pledgeDate: string;
    dueDate: string | null;
    status: string;
    amountPaid: string;
    notes: string | null;
  }>;
  donations: Array<{
    id: number;
    date: string;
    amount: string;
    description: string;
  }>;
  letters: Array<{
    id: number;
    year: number;
    letterType: string;
    letterStatus: string;
    donationAmount: string;
    renderedHtml: string | null;
  }>;
  brandSettings: {
    primaryColor: string | null;
    logoUrl: string | null;
    organizationName: string | null;
  } | null;
}

export default function DonorPortal() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [contactForm, setContactForm] = useState({
    email: "",
    phone: "",
    address: "",
  });

  // Get token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  // Fetch portal data
  const { data: portalData, isLoading, error } = useQuery<DonorPortalData>({
    queryKey: ['/api/donor-portal/data', token],
    queryFn: async () => {
      const response = await fetch(`/api/donor-portal/data/${token}`);
      if (!response.ok) {
        throw new Error('Invalid or expired access link');
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: { email?: string; phone?: string; address?: string }) => {
      return await apiRequest('PATCH', `/api/donor-portal/update-contact/${token}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Contact updated",
        description: "Your contact information has been updated.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contact information.",
        variant: "destructive",
      });
    },
  });

  // Initialize contact form when data loads
  useEffect(() => {
    if (portalData?.donor) {
      setContactForm({
        email: portalData.donor.email || "",
        phone: portalData.donor.phone || "",
        address: portalData.donor.address || "",
      });
    }
  }, [portalData]);

  // Format currency
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  // Get pledge status badge
  const getPledgeStatusBadge = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Fulfilled</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Download letter as HTML
  const downloadLetter = (letter: DonorPortalData['letters'][0]) => {
    if (!letter.renderedHtml) {
      toast({
        title: "Letter not available",
        description: "This letter has not been finalized yet.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([letter.renderedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tax-letter-${letter.year}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Required</CardTitle>
            <CardDescription>
              Please use the access link sent to your email to view your donor portal.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !portalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Link Expired</CardTitle>
            <CardDescription>
              This access link is invalid or has expired. Please contact the organization to request a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const totalDonations = portalData.donations.reduce(
    (sum, d) => sum + parseFloat(d.amount), 
    0
  );
  const activePledges = portalData.pledges.filter(p => p.status !== 'fulfilled' && p.status !== 'cancelled');
  const totalPledged = activePledges.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalPaid = activePledges.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);

  return (
    <div className="min-h-screen bg-background" data-testid="page-donor-portal">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            {portalData.brandSettings?.logoUrl && (
              <img 
                src={portalData.brandSettings.logoUrl} 
                alt={portalData.organization.name}
                className="h-16 w-auto"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-org-name">
                {portalData.brandSettings?.organizationName || portalData.organization.name}
              </h1>
              <p className="text-muted-foreground">Donor Portal</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-lg">
              Welcome back, <span className="font-semibold" data-testid="text-donor-name">{portalData.donor.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Giving</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-giving">
                {formatCurrency(totalDonations.toString())}
              </div>
              <p className="text-xs text-muted-foreground">
                {portalData.donations.length} donation{portalData.donations.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Pledges</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-pledges">
                {formatCurrency(totalPledged.toString())}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalPaid.toString())} paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tax Letters</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-letters-count">
                {portalData.letters.filter(l => l.letterStatus === 'finalized').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Available for download
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="donations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="donations" data-testid="tab-donations">Donations</TabsTrigger>
            <TabsTrigger value="pledges" data-testid="tab-pledges">Pledges</TabsTrigger>
            <TabsTrigger value="letters" data-testid="tab-letters">Tax Letters</TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">My Info</TabsTrigger>
          </TabsList>

          {/* Donations Tab */}
          <TabsContent value="donations">
            <Card>
              <CardHeader>
                <CardTitle>Donation History</CardTitle>
                <CardDescription>Your giving history with {portalData.organization.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {portalData.donations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No donations recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {portalData.donations.map((donation) => (
                      <div 
                        key={donation.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`donation-row-${donation.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Heart className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{donation.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {safeFormatDate(donation.date, 'MMMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-semibold text-green-600">
                          {formatCurrency(donation.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pledges Tab */}
          <TabsContent value="pledges">
            <Card>
              <CardHeader>
                <CardTitle>Your Pledges</CardTitle>
                <CardDescription>Track your pledge commitments and payments</CardDescription>
              </CardHeader>
              <CardContent>
                {portalData.pledges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pledges recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {portalData.pledges.map((pledge) => {
                      const progress = (parseFloat(pledge.amountPaid) / parseFloat(pledge.amount)) * 100;
                      const remaining = parseFloat(pledge.amount) - parseFloat(pledge.amountPaid);
                      
                      return (
                        <div 
                          key={pledge.id} 
                          className="p-4 border rounded-lg space-y-3"
                          data-testid={`pledge-row-${pledge.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {formatCurrency(pledge.amount)} Pledge
                                </span>
                                {getPledgeStatusBadge(pledge.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Pledged on {safeFormatDate(pledge.pledgeDate, 'MMM d, yyyy')}
                                {pledge.dueDate && ` • Due ${safeFormatDate(pledge.dueDate, 'MMM d, yyyy')}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{formatCurrency(pledge.amountPaid)} paid</span>
                              <span>{formatCurrency(remaining.toString())} remaining</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>

                          {pledge.notes && (
                            <p className="text-sm text-muted-foreground italic">
                              {pledge.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Letters Tab */}
          <TabsContent value="letters">
            <Card>
              <CardHeader>
                <CardTitle>Tax Letters</CardTitle>
                <CardDescription>Download your tax-deductible donation letters</CardDescription>
              </CardHeader>
              <CardContent>
                {portalData.letters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tax letters available yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {portalData.letters.map((letter) => (
                      <div 
                        key={letter.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`letter-row-${letter.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{letter.year} Tax Letter</p>
                            <p className="text-sm text-muted-foreground">
                              Total: {formatCurrency(letter.donationAmount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {letter.letterStatus === 'finalized' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => downloadLetter(letter)}
                              data-testid={`button-download-letter-${letter.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          ) : (
                            <Badge variant="secondary">
                              {letter.letterStatus === 'draft' ? 'Pending' : letter.letterStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>Update your contact details</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit-contact"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          className="pl-10"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          data-testid="input-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          className="pl-10"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          data-testid="input-phone"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          className="pl-10"
                          value={contactForm.address}
                          onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                          data-testid="input-address"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateContactMutation.mutate(contactForm)}
                        disabled={updateContactMutation.isPending}
                        data-testid="button-save-contact"
                      >
                        {updateContactMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          if (portalData?.donor) {
                            setContactForm({
                              email: portalData.donor.email || "",
                              phone: portalData.donor.phone || "",
                              address: portalData.donor.address || "",
                            });
                          }
                        }}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{portalData.donor.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{portalData.donor.email || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{portalData.donor.phone || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium whitespace-pre-line">
                          {portalData.donor.address || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>Thank you for your generous support of {portalData.organization.name}</p>
          <p className="mt-1">Powered by ComplyBook</p>
        </div>
      </div>
    </div>
  );
}
