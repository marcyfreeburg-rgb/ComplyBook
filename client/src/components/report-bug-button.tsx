import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";

export function ReportBugButton() {
  const [location, setLocation] = useLocation();

  if (location === "/bug-report") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="destructive"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => setLocation("/bug-report")}
            data-testid="button-report-bug-fab"
          >
            <Bug className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Report a Bug</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
