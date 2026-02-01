import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type QuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'dropdown' | 'rating' | 'date' | 'email' | 'phone' | 'number' | 'file_upload';

interface PublicFormProps {
  formType: 'survey' | 'form';
}

interface PublicFormData {
  id: number;
  title: string;
  description: string | null;
  formType: string;
  settings: {
    allowAnonymous?: boolean;
    showProgressBar?: boolean;
    collectEmail?: boolean;
    collectName?: boolean;
    confirmationMessage?: string;
  } | null;
  branding: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    organizationName?: string;
  } | null;
  questions: Array<{
    id: number;
    question: string;
    questionType: QuestionType;
    description?: string | null;
    required: boolean;
    options?: string[] | null;
  }>;
}

export default function PublicForm({ formType }: PublicFormProps) {
  // Extract publicId from URL path since we're not using wouter Route with params
  // URLs are /f/{publicId} for forms and /s/{publicId} for surveys
  const pathPrefix = formType === 'survey' ? '/s/' : '/f/';
  const pathname = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
  const segments = pathname.split('/');
  // The publicId is the last segment after /f/ or /s/
  const publicId = segments.length >= 2 && pathname.startsWith(pathPrefix.slice(0, -1)) 
    ? segments[segments.length - 1] 
    : '';
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [respondentEmail, setRespondentEmail] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>({});
  const [respondentEmailError, setRespondentEmailError] = useState<string>("");

  const { data: formResponse, isLoading, error } = useQuery<{ data: PublicFormData }>({
    queryKey: ["/api/public/forms", publicId],
    queryFn: async () => {
      const response = await fetch(`/api/public/forms/${publicId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to load form");
      }
      return response.json();
    },
  });

  const form = formResponse?.data;
  const questions = form?.questions || [];
  const settings = form?.settings || {};
  const branding = form?.branding || {};
  const isSurvey = formType === 'survey';

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/public/forms/${publicId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSubmitted(true);
      setConfirmationMessage(data.message || settings.confirmationMessage || "Thank you for your submission!");
    },
  });

  // Validation patterns
  const validateInput = (type: QuestionType, value: string): string | null => {
    if (!value) return null; // Empty values are handled by required validation
    
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return "Please enter a valid email address";
        }
        break;
      case 'phone':
        // Allow digits, spaces, dashes, parentheses, and plus sign
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 7) {
          return "Please enter a valid phone number";
        }
        break;
      case 'number':
        if (isNaN(Number(value))) {
          return "Please enter a valid number";
        }
        break;
      case 'date':
        if (value && isNaN(Date.parse(value))) {
          return "Please enter a valid date";
        }
        break;
    }
    return null;
  };

  const handleAnswer = (questionId: number, value: any, questionType?: QuestionType) => {
    setAnswers({ ...answers, [questionId]: value });
    
    // Validate and clear/set error
    if (questionType && typeof value === 'string') {
      const error = validateInput(questionType, value);
      if (error) {
        setValidationErrors({ ...validationErrors, [questionId]: error });
      } else {
        const newErrors = { ...validationErrors };
        delete newErrors[questionId];
        setValidationErrors(newErrors);
      }
    }
  };

  const handleFileUpload = async (questionId: number, file: File) => {
    setUploadingFiles({ ...uploadingFiles, [questionId]: true });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('formPublicId', publicId);
      formData.append('questionId', questionId.toString());
      
      const response = await fetch('/api/public/forms/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      handleAnswer(questionId, {
        fileName: file.name,
        fileUrl: result.url,
        fileSize: file.size,
        fileType: file.type,
      });
    } catch (error) {
      setValidationErrors({ 
        ...validationErrors, 
        [questionId]: 'File upload failed. Please try again.' 
      });
    } finally {
      setUploadingFiles({ ...uploadingFiles, [questionId]: false });
    }
  };

  const handleMultipleChoiceToggle = (questionId: number, option: string) => {
    const current = answers[questionId] || [];
    const updated = current.includes(option)
      ? current.filter((o: string) => o !== option)
      : [...current, option];
    setAnswers({ ...answers, [questionId]: updated });
  };

  const validateCurrentQuestion = (): boolean => {
    if (isSurvey && settings.showProgressBar && currentQuestionIndex < questions.length) {
      const question = questions[currentQuestionIndex];
      if (question.required) {
        const answer = answers[question.id];
        if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) {
          return false;
        }
      }
    }
    return true;
  };

  const validateRespondentEmail = (email: string): string | null => {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const handleRespondentEmailChange = (email: string) => {
    setRespondentEmail(email);
    const error = validateRespondentEmail(email);
    setRespondentEmailError(error || "");
  };

  const validateForm = (): boolean => {
    // Check if there are any validation errors
    if (Object.keys(validationErrors).length > 0) return false;
    if (respondentEmailError) return false;
    
    // Check required contact info (only for forms, not surveys - surveys are anonymous)
    if (!isSurvey) {
      if (settings.collectEmail && !respondentEmail) return false;
      if (settings.collectName && !respondentName) return false;
      
      // Validate email format if collected
      if (settings.collectEmail && respondentEmail) {
        const emailError = validateRespondentEmail(respondentEmail);
        if (emailError) return false;
      }
    }

    // Check all required questions and validate field-specific formats
    for (const question of questions) {
      const answer = answers[question.id];
      
      // Check required
      if (question.required) {
        if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) {
          return false;
        }
      }
      
      // Validate format if there's a value
      if (answer && typeof answer === 'string') {
        const error = validateInput(question.questionType, answer);
        if (error) return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    submitMutation.mutate({
      answers,
      respondentEmail: respondentEmail || undefined,
      respondentName: respondentName || undefined,
    });
  };

  const progress = questions.length > 0 
    ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading {formType}...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Form Unavailable</h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "This form is not available."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">{confirmationMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderQuestionInput = (question: PublicFormData['questions'][0]) => {
    const value = answers[question.id];
    const error = validationErrors[question.id];
    
    const renderError = () => error ? (
      <p className="text-sm text-destructive mt-1">{error}</p>
    ) : null;
    
    switch (question.questionType) {
      case 'short_text':
        return (
          <>
            <Input
              placeholder="Your answer..."
              value={value || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              data-testid={`input-question-${question.id}`}
            />
            {renderError()}
          </>
        );
      
      case 'long_text':
        return (
          <>
            <Textarea
              placeholder="Your answer..."
              value={value || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              className="min-h-[100px]"
              data-testid={`textarea-question-${question.id}`}
            />
            {renderError()}
          </>
        );
      
      case 'single_choice':
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(v) => handleAnswer(question.id, v)}
            className="space-y-2"
          >
            {(question.options || []).map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`q${question.id}-o${index}`} />
                <Label htmlFor={`q${question.id}-o${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {(question.options || []).map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`q${question.id}-o${index}`}
                  checked={(value || []).includes(option)}
                  onCheckedChange={() => handleMultipleChoiceToggle(question.id, option)}
                />
                <Label htmlFor={`q${question.id}-o${index}`}>{option}</Label>
              </div>
            ))}
          </div>
        );
      
      case 'dropdown':
        return (
          <Select value={value || ""} onValueChange={(v) => handleAnswer(question.id, v)}>
            <SelectTrigger data-testid={`select-question-${question.id}`}>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {(question.options || []).map((option, index) => (
                <SelectItem key={index} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'rating':
        return (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant={value === rating ? "default" : "outline"}
                size="lg"
                className="w-12 h-12"
                onClick={() => handleAnswer(question.id, rating)}
                data-testid={`button-rating-${question.id}-${rating}`}
              >
                {rating}
              </Button>
            ))}
          </div>
        );
      
      case 'date':
        return (
          <>
            <Input
              type="date"
              value={value || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value, 'date')}
              data-testid={`input-date-${question.id}`}
            />
            {renderError()}
          </>
        );
      
      case 'email':
        return (
          <>
            <Input
              type="email"
              placeholder="email@example.com"
              value={value || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value, 'email')}
              className={error ? "border-destructive" : ""}
              data-testid={`input-email-${question.id}`}
            />
            {renderError()}
          </>
        );
      
      case 'phone':
        return (
          <>
            <Input
              type="tel"
              placeholder="(555) 555-5555"
              value={value || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value, 'phone')}
              className={error ? "border-destructive" : ""}
              data-testid={`input-phone-${question.id}`}
            />
            {renderError()}
          </>
        );
      
      case 'number':
        return (
          <>
            <Input
              type="number"
              placeholder="0"
              value={value || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value, 'number')}
              className={error ? "border-destructive" : ""}
              data-testid={`input-number-${question.id}`}
            />
            {renderError()}
          </>
        );
      
      case 'file_upload':
        return (
          <div className="space-y-2">
            {value?.fileName ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">{value.fileName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAnswer(question.id, null)}
                  className="ml-auto"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md p-6 text-center">
                <input
                  type="file"
                  id={`file-${question.id}`}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(question.id, file);
                    }
                  }}
                  data-testid={`input-file-${question.id}`}
                />
                <label 
                  htmlFor={`file-${question.id}`}
                  className="cursor-pointer"
                >
                  {uploadingFiles[question.id] ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-muted-foreground">Click to upload a file</p>
                      <p className="text-xs text-muted-foreground mt-1">Max file size: 10MB</p>
                    </>
                  )}
                </label>
              </div>
            )}
            {renderError()}
          </div>
        );
      
      default:
        return (
          <>
            <Input
              placeholder="Your answer..."
              value={value || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
            />
            {renderError()}
          </>
        );
    }
  };

  return (
    <div 
      className="min-h-screen bg-background py-8 px-4"
      style={{
        fontFamily: branding.fontFamily || undefined,
      }}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {branding.logoUrl && (
          <div className="flex justify-center">
            <img 
              src={branding.logoUrl} 
              alt={branding.organizationName || "Organization"} 
              className="max-h-16 object-contain"
            />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="text-base">{form.description}</CardDescription>
            )}
            {branding.organizationName && (
              <p className="text-sm text-muted-foreground">By {branding.organizationName}</p>
            )}
          </CardHeader>

          {isSurvey && settings.showProgressBar && (
            <CardContent className="pb-0">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </CardContent>
          )}
        </Card>

        {(settings.collectName || settings.collectEmail) && !isSurvey && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.collectName && (
                <div className="space-y-2">
                  <Label htmlFor="respondent-name">Name *</Label>
                  <Input
                    id="respondent-name"
                    placeholder="Your name"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    data-testid="input-respondent-name"
                  />
                </div>
              )}
              {settings.collectEmail && (
                <div className="space-y-2">
                  <Label htmlFor="respondent-email">Email *</Label>
                  <Input
                    id="respondent-email"
                    type="email"
                    placeholder="your@email.com"
                    value={respondentEmail}
                    onChange={(e) => handleRespondentEmailChange(e.target.value)}
                    className={respondentEmailError ? "border-destructive" : ""}
                    data-testid="input-respondent-email"
                  />
                  {respondentEmailError && (
                    <p className="text-sm text-destructive">{respondentEmailError}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isSurvey && settings.showProgressBar ? (
          questions.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-medium">
                      {questions[currentQuestionIndex].question}
                      {questions[currentQuestionIndex].required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    {questions[currentQuestionIndex].description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {questions[currentQuestionIndex].description}
                      </p>
                    )}
                  </div>
                  {renderQuestionInput(questions[currentQuestionIndex])}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => {
                      if (validateCurrentQuestion()) {
                        setCurrentQuestionIndex(currentQuestionIndex + 1);
                      }
                    }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending || !validateForm()}
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="pt-6 space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <div>
                    <Label className="text-base font-medium">
                      {index + 1}. {question.question}
                      {question.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    {question.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {question.description}
                      </p>
                    )}
                  </div>
                  {renderQuestionInput(question)}
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitMutation.isPending || !validateForm()}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {submitMutation.error && (
          <div className="text-center text-destructive">
            {submitMutation.error instanceof Error 
              ? submitMutation.error.message 
              : "Failed to submit. Please try again."}
          </div>
        )}
      </div>
    </div>
  );
}
