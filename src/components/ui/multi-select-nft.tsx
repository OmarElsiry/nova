import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface NFTOption {
  value: string;
  label: string;
}

interface MultiSelectNFTProps {
  options: NFTOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MultiSelectNFT: React.FC<MultiSelectNFTProps> = ({
  options,
  value = [],
  onChange,
  placeholder = "Select NFTs",
  className = '',
  disabled = false
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter options based on search - keep as single stable list
  const filteredOptions = useMemo(() => {
    if (!debouncedSearch) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [options, debouncedSearch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't auto-focus search input when dropdown opens

  // Memoized handlers for performance
  const handleToggleOption = useCallback((optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  }, [value, onChange]);

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const allOptions = filteredOptions;
    
    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, allOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allOptions.length) {
          handleToggleOption(allOptions[highlightedIndex].value);
        }
        break;
      case 'Backspace':
        if (searchQuery === '' && value.length > 0) {
          e.preventDefault();
          const newValue = [...value];
          newValue.pop();
          onChange(newValue);
        }
        break;
    }
  }, [isOpen, filteredOptions, highlightedIndex, handleToggleOption, searchQuery, value, onChange]);

  // Memoized display values
  const displayValues = useMemo(() => {
    const getDisplayText = () => {
      if (value.length === 0) return t('all');
      if (value.length === 1) {
        const selectedOption = options.find(opt => opt.value === value[0]);
        return selectedOption?.label || value[0];
      }
      return `${value.length} ${t('selected')}`;
    };

    const getLabel = () => {
      if (value.length > 1) {
        return `${t('nfts')} (${value.length})`;
      }
      return t('nfts');
    };

    const getAriaLabel = () => {
      if (value.length === 0) return t('nfts');
      if (value.length === 1) {
        const selectedOption = options.find(opt => opt.value === value[0]);
        return `${t('nfts')}, ${selectedOption?.label || value[0]} selected`;
      }
      return `${t('nfts')}, ${value.length} selected`;
    };

    return {
      displayText: getDisplayText(),
      label: getLabel(),
      ariaLabel: getAriaLabel()
    };
  }, [value, options, t]);


  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={displayValues.ariaLabel}
        className={cn(
          "bg-card border border-border rounded-xl px-3 py-2 h-12 flex flex-col justify-center transition-all duration-150 w-full",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          isOpen && !disabled && "border-primary shadow-sm shadow-primary/10"
        )}
      >
        <div className="text-xs font-medium text-text-muted leading-none mb-0.5">{displayValues.label}</div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary leading-none truncate">
            {displayValues.displayText}
          </span>
          <ChevronDown 
            className={cn(
              "w-4 h-4 text-text-muted transition-transform duration-150 flex-shrink-0",
              isOpen && "rotate-180"
            )} 
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
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
          `}</style>
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 max-h-80 flex flex-col theme-shadow"
            style={{
              animation: 'slideInDown 150ms ease-out'
            }}
          >
            {/* Search Bar */}
            <div className="sticky top-0 p-3 border-b border-border bg-popover">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search NFTs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-card border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

            {/* Clear All Button (when items are selected) */}
            {value.length > 0 && (
              <div className="px-3 py-2 border-b border-border bg-accent/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    Selected ({value.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Single Stable List */}
            <div className="flex-1 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-text-muted">
                  No NFTs found
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggleOption(option.value)}
                      className={cn(
                        "w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-accent/50 transition-colors duration-150",
                        highlightedIndex === index && "bg-accent"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center transition-colors duration-150",
                        isSelected 
                          ? "bg-primary text-primary-foreground" 
                          : "border border-border bg-card"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="flex-1 text-left truncate">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MultiSelectNFT;