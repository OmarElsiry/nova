import React from 'react';
import { cn } from '@/lib/utils';

interface GiftCounterProps {
  count: number;
  className?: string;
}

const GiftCounter: React.FC<GiftCounterProps> = ({ count, className }) => {
  if (count <= 1) return null;

  return (
    <div className={cn(
      "absolute -top-1 -right-1 bg-primary text-primary-foreground",
      "rounded-full min-w-[18px] h-[18px] flex items-center justify-center",
      "text-xs font-bold border-2 border-background",
      "shadow-sm z-10",
      className
    )}>
      {count > 99 ? '99+' : count}
    </div>
  );
};

export default GiftCounter;