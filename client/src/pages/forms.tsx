import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Organization } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MoreHorizontal, Edit2, Trash2, Copy, QrCode, Link2, FileText, ExternalLink, GripVertical, X, Users, Mail, Send, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Donor, Client } from "@shared/schema";
import { QRCodeSVG } from "qrcode.react";
import type { Form, FormQuestion } from "@shared/schema";

type QuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'dropdown' | 'date' | 'email' | 'phone' | 'number' | 'file_upload';

const questionTypeLabels: Record<QuestionType, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  dropdown: "Dropdown",
  date: "Date",
  email: "Email",
  phone: "Phone",
  number: "Number",
  file_upload: "File Upload",
};

interface FormWithQuestions extends Form {
  questions?: FormQuestion[];
}

interface FormsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Forms({ currentOrganization, userId }: FormsProps) {
  const organization = currentOrganization;
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [isResponsesOpen, setIsResponsesOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormWithQuestions | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other" as 'fundraising' | 'registration' | 'event' | 'volunteer' | 'feedback' | 'other',
    settings: {
      collectEmail: true,
      collectName: true,
      notifyOnSubmission: true,
      confirmationMessage: "Thank you for your submission!",
    },
    branding: {
      useBranding: true,
      primaryColor: "",
      accentColor: "",
      logoUrl: "",
      headerImage: "",
    },
    paymentSettings: {
      enablePayments: false,
      paymentRequired: false,
      suggestedAmounts: [25, 50, 100, 250] as number[],
      customAmountEnabled: true,
      minimumAmount: 5,
      paymentDescription: "",
      stripeEnabled: false,
      venmoEnabled: false,
      paypalEnabled: false,
      cashappEnabled: false,
    },
  });

  const [newQuestion, setNewQuestion] = useState({
    question: "",
    questionType: "short_text" as QuestionType,
    required: false,
    options: [] as string[],
    description: "",
  });
  const [optionInput, setOptionInput] = useState("");
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(null);
  const [editQuestionData, setEditQuestionData] = useState({
    question: "",
    questionType: "short_text" as QuestionType,
    required: false,
    options: [] as string[],
    description: "",
  });
  const [editOptionInput, setEditOptionInput] = useState("");
  
  // Send invitations state
  const [isSendInvitationsOpen, setIsSendInvitationsOpen] = useState(false);
  const [selectedDonorIds, setSelectedDonorIds] = useState<number[]>([]);
  const [personalMessage, setPersonalMessage] = useState("");

  const { data: formsResponse, isLoading } = useQuery<{ data: Form[] }>({
    queryKey: ["/api/forms", organization?.id, "form"],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${organization?.id}?type=form`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch forms");
      return response.json();
    },
    enabled: !!organization?.id,
  });

  const { data: formDetailResponse } = useQuery<{ data: FormWithQuestions }>({
    queryKey: ["/api/forms", organization?.id, selectedForm?.id],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${organization?.id}/${selectedForm?.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch form");
      return response.json();
    },
    enabled: !!organization?.id && !!selectedForm?.id && isBuilderOpen,
  });

  const { data: responsesData } = useQuery<{ data: any[] }>({
    queryKey: ["/api/forms", selectedForm?.id, "responses"],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${selectedForm?.id}/responses`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch responses");
      return response.json();
    },
    enabled: !!selectedForm?.id && isResponsesOpen,
  });

  // Fetch donors for sending invitations (only for nonprofit organizations)
  const { data: donors = [] } = useQuery<Donor[]>({
    queryKey: ["/api/donors", organization?.id],
    queryFn: async () => {
      const response = await fetch(`/api/donors/${organization?.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch donors");
      return response.json();
    },
    enabled: !!organization?.id && organization?.type === 'nonprofit' && isSendInvitationsOpen,
  });
  const donorsWithEmail = donors.filter(d => d.email);

  // Fetch clients for sending invitations (for for-profit organizations)
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients", organization?.id],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${organization?.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
    enabled: !!organization?.id && organization?.type === 'forprofit' && isSendInvitationsOpen,
  });
  const clientsWithEmail = clients.filter(c => c.email);

  // Unified recipients list based on organization type
  const recipients = organization?.type === 'nonprofit' ? donorsWithEmail : clientsWithEmail;
  const recipientType = organization?.type === 'nonprofit' ? 'donors' : 'clients';

  const forms = formsResponse?.data || [];
  const formDetail = formDetailResponse?.data;
  const questions = formDetail?.questions || [];
  const responses = responsesData?.data || [];

  useEffect(() => {
    if (formDetail && isBuilderOpen) {
      setSelectedForm(formDetail);
    }
  }, [formDetail, isBuilderOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/forms", {
        ...data,
        organizationId: organization?.id,
        formType: "form",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, "form"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Form created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create form", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/forms/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, "form"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, selectedForm?.id] });
      setIsEditDialogOpen(false);
      toast({ title: "Form updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update form", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/forms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, "form"] });
      toast({ title: "Form deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete form", variant: "destructive" });
    },
  });

  const sendInvitationsMutation = useMutation({
    mutationFn: async ({ formId, donorIds, personalMessage, recipientType }: { formId: number; donorIds: number[]; personalMessage: string; recipientType: 'donor' | 'client' }) => {
      const response = await apiRequest("POST", `/api/forms/${formId}/send-invitations`, {
        donorIds,
        personalMessage,
        recipientType,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsSendInvitationsOpen(false);
      setSelectedDonorIds([]);
      setPersonalMessage("");
      toast({ 
        title: "Invitations Sent",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send invitations", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/forms/${selectedForm?.id}/questions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, selectedForm?.id] });
      setNewQuestion({
        question: "",
        questionType: "short_text",
        required: false,
        options: [],
        description: "",
      });
      toast({ title: "Field added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add field", variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest("DELETE", `/api/forms/questions/${questionId}?formId=${selectedForm?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, selectedForm?.id] });
      toast({ title: "Field deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete field", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/forms/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, "form"] });
      toast({ title: "Form status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/forms/questions/${id}?formId=${selectedForm?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, selectedForm?.id] });
      setIsEditQuestionOpen(false);
      setEditingQuestion(null);
      toast({ title: "Field updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update field", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "other",
      settings: {
        collectEmail: true,
        collectName: true,
        notifyOnSubmission: true,
        confirmationMessage: "Thank you for your submission!",
      },
      branding: {
        useBranding: true,
        primaryColor: "",
        accentColor: "",
        logoUrl: "",
        headerImage: "",
      },
      paymentSettings: {
        enablePayments: false,
        paymentRequired: false,
        suggestedAmounts: [25, 50, 100, 250],
        customAmountEnabled: true,
        minimumAmount: 5,
        paymentDescription: "",
        stripeEnabled: false,
        venmoEnabled: false,
        paypalEnabled: false,
        cashappEnabled: false,
      },
    });
  };

  const handleEdit = (form: Form) => {
    setSelectedForm(form as FormWithQuestions);
    setFormData({
      title: form.title,
      description: form.description || "",
      category: (form.category as any) || "other",
      settings: (form.settings as any) || {
        collectEmail: true,
        collectName: true,
        notifyOnSubmission: true,
        confirmationMessage: "Thank you for your submission!",
      },
      branding: (form.branding as any) || {
        useBranding: true,
        primaryColor: "",
        accentColor: "",
        logoUrl: "",
        headerImage: "",
      },
      paymentSettings: (form.paymentSettings as any) || {
        enablePayments: false,
        paymentRequired: false,
        suggestedAmounts: [25, 50, 100, 250],
        customAmountEnabled: true,
        minimumAmount: 5,
        paymentDescription: "",
        stripeEnabled: false,
        venmoEnabled: false,
        paypalEnabled: false,
        cashappEnabled: false,
      },
    });
    setIsEditDialogOpen(true);
  };

  const handleBuildQuestions = (form: Form) => {
    setSelectedForm(form as FormWithQuestions);
    setIsBuilderOpen(true);
  };

  const handleViewResponses = (form: Form) => {
    setSelectedForm(form as FormWithQuestions);
    setIsResponsesOpen(true);
  };

  const handleShowQR = (form: Form) => {
    setSelectedForm(form as FormWithQuestions);
    setIsQRDialogOpen(true);
  };

  const getPublicUrl = (publicId: string) => {
    return `${window.location.origin}/f/${publicId}`;
  };

  const copyLink = (publicId: string) => {
    navigator.clipboard.writeText(getPublicUrl(publicId));
    toast({ title: "Link copied to clipboard" });
  };

  const addOption = () => {
    if (optionInput.trim()) {
      setNewQuestion({ ...newQuestion, options: [...newQuestion.options, optionInput.trim()] });
      setOptionInput("");
    }
  };

  const removeOption = (index: number) => {
    const options = [...newQuestion.options];
    options.splice(index, 1);
    setNewQuestion({ ...newQuestion, options });
  };

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      toast({ title: "Please enter a field label", variant: "destructive" });
      return;
    }
    if (["single_choice", "multiple_choice", "dropdown"].includes(newQuestion.questionType) && newQuestion.options.length < 2) {
      toast({ title: "Please add at least 2 options", variant: "destructive" });
      return;
    }
    addQuestionMutation.mutate({
      ...newQuestion,
      orderIndex: questions.length,
    });
  };

  const handleEditQuestion = (question: FormQuestion) => {
    setEditingQuestion(question);
    setEditQuestionData({
      question: question.question,
      questionType: question.questionType as QuestionType,
      required: question.required,
      options: (question.options as string[]) || [],
      description: question.description || "",
    });
    setIsEditQuestionOpen(true);
  };

  const handleUpdateQuestion = () => {
    if (!editingQuestion) return;
    if (!editQuestionData.question.trim()) {
      toast({ title: "Please enter a field label", variant: "destructive" });
      return;
    }
    if (["single_choice", "multiple_choice", "dropdown"].includes(editQuestionData.questionType) && editQuestionData.options.length < 2) {
      toast({ title: "Please add at least 2 options", variant: "destructive" });
      return;
    }
    updateQuestionMutation.mutate({
      id: editingQuestion.id,
      data: editQuestionData,
    });
  };

  const addEditOption = () => {
    if (editOptionInput.trim()) {
      setEditQuestionData({ ...editQuestionData, options: [...editQuestionData.options, editOptionInput.trim()] });
      setEditOptionInput("");
    }
  };

  const removeEditOption = (index: number) => {
    const options = [...editQuestionData.options];
    options.splice(index, 1);
    setEditQuestionData({ ...editQuestionData, options });
  };

  if (!organization) {
    return <div className="p-6">Please select an organization first.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-forms-title">Forms</h1>
          <p className="text-muted-foreground">Create forms to collect registrations, contact info, and more</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-form">
              <Plus className="w-4 h-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Form</DialogTitle>
              <DialogDescription>Set up a new form to collect submissions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="form-title">Form Title *</Label>
                <Input
                  id="form-title"
                  placeholder="e.g., Event Registration, Contact Us"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="input-form-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-description">Description</Label>
                <Textarea
                  id="form-description"
                  placeholder="Describe what this form is for..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-form-description"
                />
              </div>
              {organization.type === 'nonprofit' && (
                <div className="space-y-2">
                  <Label htmlFor="form-category">Form Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="select-form-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fundraising">Fundraising</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Categorize your form for better organization
                  </p>
                </div>
              )}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Settings</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Collect Email Address</Label>
                    <p className="text-sm text-muted-foreground">Require respondents to provide their email</p>
                  </div>
                  <Switch
                    checked={formData.settings.collectEmail}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, collectEmail: checked }
                    })}
                    data-testid="switch-collect-email"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Collect Name</Label>
                    <p className="text-sm text-muted-foreground">Require respondents to provide their name</p>
                  </div>
                  <Switch
                    checked={formData.settings.collectName}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, collectName: checked }
                    })}
                    data-testid="switch-collect-name"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified when someone submits the form</p>
                  </div>
                  <Switch
                    checked={formData.settings.notifyOnSubmission}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, notifyOnSubmission: checked }
                    })}
                    data-testid="switch-notify-submission"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmation-message">Confirmation Message</Label>
                  <Textarea
                    id="confirmation-message"
                    placeholder="Message shown after form submission"
                    value={formData.settings.confirmationMessage}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, confirmationMessage: e.target.value }
                    })}
                    data-testid="input-confirmation-message"
                  />
                </div>
              </div>
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Use Organization Branding</h3>
                  <Switch
                    checked={formData.branding.useBranding}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      branding: { ...formData.branding, useBranding: checked }
                    })}
                    data-testid="switch-use-branding"
                  />
                </div>
                {!formData.branding.useBranding && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <div className="space-y-2">
                      <Label htmlFor="logo-url">Custom Logo URL</Label>
                      <Input
                        id="logo-url"
                        placeholder="https://..."
                        value={formData.branding.logoUrl}
                        onChange={(e) => setFormData({
                          ...formData,
                          branding: { ...formData.branding, logoUrl: e.target.value }
                        })}
                        data-testid="input-logo-url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="header-image">Header Image URL</Label>
                      <Input
                        id="header-image"
                        placeholder="https://..."
                        value={formData.branding.headerImage}
                        onChange={(e) => setFormData({
                          ...formData,
                          branding: { ...formData.branding, headerImage: e.target.value }
                        })}
                        data-testid="input-header-image"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="primary-color">Primary Color</Label>
                        <Input
                          id="primary-color"
                          type="color"
                          value={formData.branding.primaryColor || "#3b82f6"}
                          onChange={(e) => setFormData({
                            ...formData,
                            branding: { ...formData.branding, primaryColor: e.target.value }
                          })}
                          data-testid="input-primary-color"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accent-color">Accent Color</Label>
                        <Input
                          id="accent-color"
                          type="color"
                          value={formData.branding.accentColor || "#1e40af"}
                          onChange={(e) => setFormData({
                            ...formData,
                            branding: { ...formData.branding, accentColor: e.target.value }
                          })}
                          data-testid="input-accent-color"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Settings */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Enable Payments</h3>
                    <p className="text-sm text-muted-foreground">Collect payments with this form</p>
                  </div>
                  <Switch
                    checked={formData.paymentSettings.enablePayments}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      paymentSettings: { ...formData.paymentSettings, enablePayments: checked }
                    })}
                    data-testid="switch-enable-payments"
                  />
                </div>
                {formData.paymentSettings.enablePayments && (
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Payment Required</Label>
                        <p className="text-xs text-muted-foreground">Require payment to submit</p>
                      </div>
                      <Switch
                        checked={formData.paymentSettings.paymentRequired}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          paymentSettings: { ...formData.paymentSettings, paymentRequired: checked }
                        })}
                        data-testid="switch-payment-required"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-description">Payment Description</Label>
                      <Input
                        id="payment-description"
                        placeholder="e.g., Donation, Registration Fee"
                        value={formData.paymentSettings.paymentDescription}
                        onChange={(e) => setFormData({
                          ...formData,
                          paymentSettings: { ...formData.paymentSettings, paymentDescription: e.target.value }
                        })}
                        data-testid="input-payment-description"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow Custom Amount</Label>
                        <p className="text-xs text-muted-foreground">Let donors enter any amount</p>
                      </div>
                      <Switch
                        checked={formData.paymentSettings.customAmountEnabled}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          paymentSettings: { ...formData.paymentSettings, customAmountEnabled: checked }
                        })}
                        data-testid="switch-custom-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Methods</Label>
                      <p className="text-xs text-muted-foreground mb-2">Select which payment methods to enable (configure in Brand Settings)</p>
                      <div className="grid grid-cols-2 gap-2">
                        {organization.stripeEnabled && (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.paymentSettings.stripeEnabled}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                paymentSettings: { ...formData.paymentSettings, stripeEnabled: checked }
                              })}
                              data-testid="switch-stripe"
                            />
                            <Label className="text-sm">Credit Card (Stripe)</Label>
                          </div>
                        )}
                        {organization.venmoUsername && (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.paymentSettings.venmoEnabled}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                paymentSettings: { ...formData.paymentSettings, venmoEnabled: checked }
                              })}
                              data-testid="switch-venmo"
                            />
                            <Label className="text-sm">Venmo</Label>
                          </div>
                        )}
                        {organization.paypalEmail && (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.paymentSettings.paypalEnabled}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                paymentSettings: { ...formData.paymentSettings, paypalEnabled: checked }
                              })}
                              data-testid="switch-paypal"
                            />
                            <Label className="text-sm">PayPal</Label>
                          </div>
                        )}
                        {organization.cashappUsername && (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.paymentSettings.cashappEnabled}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                paymentSettings: { ...formData.paymentSettings, cashappEnabled: checked }
                              })}
                              data-testid="switch-cashapp"
                            />
                            <Label className="text-sm">Cash App</Label>
                          </div>
                        )}
                      </div>
                      {!organization.stripeEnabled && !organization.venmoUsername && !organization.paypalEmail && !organization.cashappUsername && (
                        <p className="text-xs text-amber-600">
                          No payment methods configured. Set up payment methods in Brand Settings first.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.title.trim() || createMutation.isPending}
                data-testid="button-submit-form"
              >
                {createMutation.isPending ? "Creating..." : "Create Form"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading forms...</div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No forms yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create your first form to start collecting submissions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="hover-elevate" data-testid={`card-form-${form.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate text-lg">{form.title}</CardTitle>
                  {form.description && (
                    <CardDescription className="line-clamp-2 mt-1">{form.description}</CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-form-menu-${form.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBuildQuestions(form)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Fields
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(form)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewResponses(form)}>
                      <Users className="w-4 h-4 mr-2" />
                      View Submissions
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShowQR(form)}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Show QR Code
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyLink(form.publicId)}>
                      <Link2 className="w-4 h-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(getPublicUrl(form.publicId), "_blank")}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedForm(form);
                        setIsSendInvitationsOpen(true);
                      }}
                      data-testid={`button-send-email-${form.id}`}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send by Email
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(form.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{form.responseCount || 0} submissions</span>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-2">
                <Badge variant={form.status === "active" ? "default" : "secondary"}>
                  {form.status}
                </Badge>
                <Switch
                  checked={form.status === "active"}
                  onCheckedChange={(checked) => toggleStatusMutation.mutate({
                    id: form.id,
                    status: checked ? "active" : "draft"
                  })}
                  data-testid={`switch-status-${form.id}`}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Form Settings</DialogTitle>
            <DialogDescription>Update form details and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-form-title">Form Title *</Label>
              <Input
                id="edit-form-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-edit-form-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-form-description">Description</Label>
              <Textarea
                id="edit-form-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-edit-form-description"
              />
            </div>
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Settings</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Collect Email Address</Label>
                  <p className="text-sm text-muted-foreground">Require respondents to provide their email</p>
                </div>
                <Switch
                  checked={formData.settings.collectEmail}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, collectEmail: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Collect Name</Label>
                  <p className="text-sm text-muted-foreground">Require respondents to provide their name</p>
                </div>
                <Switch
                  checked={formData.settings.collectName}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, collectName: checked }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-confirmation-message">Confirmation Message</Label>
                <Textarea
                  id="edit-confirmation-message"
                  value={formData.settings.confirmationMessage}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, confirmationMessage: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedForm && updateMutation.mutate({ id: selectedForm.id, data: formData })}
              disabled={!formData.title.trim() || updateMutation.isPending}
              data-testid="button-update-form"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Fields: {selectedForm?.title}</DialogTitle>
            <DialogDescription>Add and manage fields for your form</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="fields" className="mt-4">
            <TabsList>
              <TabsTrigger value="fields">Fields ({questions.length})</TabsTrigger>
              <TabsTrigger value="add">Add Field</TabsTrigger>
            </TabsList>
            
            <TabsContent value="fields" className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No fields yet. Add your first field!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <Card key={question.id} data-testid={`card-field-${question.id}`}>
                      <CardContent className="flex items-start gap-3 py-4">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 cursor-move" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{index + 1}.</span>
                            <span>{question.question}</span>
                            {question.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {questionTypeLabels[question.questionType as QuestionType]}
                            </Badge>
                            {question.options && (question.options as string[]).length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {(question.options as string[]).length} options
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditQuestion(question)}
                            data-testid={`button-edit-field-${question.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteQuestionMutation.mutate(question.id)}
                            data-testid={`button-delete-field-${question.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="add" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="field-label">Field Label *</Label>
                  <Input
                    id="field-label"
                    placeholder="Enter field label..."
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    data-testid="input-field-label"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="field-type">Field Type</Label>
                    <Select
                      value={newQuestion.questionType}
                      onValueChange={(value) => setNewQuestion({ ...newQuestion, questionType: value as QuestionType, options: [] })}
                    >
                      <SelectTrigger id="field-type" data-testid="select-field-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(questionTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Switch
                      checked={newQuestion.required}
                      onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, required: checked })}
                      data-testid="switch-field-required"
                    />
                    <Label>Required</Label>
                  </div>
                </div>
                
                {["single_choice", "multiple_choice", "dropdown"].includes(newQuestion.questionType) && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add an option..."
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                        data-testid="input-field-option"
                      />
                      <Button type="button" onClick={addOption} variant="outline" data-testid="button-add-field-option">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newQuestion.options.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newQuestion.options.map((option, index) => (
                          <Badge key={index} variant="secondary" className="py-1 px-2">
                            {option}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 ml-1 p-0"
                              onClick={() => removeOption(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="field-help-text">Help Text (optional)</Label>
                  <Input
                    id="field-help-text"
                    placeholder="Additional guidance for this field..."
                    value={newQuestion.description}
                    onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                    data-testid="input-field-help-text"
                  />
                </div>
                
                <Button
                  onClick={handleAddQuestion}
                  disabled={addQuestionMutation.isPending}
                  data-testid="button-add-field"
                >
                  {addQuestionMutation.isPending ? "Adding..." : "Add Field"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Form</DialogTitle>
            <DialogDescription>Scan the QR code or copy the link to share this form</DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG
                  value={getPublicUrl(selectedForm.publicId)}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="flex items-center gap-2 w-full">
                <Input
                  value={getPublicUrl(selectedForm.publicId)}
                  readOnly
                  className="flex-1"
                  data-testid="input-form-public-url"
                />
                <Button variant="outline" onClick={() => copyLink(selectedForm.publicId)} data-testid="button-copy-form-link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isResponsesOpen} onOpenChange={setIsResponsesOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submissions: {selectedForm?.title}</DialogTitle>
            <DialogDescription>{responses.length} submissions received</DialogDescription>
          </DialogHeader>
          
          {responses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {responses.map((response, index) => (
                <Card key={response.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {response.respondentName || `Submission #${index + 1}`}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {new Date(response.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    {response.respondentEmail && (
                      <CardDescription>{response.respondentEmail}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(response.answers as Record<string, any>).map(([questionId, answer]) => {
                        const question = questions.find(q => q.id.toString() === questionId);
                        return (
                          <div key={questionId} className="border-b pb-2 last:border-0">
                            <div className="text-sm font-medium">{question?.question || `Field ${questionId}`}</div>
                            <div className="text-sm text-muted-foreground">
                              {Array.isArray(answer) ? answer.join(", ") : String(answer)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditQuestionOpen} onOpenChange={setIsEditQuestionOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
            <DialogDescription>Update the field properties</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-field-label">Field Label *</Label>
              <Input
                id="edit-field-label"
                placeholder="Enter field label..."
                value={editQuestionData.question}
                onChange={(e) => setEditQuestionData({ ...editQuestionData, question: e.target.value })}
                data-testid="input-edit-field-label"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-field-type">Field Type</Label>
                <Select
                  value={editQuestionData.questionType}
                  onValueChange={(value) => {
                    const isChoiceType = ["single_choice", "multiple_choice", "dropdown"].includes(value);
                    const wasChoiceType = ["single_choice", "multiple_choice", "dropdown"].includes(editQuestionData.questionType);
                    setEditQuestionData({ 
                      ...editQuestionData, 
                      questionType: value as QuestionType, 
                      // Only clear options when switching from choice type to non-choice type
                      options: isChoiceType && wasChoiceType ? editQuestionData.options : (isChoiceType ? [] : [])
                    });
                  }}
                >
                  <SelectTrigger id="edit-field-type" data-testid="select-edit-field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(questionTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch
                  checked={editQuestionData.required}
                  onCheckedChange={(checked) => setEditQuestionData({ ...editQuestionData, required: checked })}
                  data-testid="switch-edit-field-required"
                />
                <Label>Required</Label>
              </div>
            </div>
            
            {["single_choice", "multiple_choice", "dropdown"].includes(editQuestionData.questionType) && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an option..."
                    value={editOptionInput}
                    onChange={(e) => setEditOptionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEditOption())}
                    data-testid="input-edit-option"
                  />
                  <Button type="button" variant="outline" onClick={addEditOption} data-testid="button-add-edit-option">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {editQuestionData.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editQuestionData.options.map((option, index) => (
                      <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1">
                        {option}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent"
                          onClick={() => removeEditOption(index)}
                          data-testid={`button-remove-edit-option-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-field-description">Description (Optional)</Label>
              <Textarea
                id="edit-field-description"
                placeholder="Add helper text for this field..."
                value={editQuestionData.description}
                onChange={(e) => setEditQuestionData({ ...editQuestionData, description: e.target.value })}
                data-testid="input-edit-field-description"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditQuestionOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateQuestion} 
              disabled={updateQuestionMutation.isPending}
              data-testid="button-save-field"
            >
              {updateQuestionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invitations Dialog */}
      <Dialog open={isSendInvitationsOpen} onOpenChange={(open) => {
        setIsSendInvitationsOpen(open);
        if (!open) {
          setSelectedDonorIds([]);
          setPersonalMessage("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Form by Email
            </DialogTitle>
            <DialogDescription>
              Send "{selectedForm?.title}" to {recipientType} via email
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Recipients</Label>
              {recipients.length === 0 ? (
                <div className="text-center py-6 border rounded-md bg-muted/30">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No {recipientType} with email addresses found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add email addresses to your {recipientType} first
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedDonorIds.length} of {recipients.length} selected
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        if (selectedDonorIds.length === recipients.length) {
                          setSelectedDonorIds([]);
                        } else {
                          setSelectedDonorIds(recipients.map(r => r.id));
                        }
                      }}
                      data-testid="button-select-all-recipients"
                    >
                      {selectedDonorIds.length === recipients.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <ScrollArea className="h-[200px] border rounded-md p-3">
                    <div className="space-y-2">
                      {recipients.map((recipient) => (
                        <div 
                          key={recipient.id} 
                          className="flex items-center space-x-3 p-2 rounded hover-elevate cursor-pointer"
                          onClick={() => {
                            setSelectedDonorIds(prev => 
                              prev.includes(recipient.id) 
                                ? prev.filter(id => id !== recipient.id)
                                : [...prev, recipient.id]
                            );
                          }}
                        >
                          <Checkbox
                            checked={selectedDonorIds.includes(recipient.id)}
                            onCheckedChange={(checked) => {
                              setSelectedDonorIds(prev => 
                                checked 
                                  ? [...prev, recipient.id]
                                  : prev.filter(id => id !== recipient.id)
                              );
                            }}
                            data-testid={`checkbox-recipient-${recipient.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{recipient.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{recipient.email}</p>
                          </div>
                          {selectedDonorIds.includes(recipient.id) && (
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="personal-message">Personal Message (Optional)</Label>
              <Textarea
                id="personal-message"
                placeholder="Add a personal message to include in the email..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
                data-testid="input-personal-message"
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in the invitation email
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSendInvitationsOpen(false)}
              data-testid="button-cancel-send"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedForm && selectedDonorIds.length > 0) {
                  sendInvitationsMutation.mutate({
                    formId: selectedForm.id,
                    donorIds: selectedDonorIds,
                    personalMessage,
                    recipientType: organization?.type === 'nonprofit' ? 'donor' : 'client',
                  });
                }
              }}
              disabled={selectedDonorIds.length === 0 || sendInvitationsMutation.isPending}
              data-testid="button-send-invitations"
            >
              {sendInvitationsMutation.isPending ? (
                <>
                  <Send className="h-4 w-4 mr-2 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {selectedDonorIds.length} {selectedDonorIds.length === 1 ? (organization?.type === 'nonprofit' ? 'Donor' : 'Client') : (organization?.type === 'nonprofit' ? 'Donors' : 'Clients')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
