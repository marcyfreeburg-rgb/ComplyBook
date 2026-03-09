import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import complyBookLogo from "@assets/COmplybook_1765050943685.png";
import { Check } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<"replit" | "local" | null>(null);
  const [view, setView] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const signupParam = params.get("signup");

    if (signupParam === "true") {
      setView("register");
    }

    if (errorParam) {
      setAuthMode("local");
      toast({
        title: "Sign up blocked",
        description: errorParam,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/login");
      return;
    }

    fetch("/api/auth/mode")
      .then((res) => res.json())
      .then((data) => {
        setAuthMode(data.mode);
        if (data.mode === "replit") {
          window.location.href = "/api/login";
        }
      })
      .catch(() => {
        setAuthMode("replit");
        window.location.href = "/api/login";
      });
  }, []);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/login", { email, password });
      const data = await response.json();
      
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        if (data.mfaRequired) {
          if (data.mfaSetupRequired) {
            setLocation("/mfa-setup-login");
          } else {
            setLocation("/mfa-verify");
          }
        } else {
          toast({
            title: "Login successful",
            description: "Welcome back!",
          });
          setLocation("/");
        }
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
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
      const response = await apiRequest("POST", "/api/register", {
        email,
        password,
        firstName,
        lastName,
        organizationName: organizationName || undefined,
      });
      const data = await response.json();
      
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        if (data.autoLoginFailed) {
          toast({
            title: "Account created",
            description: "Please sign in with your new credentials.",
          });
          setView("login");
        } else {
          toast({
            title: "Account created",
            description: "Welcome to ComplyBook!",
          });
          setLocation("/");
        }
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Unable to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/forgot-password", { email });
      const data = await response.json();

      if (data.success) {
        setForgotEmailSent(true);
        toast({
          title: "Check your email",
          description: "If an account exists with that email, we've sent a reset link.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authMode === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (authMode === "replit") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Redirecting to login...</div>
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
        {view === "login" ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot");
                        setPassword("");
                        setForgotEmailSent(false);
                      }}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-login-submit"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView("register");
                      setEmail("");
                      setPassword("");
                    }}
                    className="text-primary underline-offset-4 hover:underline font-medium"
                    data-testid="link-switch-to-register"
                  >
                    Create one
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : view === "forgot" ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>
                {forgotEmailSent
                  ? "Check your inbox for a password reset link"
                  : "Enter your email and we'll send you a reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forgotEmailSent ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    If an account exists with that email address, you'll receive a password reset link shortly. Check your spam folder if you don't see it.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setView("login");
                      setForgotEmailSent(false);
                    }}
                    data-testid="button-back-to-login"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-forgot-email"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-send-reset"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              )}
              {!forgotEmailSent && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Remember your password?{" "}
                    <button
                      type="button"
                      onClick={() => setView("login")}
                      className="text-primary underline-offset-4 hover:underline font-medium"
                      data-testid="link-back-to-login-from-forgot"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create Your Account</CardTitle>
              <CardDescription>
                Start managing your organization's finances today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Smith"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@yourorganization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    data-testid="input-register-password"
                  />
                  <PasswordRequirements password={password} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                  <Input
                    id="reg-confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    data-testid="input-confirm-password"
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
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Your nonprofit or organization"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    data-testid="input-organization-name"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-register-submit"
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setEmail("");
                      setPassword("");
                      setConfirmPassword("");
                      setFirstName("");
                      setLastName("");
                      setOrganizationName("");
                    }}
                    className="text-primary underline-offset-4 hover:underline font-medium"
                    data-testid="link-switch-to-login"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t border-border py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ComplyBook. Simple financial management for small organizations.</p>
        </div>
      </footer>
    </div>
  );
}

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
          data-testid={`text-password-req-${req.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
        >
          <Check className={`h-3 w-3 ${req.met ? "opacity-100" : "opacity-0"}`} />
          {req.label}
        </span>
      ))}
    </div>
  );
}
