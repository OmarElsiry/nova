import React from 'react';
import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import TGSViewer from '@/components/ui/tgs-viewer';
import GiftCounter from '@/components/ui/gift-counter';

interface Gift {
  index: number;
  name: string;
  sticker_base64: string;
  emoji: string;
  value: number;
}

interface GroupedGift {
  name: string;
  emoji: string;
  sticker_base64?: string;
  value: number;
  count: number;
  total_value: number;
}

interface GiftsDisplayProps {
  gifts: Gift[];
  groupedGifts: GroupedGift[];
  isLoading?: boolean;
  className?: string;
}

const GiftsDisplay: React.FC<GiftsDisplayProps> = ({ 
  gifts, 
  groupedGifts, 
  isLoading = false,
  className 
}) => {
  // Debug logging
  console.log('GiftsDisplay: Rendering with data', {
    giftsCount: gifts?.length || 0,
    groupedGiftsCount: groupedGifts?.length || 0,
    gifts: gifts?.slice(0, 2), // Log first 2 gifts for debugging
    groupedGifts: groupedGifts?.slice(0, 2),
    isLoading
  });
  if (isLoading) {
    return (
      <div className={cn("bg-muted/50 p-4 rounded-lg animate-pulse", className)}>
        <div className="flex items-center space-x-2 mb-4">
          <Gift className="h-4 w-4" />
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-muted rounded-lg"></div>
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded w-20"></div>
                <div className="h-2 bg-muted rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gifts.length === 0) {
    return (
      <div className={cn("bg-muted/50 p-6 rounded-lg text-center", className)}>
        <Gift className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">No gifts found in this channel</p>
      </div>
    );
  }

  const totalValue = groupedGifts.reduce((sum, gift) => sum + gift.total_value, 0);

  return (
    <div className={cn("bg-gradient-to-br from-primary/5 to-secondary/5 p-4 rounded-lg border", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-foreground">
              {gifts.length} Gifts Found
            </span>
            <div className="text-sm text-muted-foreground">
              {groupedGifts.length} unique types • {totalValue}⭐ total value
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {groupedGifts.map((gift, index) => (
          <div 
            key={index} 
            className="group bg-background/80 backdrop-blur-sm p-3 rounded-lg border hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
          >
            <div className="flex items-center space-x-3">
              <div className="relative flex-shrink-0">
                <TGSViewer 
                  sticker_base64={gift.sticker_base64}
                  emoji={gift.emoji}
                  size="sm"
                  className="transition-transform group-hover:scale-110"
                />
                <GiftCounter count={gift.count} />
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-medium text-sm text-foreground truncate">
                  {gift.name}
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {gift.count}x {gift.value || 0}⭐
                  </span>
                  <span className="font-medium text-primary">
                    {gift.total_value || (gift.count * (gift.value || 0))}⭐
                  </span>
                </div>
                {/* Debug info - remove in production */}
                <div className="text-xs text-muted-foreground/70 mt-1">
                  Raw: {gift.value} | Count: {gift.count}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Total Collection Value:</span>
          <span className="font-bold text-lg text-primary">{totalValue}⭐</span>
        </div>
      </div>
    </div>
  );
};

export default GiftsDisplay;