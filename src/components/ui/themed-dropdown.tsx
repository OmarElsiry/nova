import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownOption {
  value: string;
  label: string;
}

interface ThemedDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const ThemedDropdown: React.FC<ThemedDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  className,
  id,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If not enough space below and more space above, show on top
      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <div 
        className={cn(
          "bg-card border border-border rounded-xl px-3 py-2 h-12 flex flex-col justify-center transition-all duration-200",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          isOpen && !disabled && "border-primary shadow-sm shadow-primary/10"
        )}
        onClick={handleToggle}
        id={id}
      >
        <div className="text-xs font-medium text-text-muted leading-none mb-0.5">{label}</div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary leading-none truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            className={cn(
              "w-4 h-4 text-text-muted transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          <style>{`
            @keyframes slideInDown {
              from {
                opacity: 0;
                transform: translateY(-8px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            
            @keyframes slideInUp {
              from {
                opacity: 0;
                transform: translateY(8px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
          <div 
            className={cn(
              "absolute left-0 right-0 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden transition-all duration-200 dropdown-enter theme-shadow",
              dropdownPosition === 'top' ? "bottom-full mb-1" : "top-full mt-1"
            )}
            style={{
              animation: dropdownPosition === 'top' 
                ? 'slideInUp 200ms ease-out' 
                : 'slideInDown 200ms ease-out'
            }}
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "px-3 py-2.5 cursor-pointer transition-colors duration-150 flex items-center justify-between",
                      "hover:bg-accent hover:text-accent-foreground"
                    )}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="text-sm font-medium truncate">{option.label}</span>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};