import { ReactNode } from "react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-6 text-6xl opacity-60">
        {icon}
      </div>
      
      <h3 className="text-lg font-medium text-text-primary mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-text-muted text-sm leading-relaxed mb-6 max-w-sm">
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick} className="gap-2">
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;