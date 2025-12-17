import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, Copy, Check, AlertTriangle, Smartphone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ThemeToggle } from "@/components/theme-toggle";
import complyBookLogo from "@assets/COmplybook_1765050943685.png";

interface SetupResponse {
  secret: string;
  qrCode: string;
  message: string;
}

interface VerifySetupResponse {
  success: boolean;
  backupCodes: string[];
  message: string;
}

export default function MfaSetupLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"intro" | "setup" | "verify" | "backup">("intro");
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const { data: mfaStatus, isLoading: statusLoading } = useQuery<{
    mfaEnabled: boolean;
    mfaRequired: boolean;
  }>({
    queryKey: ['/api/security/mfa/status'],
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/security/mfa/setup');
      return response.json();
    },
    onSuccess: (data: SetupResponse) => {
      setSetupData(data);
      setStep("setup");
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to start MFA setup",
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/security/mfa/verify-setup', { code });
      return response.json();
    },
    onSuccess: (data: VerifySetupResponse) => {
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setStep("backup");
        queryClient.invalidateQueries({ queryKey: ['/api/security/mfa/status'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
      setVerificationCode("");
    },
  });

  const handleStartSetup = () => {
    setupMutation.mutate();
  };

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      verifyMutation.mutate(verificationCode);
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard",
    });
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleComplete = () => {
    toast({
      title: "MFA Enabled",
      description: "Your account is now protected with two-factor authentication.",
    });
    setLocation("/");
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (mfaStatus?.mfaEnabled) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={complyBookLogo} alt="ComplyBook" className="h-10 w-10 rounded object-cover" />
            <span className="text-xl font-semibold text-foreground">ComplyBook</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          {step === "intro" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Set Up Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Your organization requires two-factor authentication for added security.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Required Setup</AlertTitle>
                  <AlertDescription>
                    You must complete MFA setup to continue using your account.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>You will need an authenticator app such as:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Google Authenticator</li>
                    <li>Microsoft Authenticator</li>
                    <li>Authy</li>
                  </ul>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleStartSetup}
                  disabled={setupMutation.isPending}
                  data-testid="button-start-mfa-setup"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  {setupMutation.isPending ? "Starting..." : "Start Setup"}
                </Button>
              </CardContent>
            </>
          )}

          {step === "setup" && setupData && (
            <>
              <CardHeader className="text-center">
                <CardTitle>Scan QR Code</CardTitle>
                <CardDescription>
                  Scan this QR code with your authenticator app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <img 
                    src={setupData.qrCode} 
                    alt="MFA QR Code" 
                    className="w-48 h-48 border rounded-lg"
                    data-testid="img-mfa-qrcode"
                  />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Or enter this code manually:
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                    {setupData.secret}
                  </code>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => setStep("verify")}
                  data-testid="button-continue-to-verify"
                >
                  Continue
                </Button>
              </CardContent>
            </>
          )}

          {step === "verify" && (
            <>
              <CardHeader className="text-center">
                <CardTitle>Verify Code</CardTitle>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                    data-testid="input-mfa-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep("setup")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleVerify}
                    disabled={verificationCode.length !== 6 || verifyMutation.isPending}
                    data-testid="button-verify-mfa"
                  >
                    {verifyMutation.isPending ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === "backup" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 dark:bg-green-900">
                  <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Save Your Backup Codes</CardTitle>
                <CardDescription>
                  Store these codes safely. You can use them if you lose access to your authenticator.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Save these codes now. You won't be able to see them again.
                  </AlertDescription>
                </Alert>
                
                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="p-2 bg-background rounded text-center">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleCopyBackupCodes}
                  data-testid="button-copy-backup-codes"
                >
                  {copiedCodes ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy All Codes
                    </>
                  )}
                </Button>
                
                <Button 
                  className="w-full"
                  onClick={handleComplete}
                  data-testid="button-complete-mfa-setup"
                >
                  I've Saved My Codes - Continue
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
