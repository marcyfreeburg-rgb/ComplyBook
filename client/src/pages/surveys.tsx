import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Organization, Donor, Client, Program, FormResponse } from "@shared/schema";
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
import { Plus, MoreHorizontal, Edit2, Trash2, Copy, Eye, QrCode, Link2, ClipboardCheck, BarChart3, ExternalLink, GripVertical, X, ChevronUp, ChevronDown, Download, Filter, Code2, Search, TrendingUp, Shield, Tag, Palette, Mail, Send, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QRCodeSVG } from "qrcode.react";
import type { Form, FormQuestion } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

type QuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'dropdown' | 'rating' | 'date' | 'email' | 'phone' | 'number' | 'file_upload';

const questionTypeLabels: Record<QuestionType, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  dropdown: "Dropdown",
  rating: "Rating (1-5)",
  date: "Date",
  email: "Email",
  phone: "Phone",
  number: "Number",
  file_upload: "File Upload",
};

interface SurveyWithQuestions extends Form {
  questions?: FormQuestion[];
}

interface SurveysProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Surveys({ currentOrganization, userId }: SurveysProps) {
  const organization = currentOrganization;
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [isResponsesOpen, setIsResponsesOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyWithQuestions | null>(null);
  const [responseFilter, setResponseFilter] = useState({ search: "", donorId: "", programId: "", dateRange: "all" });
  const [responseTab, setResponseTab] = useState<"responses" | "analytics">("responses");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    settings: {
      allowAnonymous: true,
      showProgressBar: true,
      shuffleQuestions: false,
      confirmationMessage: "Thank you for completing this survey!",
      requireConsent: false,
      consentText: "I consent to my data being collected and processed according to the privacy policy.",
      autoThankYou: false,
      thankYouEmailSubject: "Thank you for your feedback",
      thankYouEmailBody: "",
      enableDonorPrefill: false,
      embedEnabled: false,
      isInvoicePaymentSurvey: false,
    },
    branding: {
      useBranding: true,
      primaryColor: "",
      accentColor: "",
      theme: "default",
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

  const { data: surveysResponse, isLoading } = useQuery<{ data: Form[] }>({
    queryKey: ["/api/forms", organization?.id, "survey"],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${organization?.id}?type=survey`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch surveys");
      return response.json();
    },
    enabled: !!organization?.id,
  });

  const { data: surveyDetailResponse } = useQuery<{ data: SurveyWithQuestions }>({
    queryKey: ["/api/forms", organization?.id, selectedSurvey?.id],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${organization?.id}/${selectedSurvey?.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch survey");
      return response.json();
    },
    enabled: !!organization?.id && !!selectedSurvey?.id && isBuilderOpen,
  });

  const { data: responsesData } = useQuery<{ data: any[] }>({
    queryKey: ["/api/forms", selectedSurvey?.id, "responses"],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${selectedSurvey?.id}/responses`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch responses");
      return response.json();
    },
    enabled: !!selectedSurvey?.id && (isResponsesOpen || isAnalyticsOpen),
  });

  const { data: donorsData } = useQuery<{ data: Donor[] }>({
    queryKey: ["/api/donors", organization?.id],
    queryFn: async () => {
      const response = await fetch(`/api/donors/${organization?.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch donors");
      return response.json();
    },
    enabled: !!organization?.id && organization?.type === 'nonprofit',
  });

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ["/api/clients", organization?.id],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${organization?.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
    enabled: !!organization?.id && organization?.type === 'for_profit',
  });

  const { data: programsData } = useQuery<{ data: Program[] }>({
    queryKey: ["/api/programs", organization?.id],
    queryFn: async () => {
      const response = await fetch(`/api/programs/${organization?.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch programs");
      return response.json();
    },
    enabled: !!organization?.id,
  });

  const surveys = surveysResponse?.data || [];
  const surveyDetail = surveyDetailResponse?.data;
  const questions = surveyDetail?.questions || [];
  const responses = responsesData?.data || [];
  const donors = donorsData?.data || [];
  const donorsWithEmail = donors.filter(d => d.email);
  const clients = clientsData?.data || [];
  const clientsWithEmail = clients.filter(c => c.email);
  const programs = programsData?.data || [];

  // Unified recipients list based on organization type
  const recipients = organization?.type === 'nonprofit' ? donorsWithEmail : clientsWithEmail;
  const recipientType = organization?.type === 'nonprofit' ? 'donors' : 'clients';

  const filteredResponses = useMemo(() => {
    let filtered = [...responses];
    if (responseFilter.search) {
      const search = responseFilter.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.respondentEmail?.toLowerCase().includes(search) ||
        r.respondentName?.toLowerCase().includes(search) ||
        JSON.stringify(r.answers).toLowerCase().includes(search)
      );
    }
    if (responseFilter.donorId && responseFilter.donorId !== "all") {
      filtered = filtered.filter(r => r.donorId?.toString() === responseFilter.donorId);
    }
    if (responseFilter.programId && responseFilter.programId !== "all") {
      filtered = filtered.filter(r => r.programId?.toString() === responseFilter.programId);
    }
    if (responseFilter.dateRange !== "all") {
      const now = new Date();
      const days = responseFilter.dateRange === "7" ? 7 : responseFilter.dateRange === "30" ? 30 : 90;
      const cutoff = subDays(now, days);
      filtered = filtered.filter(r => new Date(r.submittedAt) >= cutoff);
    }
    return filtered;
  }, [responses, responseFilter]);

  const analytics = useMemo(() => {
    if (!responses.length || !questions.length) return null;
    
    const ratingQuestions = questions.filter(q => q.questionType === "rating");
    const choiceQuestions = questions.filter(q => 
      ["single_choice", "multiple_choice", "dropdown"].includes(q.questionType)
    );
    
    const ratingAverages = ratingQuestions.map(q => {
      const values = responses
        .map(r => r.answers[q.id])
        .filter((v): v is number => typeof v === "number");
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { question: q.question.slice(0, 30) + "...", average: Math.round(avg * 10) / 10 };
    });

    const choiceBreakdowns = choiceQuestions.map(q => {
      const counts: Record<string, number> = {};
      responses.forEach(r => {
        const answer = r.answers[q.id];
        if (Array.isArray(answer)) {
          answer.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
        } else if (answer) {
          counts[answer] = (counts[answer] || 0) + 1;
        }
      });
      return {
        question: q.question,
        data: Object.entries(counts).map(([name, value]) => ({ name, value }))
      };
    });

    const responsesByDay = responses.reduce((acc: Record<string, { date: string; timestamp: number; count: number }>, r) => {
      const timestamp = new Date(r.submittedAt).getTime();
      const day = format(new Date(r.submittedAt), "MMM dd");
      if (!acc[day]) acc[day] = { date: day, timestamp, count: 0 };
      acc[day].count += 1;
      return acc;
    }, {});
    const trendData = Object.values(responsesByDay)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(({ date, count }) => ({ date, count }));

    return { ratingAverages, choiceBreakdowns, trendData, totalResponses: responses.length };
  }, [responses, questions]);

  const CHART_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c43", "#a855f7", "#3b82f6"];

  useEffect(() => {
    if (surveyDetail && isBuilderOpen) {
      setSelectedSurvey(surveyDetail);
    }
  }, [surveyDetail, isBuilderOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/forms", {
        ...data,
        organizationId: organization?.id,
        formType: "survey",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, "survey"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Survey created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create survey", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/forms/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, "survey"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, selectedSurvey?.id] });
      setIsEditDialogOpen(false);
      toast({ title: "Survey updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update survey", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/forms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, "survey"] });
      toast({ title: "Survey deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete survey", variant: "destructive" });
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
      return apiRequest("POST", `/api/forms/${selectedSurvey?.id}/questions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, selectedSurvey?.id] });
      setNewQuestion({
        question: "",
        questionType: "short_text",
        required: false,
        options: [],
        description: "",
      });
      toast({ title: "Question added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add question", variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest("DELETE", `/api/forms/questions/${questionId}?formId=${selectedSurvey?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, selectedSurvey?.id] });
      toast({ title: "Question deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete question", variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/forms/questions/${id}?formId=${selectedSurvey?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, selectedSurvey?.id] });
      setIsEditQuestionOpen(false);
      setEditingQuestion(null);
      toast({ title: "Question updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update question", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/forms/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", organization?.id, "survey"] });
      toast({ title: "Survey status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      settings: {
        allowAnonymous: true,
        showProgressBar: true,
        shuffleQuestions: false,
        confirmationMessage: "Thank you for completing this survey!",
        requireConsent: false,
        consentText: "I consent to my data being collected and processed according to the privacy policy.",
        autoThankYou: false,
        thankYouEmailSubject: "Thank you for your feedback",
        thankYouEmailBody: "",
        enableDonorPrefill: false,
        embedEnabled: false,
        isInvoicePaymentSurvey: false,
      },
      branding: {
        useBranding: true,
        primaryColor: "",
        accentColor: "",
        theme: "default",
      },
    });
  };

  const handleEdit = (survey: Form) => {
    setSelectedSurvey(survey as SurveyWithQuestions);
    setFormData({
      title: survey.title,
      description: survey.description || "",
      settings: (survey.settings as any) || {
        allowAnonymous: true,
        showProgressBar: true,
        shuffleQuestions: false,
        confirmationMessage: "Thank you for completing this survey!",
      },
      branding: {
        useBranding: true,
        primaryColor: "",
        accentColor: "",
        theme: "default",
        ...(survey.branding as any || {}),
      },
    });
    setIsEditDialogOpen(true);
  };

  const handleBuildQuestions = (survey: Form) => {
    setSelectedSurvey(survey as SurveyWithQuestions);
    setIsBuilderOpen(true);
  };

  const handleViewResponses = (survey: Form) => {
    setSelectedSurvey(survey as SurveyWithQuestions);
    setIsResponsesOpen(true);
  };

  const handleShowQR = (survey: Form) => {
    setSelectedSurvey(survey as SurveyWithQuestions);
    setIsQRDialogOpen(true);
  };

  const getPublicUrl = (publicId: string) => {
    return `${window.location.origin}/s/${publicId}`;
  };

  const copyLink = (publicId: string) => {
    navigator.clipboard.writeText(getPublicUrl(publicId));
    toast({ title: "Link copied to clipboard" });
  };

  const getEmbedCode = (publicId: string) => {
    return `<iframe src="${getPublicUrl(publicId)}?embed=true" width="100%" height="600" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;"></iframe>`;
  };

  const copyEmbedCode = (publicId: string) => {
    navigator.clipboard.writeText(getEmbedCode(publicId));
    toast({ title: "Embed code copied to clipboard" });
  };

  const exportToCSV = () => {
    if (!filteredResponses.length || !questions.length) {
      toast({ title: "No responses to export", variant: "destructive" });
      return;
    }
    const headers = ["Response ID", "Submitted At", "Email", "Name", ...questions.map(q => q.question)];
    const rows = filteredResponses.map(r => [
      r.id,
      format(new Date(r.submittedAt), "yyyy-MM-dd HH:mm:ss"),
      r.respondentEmail || "",
      r.respondentName || "",
      ...questions.map(q => {
        const answer = r.answers[q.id];
        return Array.isArray(answer) ? answer.join("; ") : (answer ?? "");
      })
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedSurvey?.title || "survey"}-responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Responses exported to CSV" });
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
      toast({ title: "Please enter a question", variant: "destructive" });
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

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      toast({ title: "Please enter a question", variant: "destructive" });
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

  if (!organization) {
    return <div className="p-6">Please select an organization first.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-surveys-title">Surveys</h1>
          <p className="text-muted-foreground">Create and manage surveys to collect feedback</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-survey">
              <Plus className="w-4 h-4 mr-2" />
              Create Survey
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Survey</DialogTitle>
              <DialogDescription>Set up a new survey to collect responses</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="survey-title">Survey Title *</Label>
                <Input
                  id="survey-title"
                  placeholder="e.g., Customer Satisfaction Survey"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="input-survey-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="survey-description">Description</Label>
                <Textarea
                  id="survey-description"
                  placeholder="Describe what this survey is about..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-survey-description"
                />
              </div>
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Settings</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Anonymous Responses</Label>
                    <p className="text-sm text-muted-foreground">Respondents don't need to provide their identity</p>
                  </div>
                  <Switch
                    checked={formData.settings.allowAnonymous}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, allowAnonymous: checked }
                    })}
                    data-testid="switch-allow-anonymous"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Progress Bar</Label>
                    <p className="text-sm text-muted-foreground">Display completion progress to respondents</p>
                  </div>
                  <Switch
                    checked={formData.settings.showProgressBar}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, showProgressBar: checked }
                    })}
                    data-testid="switch-progress-bar"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmation-message">Confirmation Message</Label>
                  <Textarea
                    id="confirmation-message"
                    placeholder="Message shown after survey completion"
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
                <h3 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy & Compliance
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require GDPR Consent</Label>
                    <p className="text-sm text-muted-foreground">Show privacy consent checkbox before submission</p>
                  </div>
                  <Switch
                    checked={formData.settings.requireConsent}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, requireConsent: checked }
                    })}
                    data-testid="switch-require-consent"
                  />
                </div>
                {formData.settings.requireConsent && (
                  <div className="space-y-2">
                    <Label htmlFor="consent-text">Consent Text</Label>
                    <Textarea
                      id="consent-text"
                      placeholder="I consent to my data being collected..."
                      value={formData.settings.consentText}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, consentText: e.target.value }
                      })}
                      data-testid="input-consent-text"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Donor Pre-fill</Label>
                    <p className="text-sm text-muted-foreground">Auto-populate donor info via URL parameters</p>
                  </div>
                  <Switch
                    checked={formData.settings.enableDonorPrefill}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, enableDonorPrefill: checked }
                    })}
                    data-testid="switch-donor-prefill"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Invoice Payment Survey</Label>
                    <p className="text-sm text-muted-foreground">Automatically send this survey when an invoice is paid</p>
                  </div>
                  <Switch
                    checked={formData.settings.isInvoicePaymentSurvey}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, isInvoicePaymentSurvey: checked }
                    })}
                    data-testid="switch-invoice-payment-survey"
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
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={formData.branding.theme}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      branding: { ...formData.branding, theme: value }
                    })}
                  >
                    <SelectTrigger data-testid="select-theme">
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.title.trim() || createMutation.isPending}
                data-testid="button-submit-survey"
              >
                {createMutation.isPending ? "Creating..." : "Create Survey"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading surveys...</div>
      ) : surveys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No surveys yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create your first survey to start collecting feedback</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="hover-elevate" data-testid={`card-survey-${survey.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate text-lg">{survey.title}</CardTitle>
                  {survey.description && (
                    <CardDescription className="line-clamp-2 mt-1">{survey.description}</CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-survey-menu-${survey.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBuildQuestions(survey)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Questions
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(survey)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewResponses(survey)}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Responses
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShowQR(survey)}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Show QR Code
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyLink(survey.publicId)}>
                      <Link2 className="w-4 h-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedSurvey(survey); setIsEmbedDialogOpen(true); }}>
                      <Code2 className="w-4 h-4 mr-2" />
                      Embed Code
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(getPublicUrl(survey.publicId), "_blank")}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    {organization?.type === 'nonprofit' && (
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedSurvey(survey);
                          setIsSendInvitationsOpen(true);
                        }}
                        data-testid={`button-send-email-${survey.id}`}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send by Email
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(survey.id)}
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
                  <BarChart3 className="h-4 w-4" />
                  <span>{survey.responseCount || 0} responses</span>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-2">
                <Badge variant={survey.status === "active" ? "default" : "secondary"}>
                  {survey.status}
                </Badge>
                <Switch
                  checked={survey.status === "active"}
                  onCheckedChange={(checked) => toggleStatusMutation.mutate({
                    id: survey.id,
                    status: checked ? "active" : "draft"
                  })}
                  data-testid={`switch-status-${survey.id}`}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Survey Settings</DialogTitle>
            <DialogDescription>Update survey details and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-survey-title">Survey Title *</Label>
              <Input
                id="edit-survey-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-edit-survey-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-survey-description">Description</Label>
              <Textarea
                id="edit-survey-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-edit-survey-description"
              />
            </div>
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Settings</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Anonymous Responses</Label>
                  <p className="text-sm text-muted-foreground">Respondents don't need to provide their identity</p>
                </div>
                <Switch
                  checked={formData.settings.allowAnonymous}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, allowAnonymous: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Progress Bar</Label>
                  <p className="text-sm text-muted-foreground">Display completion progress to respondents</p>
                </div>
                <Switch
                  checked={formData.settings.showProgressBar}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, showProgressBar: checked }
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
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy & Compliance
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require GDPR Consent</Label>
                  <p className="text-sm text-muted-foreground">Show privacy consent checkbox</p>
                </div>
                <Switch
                  checked={formData.settings.requireConsent}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, requireConsent: checked }
                  })}
                />
              </div>
              {formData.settings.requireConsent && (
                <div className="space-y-2">
                  <Label>Consent Text</Label>
                  <Textarea
                    value={formData.settings.consentText}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, consentText: e.target.value }
                    })}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Donor Pre-fill</Label>
                  <p className="text-sm text-muted-foreground">Auto-populate donor info</p>
                </div>
                <Switch
                  checked={formData.settings.enableDonorPrefill}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, enableDonorPrefill: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Invoice Payment Survey</Label>
                  <p className="text-sm text-muted-foreground">Auto-send when invoice is paid</p>
                </div>
                <Switch
                  checked={formData.settings.isInvoicePaymentSurvey}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, isInvoicePaymentSurvey: checked }
                  })}
                  data-testid="switch-edit-invoice-payment-survey"
                />
              </div>
            </div>
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Branding
              </h3>
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={formData.branding.theme || "default"}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    branding: { ...formData.branding, theme: value }
                  })}
                >
                  <SelectTrigger data-testid="select-edit-theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedSurvey && updateMutation.mutate({ id: selectedSurvey.id, data: formData })}
              disabled={!formData.title.trim() || updateMutation.isPending}
              data-testid="button-update-survey"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey Questions: {selectedSurvey?.title}</DialogTitle>
            <DialogDescription>Add and manage questions for your survey</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="questions" className="mt-4">
            <TabsList>
              <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
              <TabsTrigger value="add">Add Question</TabsTrigger>
            </TabsList>
            
            <TabsContent value="questions" className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No questions yet. Add your first question!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <Card key={question.id} data-testid={`card-question-${question.id}`}>
                      <CardContent className="flex items-start gap-3 py-4">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 cursor-move" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Q{index + 1}.</span>
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
                            data-testid={`button-edit-question-${question.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteQuestionMutation.mutate(question.id)}
                            data-testid={`button-delete-question-${question.id}`}
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
                  <Label htmlFor="question-text">Question *</Label>
                  <Input
                    id="question-text"
                    placeholder="Enter your question..."
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    data-testid="input-question-text"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="question-type">Question Type</Label>
                    <Select
                      value={newQuestion.questionType}
                      onValueChange={(value) => setNewQuestion({ ...newQuestion, questionType: value as QuestionType, options: [] })}
                    >
                      <SelectTrigger id="question-type" data-testid="select-question-type">
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
                      data-testid="switch-required"
                    />
                    <Label>Required</Label>
                  </div>
                </div>
                
                {["single_choice", "multiple_choice", "dropdown"].includes(newQuestion.questionType) && (
                  <div className="space-y-2">
                    <Label>Answer Options</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add an option..."
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                        data-testid="input-option"
                      />
                      <Button type="button" onClick={addOption} variant="outline" data-testid="button-add-option">
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
                  <Label htmlFor="help-text">Help Text (optional)</Label>
                  <Input
                    id="help-text"
                    placeholder="Additional context for respondents..."
                    value={newQuestion.description}
                    onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                    data-testid="input-help-text"
                  />
                </div>
                
                <Button
                  onClick={handleAddQuestion}
                  disabled={addQuestionMutation.isPending}
                  data-testid="button-add-question"
                >
                  {addQuestionMutation.isPending ? "Adding..." : "Add Question"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Survey</DialogTitle>
            <DialogDescription>Scan the QR code or copy the link to share this survey</DialogDescription>
          </DialogHeader>
          {selectedSurvey && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG
                  value={getPublicUrl(selectedSurvey.publicId)}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="flex items-center gap-2 w-full">
                <Input
                  value={getPublicUrl(selectedSurvey.publicId)}
                  readOnly
                  className="flex-1"
                  data-testid="input-public-url"
                />
                <Button variant="outline" onClick={() => copyLink(selectedSurvey.publicId)} data-testid="button-copy-link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isResponsesOpen} onOpenChange={setIsResponsesOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <DialogTitle>Responses: {selectedSurvey?.title}</DialogTitle>
                <DialogDescription>{responses.length} total responses</DialogDescription>
              </div>
              <Button variant="outline" onClick={exportToCSV} data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </DialogHeader>
          
          <Tabs value={responseTab} onValueChange={(v) => setResponseTab(v as "responses" | "analytics")}>
            <TabsList className="mb-4">
              <TabsTrigger value="responses" data-testid="tab-responses">Responses</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="responses">
              <div className="flex gap-2 flex-wrap mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search responses..."
                    value={responseFilter.search}
                    onChange={(e) => setResponseFilter({ ...responseFilter, search: e.target.value })}
                    className="pl-9"
                    data-testid="input-search-responses"
                  />
                </div>
                <Select value={responseFilter.dateRange} onValueChange={(v) => setResponseFilter({ ...responseFilter, dateRange: v })}>
                  <SelectTrigger className="w-[150px]" data-testid="select-date-range">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                {donors.length > 0 && (
                  <Select value={responseFilter.donorId} onValueChange={(v) => setResponseFilter({ ...responseFilter, donorId: v })}>
                    <SelectTrigger className="w-[180px]" data-testid="select-donor-filter">
                      <SelectValue placeholder="Filter by donor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All donors</SelectItem>
                      {donors.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {programs.length > 0 && (
                  <Select value={responseFilter.programId} onValueChange={(v) => setResponseFilter({ ...responseFilter, programId: v })}>
                    <SelectTrigger className="w-[180px]" data-testid="select-program-filter">
                      <SelectValue placeholder="Filter by program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All programs</SelectItem>
                      {programs.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {filteredResponses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{responses.length === 0 ? "No responses yet" : "No matching responses"}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Showing {filteredResponses.length} of {responses.length} responses</p>
                  {filteredResponses.map((response, index) => (
                    <Card key={response.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="text-base">Response #{index + 1}</CardTitle>
                          <div className="flex items-center gap-2">
                            {response.metadata?.consentGiven && (
                              <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Consent</Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {new Date(response.submittedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {response.respondentEmail && (
                          <CardDescription>{response.respondentName ? `${response.respondentName} - ` : ""}{response.respondentEmail}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(response.answers as Record<string, any>).map(([questionId, answer]) => {
                            const question = questions.find(q => q.id.toString() === questionId);
                            return (
                              <div key={questionId} className="border-b pb-2 last:border-0">
                                <div className="text-sm font-medium">{question?.question || `Question ${questionId}`}</div>
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
            </TabsContent>
            
            <TabsContent value="analytics">
              {analytics ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Response Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {analytics.ratingAverages.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Rating Averages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.ratingAverages}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="question" fontSize={10} />
                              <YAxis domain={[0, 5]} fontSize={12} />
                              <Tooltip />
                              <Bar dataKey="average" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {analytics.choiceBreakdowns.map((breakdown, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-base">{breakdown.question}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={breakdown.data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              >
                                {breakdown.data.map((_, i) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No data available for analytics</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditQuestionOpen} onOpenChange={setIsEditQuestionOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update the question properties</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-question-label">Question *</Label>
              <Input
                id="edit-question-label"
                placeholder="Enter your question..."
                value={editQuestionData.question}
                onChange={(e) => setEditQuestionData({ ...editQuestionData, question: e.target.value })}
                data-testid="input-edit-question-label"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-question-type">Question Type</Label>
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
                  <SelectTrigger id="edit-question-type" data-testid="select-edit-question-type">
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
                  data-testid="switch-edit-question-required"
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
              <Label htmlFor="edit-question-description">Description (Optional)</Label>
              <Textarea
                id="edit-question-description"
                placeholder="Add helper text for this question..."
                value={editQuestionData.description}
                onChange={(e) => setEditQuestionData({ ...editQuestionData, description: e.target.value })}
                data-testid="input-edit-question-description"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditQuestionOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateQuestion} 
              disabled={updateQuestionMutation.isPending}
              data-testid="button-save-question"
            >
              {updateQuestionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmbedDialogOpen} onOpenChange={setIsEmbedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Survey</DialogTitle>
            <DialogDescription>Copy the embed code to add this survey to your website</DialogDescription>
          </DialogHeader>
          {selectedSurvey && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Embed Code</Label>
                <Textarea
                  readOnly
                  value={getEmbedCode(selectedSurvey.publicId)}
                  className="font-mono text-sm h-32"
                  data-testid="input-embed-code"
                />
              </div>
              <Button onClick={() => copyEmbedCode(selectedSurvey.publicId)} className="w-full" data-testid="button-copy-embed">
                <Copy className="h-4 w-4 mr-2" />
                Copy Embed Code
              </Button>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Paste this code into your website's HTML where you want the survey to appear.</p>
                <p>You can adjust the height value to fit your design.</p>
              </div>
            </div>
          )}
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
              Send Survey by Email
            </DialogTitle>
            <DialogDescription>
              Send "{selectedSurvey?.title}" to {recipientType} via email
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
                if (selectedSurvey && selectedDonorIds.length > 0) {
                  sendInvitationsMutation.mutate({
                    formId: selectedSurvey.id,
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
