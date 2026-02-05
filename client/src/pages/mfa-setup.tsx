import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, ShieldOff, Copy, Check, AlertTriangle, Key, RefreshCw, ArrowLeft, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Organization } from "@shared/schema";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface MfaStatus {
  mfaEnabled: boolean;
  mfaRequired: boolean;
  mfaGracePeriodEnd: string | null;
  mfaVerifiedAt: string | null;
  gracePeriodExpired: boolean;
  daysRemaining: number | null;
  backupCodesRemaining: number;
}

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

interface MfaSetupProps {
  currentOrganization: Organization & { userRole: string };
  user: User;
}

export default function MfaSetup({ currentOrganization, user }: MfaSetupProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"status" | "setup" | "verify" | "backup" | "disable">("status");
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState("");
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState("");

  const { data: mfaStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<MfaStatus>({
    queryKey: ['/api/security/mfa/status'],
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/security/mfa/setup');
      return await response.json() as SetupResponse;
    },
    onSuccess: (data) => {
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

  const verifySetupMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/security/mfa/verify-setup', { code });
      return await response.json() as VerifySetupResponse;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep("backup");
      queryClient.invalidateQueries({ queryKey: ['/api/security/mfa/status'] });
      toast({
        title: "MFA Enabled",
        description: "Multi-factor authentication has been enabled for your account",
      });
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

  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/security/mfa/disable', { code });
      return await response.json();
    },
    onSuccess: () => {
      setIsDisableDialogOpen(false);
      setDisableCode("");
      setStep("status");
      queryClient.invalidateQueries({ queryKey: ['/api/security/mfa/status'] });
      toast({
        title: "MFA Disabled",
        description: "Multi-factor authentication has been disabled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Disable",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
      setDisableCode("");
    },
  });

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/security/mfa/regenerate-backup-codes', { code });
      return await response.json() as { success: boolean; backupCodes: string[] };
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setIsRegenerateDialogOpen(false);
      setRegenerateCode("");
      setStep("backup");
      queryClient.invalidateQueries({ queryKey: ['/api/security/mfa/status'] });
      toast({
        title: "Backup Codes Regenerated",
        description: "Your old backup codes are no longer valid",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Regenerate",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
      setRegenerateCode("");
    },
  });

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard",
    });
  };

  const handleVerificationComplete = (value: string) => {
    setVerificationCode(value);
    if (value.length === 6) {
      verifySetupMutation.mutate(value);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="sm" data-testid="button-back-settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Multi-Factor Authentication
        </h1>
        <p className="text-muted-foreground mt-2">
          Add an extra layer of security to your account using an authenticator app
        </p>
      </div>

      {step === "status" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mfaStatus?.mfaEnabled ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  MFA is Enabled
                </>
              ) : (
                <>
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                  MFA is Not Enabled
                </>
              )}
            </CardTitle>
            <CardDescription>
              {mfaStatus?.mfaEnabled
                ? "Your account is protected with multi-factor authentication"
                : "Enable MFA to add an extra layer of security to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {mfaStatus?.mfaRequired && !mfaStatus?.mfaEnabled && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>MFA Required</AlertTitle>
                <AlertDescription>
                  {mfaStatus.gracePeriodExpired
                    ? "Your grace period has expired. Please set up MFA immediately to regain access to administrative functions."
                    : `You have ${mfaStatus.daysRemaining ?? 0} day${mfaStatus.daysRemaining !== 1 ? 's' : ''} remaining to set up MFA.`}
                </AlertDescription>
              </Alert>
            )}

            {mfaStatus?.mfaEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Backup Codes</p>
                      <p className="text-sm text-muted-foreground">
                        {mfaStatus.backupCodesRemaining} codes remaining
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRegenerateDialogOpen(true)}
                    data-testid="button-regenerate-codes"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>

                {mfaStatus.backupCodesRemaining <= 3 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Low Backup Codes</AlertTitle>
                    <AlertDescription>
                      You have only {mfaStatus.backupCodesRemaining} backup codes left. Consider regenerating new codes.
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-destructive">Disable MFA</p>
                    <p className="text-sm text-muted-foreground">
                      Remove multi-factor authentication from your account
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDisableDialogOpen(true)}
                    data-testid="button-disable-mfa"
                  >
                    Disable MFA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Before you begin
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    You'll need an authenticator app on your phone, such as:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                    <li>Google Authenticator</li>
                    <li>Microsoft Authenticator</li>
                    <li>Authy</li>
                    <li>1Password</li>
                  </ul>
                </div>

                <Button
                  onClick={() => setupMutation.mutate()}
                  disabled={setupMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-setup-mfa"
                >
                  {setupMutation.isPending ? "Setting up..." : "Set Up MFA"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "setup" && setupData && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Scan QR Code</CardTitle>
            <CardDescription>
              Open your authenticator app and scan the QR code below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg">
                <img
                  src={setupData.qrCode}
                  alt="MFA QR Code"
                  className="w-64 h-64"
                  data-testid="img-qr-code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Or enter this code manually:
              </Label>
              <div className="p-3 bg-muted rounded-lg font-mono text-center text-sm break-all">
                {setupData.secret}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <Label htmlFor="verification-code">Step 2: Enter Verification Code</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={handleVerificationComplete}
                  disabled={verifySetupMutation.isPending}
                  data-testid="input-otp-verify"
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

              {verifySetupMutation.isPending && (
                <p className="text-center text-sm text-muted-foreground">
                  Verifying...
                </p>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setStep("status");
                setSetupData(null);
                setVerificationCode("");
              }}
              className="w-full"
              data-testid="button-cancel-setup"
            >
              Cancel Setup
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "backup" && backupCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Save Your Backup Codes
            </CardTitle>
            <CardDescription>
              Store these codes in a safe place. Each code can only be used once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                These codes won't be shown again. Save them now in a secure location.
                You can use them to access your account if you lose your phone.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="p-2 bg-background rounded text-center"
                  data-testid={`text-backup-code-${index}`}
                >
                  {code}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={copyBackupCodes}
              className="w-full"
              data-testid="button-copy-codes"
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
              onClick={() => {
                setStep("status");
                setBackupCodes([]);
                refetchStatus();
              }}
              className="w-full"
              data-testid="button-done"
            >
              I've Saved My Codes
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDisableDialogOpen} onOpenChange={setIsDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Multi-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current authenticator code to disable MFA.
              This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <InputOTP
              maxLength={6}
              value={disableCode}
              onChange={setDisableCode}
              disabled={disableMutation.isPending}
              data-testid="input-otp-disable"
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDisableDialogOpen(false);
                setDisableCode("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate(disableCode)}
              disabled={disableCode.length !== 6 || disableMutation.isPending}
              data-testid="button-confirm-disable"
            >
              {disableMutation.isPending ? "Disabling..." : "Disable MFA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegenerateDialogOpen} onOpenChange={setIsRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              Enter your current authenticator code to generate new backup codes.
              Your old backup codes will be invalidated.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <InputOTP
              maxLength={6}
              value={regenerateCode}
              onChange={setRegenerateCode}
              disabled={regenerateBackupCodesMutation.isPending}
              data-testid="input-otp-regenerate"
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRegenerateDialogOpen(false);
                setRegenerateCode("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => regenerateBackupCodesMutation.mutate(regenerateCode)}
              disabled={regenerateCode.length !== 6 || regenerateBackupCodesMutation.isPending}
              data-testid="button-confirm-regenerate"
            >
              {regenerateBackupCodesMutation.isPending ? "Regenerating..." : "Regenerate Codes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
