import React from 'react';
import { cn } from '@/lib/utils';

interface TonIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const TonIcon: React.FC<TonIconProps> = ({ className, size = 'sm' }) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <img
      src="/lovable-uploads/ddcdf86c-f1e9-4623-9b5f-cbe979aa6250.png"
      alt="Toncoin"
      className={cn(
        "flex-shrink-0 object-contain",
        sizeClasses[size],
        className
      )}
    />
  );
};

export default TonIcon;