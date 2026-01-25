import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function InvoicePaid() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Payment Successful!
          </h1>
          
          <p className="text-muted-foreground mb-4">
            Thank you for your payment. A confirmation has been sent to your email.
          </p>
          
          <p className="text-sm text-muted-foreground">
            You may now close this tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
