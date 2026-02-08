import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bug, Upload, X, CheckCircle, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function BugReport() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    deviceInfo: "",
    appVersion: "",
    errorTimestamp: new Date().toISOString().slice(0, 16),
    errorMessage: "",
    stepsToReproduce: "",
    additionalComments: "",
    pageUrl: window.location.href,
    browserInfo: navigator.userAgent,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("stepsToReproduce", formData.stepsToReproduce);
      form.append("pageUrl", formData.pageUrl);
      form.append("browserInfo", formData.browserInfo);

      if (formData.deviceInfo) form.append("deviceInfo", formData.deviceInfo);
      if (formData.appVersion) form.append("appVersion", formData.appVersion);
      if (formData.errorTimestamp) form.append("errorTimestamp", formData.errorTimestamp);
      if (formData.errorMessage) form.append("errorMessage", formData.errorMessage);
      if (formData.additionalComments) form.append("additionalComments", formData.additionalComments);
      if (screenshotFile) form.append("screenshot", screenshotFile);

      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrf_token="))
        ?.split("=")[1];

      const res = await fetch("/api/bug-reports", {
        method: "POST",
        body: form,
        credentials: "include",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit bug report");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Bug report submitted",
        description: "Thank you for your feedback! Our team has been notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  function removeScreenshot() {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.stepsToReproduce.trim()) {
      toast({
        title: "Missing information",
        description: "Please describe what you were doing when the error happened.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2" data-testid="text-success-title">Bug Report Submitted</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for helping us improve! Our team has been notified and will review your report.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setSubmitted(false)} data-testid="button-submit-another">
                Submit Another Report
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back-dashboard">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-go-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <Bug className="w-6 h-6" />
            Report a Bug
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Help us improve by reporting any issues you encounter. Include as much detail as possible.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Device & Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceInfo">Device / Platform</Label>
                <Input
                  id="deviceInfo"
                  data-testid="input-device-info"
                  placeholder="e.g., Windows 11, Chrome"
                  value={formData.deviceInfo}
                  onChange={(e) => setFormData({ ...formData, deviceInfo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appVersion">App Version (if known)</Label>
                <Input
                  id="appVersion"
                  data-testid="input-app-version"
                  placeholder="e.g., v1.0.3"
                  value={formData.appVersion}
                  onChange={(e) => setFormData({ ...formData, appVersion: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="errorTimestamp">When did the error happen?</Label>
              <Input
                id="errorTimestamp"
                data-testid="input-error-timestamp"
                type="datetime-local"
                value={formData.errorTimestamp}
                onChange={(e) => setFormData({ ...formData, errorTimestamp: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Error Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="errorMessage">Error Message or Code (if any)</Label>
              <Input
                id="errorMessage"
                data-testid="input-error-message"
                placeholder="e.g., ERR_BUDGET_CALC_404 or paste error text"
                value={formData.errorMessage}
                onChange={(e) => setFormData({ ...formData, errorMessage: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stepsToReproduce">
                What were you doing when the error happened? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="stepsToReproduce"
                data-testid="input-steps-to-reproduce"
                placeholder="Describe the steps you took. For example: 'I was adding a new expense, entered $50 for groceries, and clicked save. Then the screen showed an error.'"
                value={formData.stepsToReproduce}
                onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Screenshot</CardTitle>
          </CardHeader>
          <CardContent>
            {screenshotPreview ? (
              <div className="relative">
                <img
                  src={screenshotPreview}
                  alt="Screenshot preview"
                  className="max-h-64 rounded-md border object-contain w-full"
                  data-testid="img-screenshot-preview"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeScreenshot}
                  data-testid="button-remove-screenshot"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover-elevate transition-colors"
                onClick={() => fileInputRef.current?.click()}
                data-testid="area-screenshot-upload"
              >
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload a screenshot (PNG, JPG - max 10MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScreenshotChange}
              data-testid="input-screenshot-file"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              data-testid="input-additional-comments"
              placeholder="Any extra details, how often it happens, or suggestions for improvement..."
              value={formData.additionalComments}
              onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
              className="min-h-[80px]"
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitMutation.isPending}
            data-testid="button-submit-report"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Bug Report"}
          </Button>
        </div>
      </form>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Your data will only be used for debugging and improving the app. We respect your privacy.
      </p>
    </div>
  );
}
