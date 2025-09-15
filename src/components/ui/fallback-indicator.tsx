import { AlertCircle, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Alert, AlertDescription } from "./alert";

interface FallbackIndicatorProps {
  onDismiss?: () => void;
}

export const FallbackIndicator = ({ onDismiss }: FallbackIndicatorProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <Alert className="mx-4 mt-4 border-warning/20 bg-warning/5">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="text-sm text-foreground">
            تعمل حالياً في وضع التصفح العادي. للحصول على التجربة الكاملة، افتح الرابط في تطبيق تيليجرام.
          </span>
        </div>
        <div className="flex items-center gap-2 mr-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://t.me/your_bot_username', '_blank')}
            className="text-xs"
          >
            <ExternalLink className="h-3 w-3 ml-1" />
            افتح في تيليجرام
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="p-1 h-auto"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};