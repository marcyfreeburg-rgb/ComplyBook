import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import complyBookLogo from "@assets/COmplybook_1765050943685.png";
import { Check, ArrowLeft } from "lucide-react";

function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
      {requirements.map((req) => (
        <span
          key={req.label}
          className={`text-xs flex items-center gap-1 ${req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
        >
          <Check className={`h-3 w-3 ${req.met ? "opacity-100" : "opacity-0"}`} />
          {req.label}
        </span>
      ))}
    </div>
  );
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/reset-password", {
        token,
        password,
      });
      const data = await response.json();

      if (data.success) {
        setIsComplete(true);
        toast({
          title: "Password reset",
          description: "Your password has been updated successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Unable to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation("/")} data-testid="link-home">
              <img src={complyBookLogo} alt="ComplyBook" className="h-10 w-10 rounded object-cover" />
              <span className="text-xl font-semibold text-foreground">ComplyBook</span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Invalid Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => setLocation("/login")} data-testid="button-back-to-login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation("/")} data-testid="link-home">
            <img src={complyBookLogo} alt="ComplyBook" className="h-10 w-10 rounded object-cover" />
            <span className="text-xl font-semibold text-foreground">ComplyBook</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          {isComplete ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Password Reset</CardTitle>
                <CardDescription>
                  Your password has been updated successfully.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button onClick={() => setLocation("/login")} data-testid="button-go-to-login">
                  Sign In with New Password
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Set New Password</CardTitle>
                <CardDescription>
                  Choose a new password for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-new-password"
                    />
                    <PasswordRequirements password={password} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-confirm-new-password"
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                    {confirmPassword && password === confirmPassword && confirmPassword.length >= 8 && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Passwords match
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-reset-password"
                  >
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                    data-testid="link-back-to-login"
                  >
                    <ArrowLeft className="inline h-3 w-3 mr-1" />
                    Back to Sign In
                  </button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </main>

      <footer className="border-t border-border py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ComplyBook. Simple financial management for small organizations.</p>
        </div>
      </footer>
    </div>
  );
}
