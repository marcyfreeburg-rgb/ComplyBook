import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Key, AlertTriangle, Loader2 } from "lucide-react";

type MfaLoginStatus = {
  mfaPending: boolean;
  mfaVerified: boolean;
  backupCodesRemaining: number;
  userId: string;
};

export default function MfaVerify() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const { data: mfaStatus, isLoading: statusLoading, error: statusError } = useQuery<MfaLoginStatus>({
    queryKey: ['/api/auth/mfa/login-status'],
    retry: false,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ code, isBackupCode }: { code: string; isBackupCode: boolean }) => {
      const response = await apiRequest('/api/auth/mfa/verify-login', {
        method: 'POST',
        body: JSON.stringify({ code, isBackupCode }),
        headers: { 'Content-Type': 'application/json' },
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/mfa/login-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      if (data.remainingBackupCodes !== undefined && data.remainingBackupCodes < 3) {
        toast({
          title: "Low backup codes",
          description: `You have ${data.remainingBackupCodes} backup codes remaining. Consider regenerating them.`,
          variant: "default",
        });
      }
      
      toast({
        title: "Verification successful",
        description: "You have been logged in.",
      });
      
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\s/g, '');
    
    if (!cleanCode) {
      toast({
        title: "Code required",
        description: "Please enter your verification code.",
        variant: "destructive",
      });
      return;
    }
    
    verifyMutation.mutate({ code: cleanCode, isBackupCode: useBackupCode });
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (statusError || !mfaStatus?.mfaPending) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle data-testid="text-mfa-verify-title">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the verification code from your authenticator app to complete login.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!useBackupCode ? (
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoComplete="one-time-code"
                  autoFocus
                  data-testid="input-mfa-code"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Open your authenticator app to view your code
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="backup-code">Backup Code</Label>
                <Input
                  id="backup-code"
                  type="text"
                  maxLength={10}
                  placeholder="XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-center text-lg tracking-widest font-mono"
                  autoFocus
                  data-testid="input-backup-code"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Enter one of your backup codes
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={verifyMutation.isPending || !code}
              data-testid="button-verify-mfa"
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify and Continue"
              )}
            </Button>

            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setCode("");
                }}
                data-testid="button-toggle-backup-code"
              >
                <Key className="mr-2 h-4 w-4" />
                {useBackupCode ? "Use authenticator app instead" : "Use a backup code"}
              </Button>
            </div>

            {useBackupCode && mfaStatus.backupCodesRemaining !== undefined && mfaStatus.backupCodesRemaining < 5 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have {mfaStatus.backupCodesRemaining} backup codes remaining.
                  {mfaStatus.backupCodesRemaining === 0 && " You will need to contact support if you lose access to your authenticator."}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
