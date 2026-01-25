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
import { Plus, MoreHorizontal, Edit2, Trash2, Copy, Eye, QrCode, Link2, ClipboardCheck, BarChart3, ExternalLink, GripVertical, X, ChevronUp, ChevronDown } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Form, FormQuestion } from "@shared/schema";

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
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyWithQuestions | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    settings: {
      allowAnonymous: true,
      showProgressBar: true,
      shuffleQuestions: false,
      confirmationMessage: "Thank you for completing this survey!",
    },
    branding: {
      useBranding: true,
      primaryColor: "",
      accentColor: "",
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
    enabled: !!selectedSurvey?.id && isResponsesOpen,
  });

  const surveys = surveysResponse?.data || [];
  const surveyDetail = surveyDetailResponse?.data;
  const questions = surveyDetail?.questions || [];
  const responses = responsesData?.data || [];

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
      },
      branding: {
        useBranding: true,
        primaryColor: "",
        accentColor: "",
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
      branding: (survey.branding as any) || {
        useBranding: true,
        primaryColor: "",
        accentColor: "",
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
                    <DropdownMenuItem onClick={() => window.open(getPublicUrl(survey.publicId), "_blank")}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Responses: {selectedSurvey?.title}</DialogTitle>
            <DialogDescription>{responses.length} responses received</DialogDescription>
          </DialogHeader>
          
          {responses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No responses yet</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {responses.map((response, index) => (
                <Card key={response.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Response #{index + 1}</CardTitle>
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
    </div>
  );
}
