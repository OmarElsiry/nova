import { ReactNode } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./alert-dialog";

interface ConfirmationDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
}

const ConfirmationDialog = ({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default"
}: ConfirmationDialogProps) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-sm mx-auto rounded-xl bg-surface border-border theme-shadow backdrop-blur-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-text-primary">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-text-muted">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 pt-4">
          <AlertDialogCancel className="flex-1 bg-gradient-to-r from-muted to-muted/80 hover:from-muted/90 hover:to-muted/70 transition-all duration-200">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={variant === "destructive" 
              ? "flex-1 bg-gradient-to-r from-danger to-danger/90 text-danger-foreground hover:from-danger/90 hover:to-danger/80 transition-all duration-200" 
              : "flex-1 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground hover:from-primary/90 hover:to-primary-hover/90 transition-all duration-200"
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;