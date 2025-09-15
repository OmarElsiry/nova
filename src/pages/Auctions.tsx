import { Gavel } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemedDropdown } from "@/components/ui/themed-dropdown";
import { useState } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import TGSViewer from "@/components/ui/tgs-viewer";
import GiftCounter from "@/components/ui/gift-counter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const Auctions = () => {
  const { t } = useLanguage();
  const [giftType, setGiftType] = useState("all");
  const [sortBy, setSortBy] = useState("ending-soon");
  const { listings, loading, error } = useMarketData();
  
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <Gavel className="w-5 h-5" />
          {t('auctions')}
        </h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {/* Gift Type Filter */}
        <div className="flex-1">
          <ThemedDropdown
            label="Gift Type"
            value={giftType}
            options={[
              { value: "all", label: "All Types" }
            ]}
            onChange={setGiftType}
            placeholder="Select type..."
          />
        </div>

        {/* Sort Filter */}
        <div className="flex-1">
          <ThemedDropdown
            label="Sort"
            value={sortBy}
            options={[
              { value: "ending-soon", label: "Ending Soon" },
              { value: "latest", label: "Latest" },
              { value: "highest-bid", label: "Highest Bid" },
              { value: "latest-bid", label: "Latest Bid" }
            ]}
            onChange={setSortBy}
            placeholder="Sort by..."
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4">
              <CardContent className="p-0">
                <div className="flex flex-col space-y-3">
                  <Skeleton className="w-12 h-12 rounded-xl mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 mb-6 text-6xl flex items-center justify-center">
            ⚠️
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Error loading auctions
          </h3>
          <p className="text-text-muted text-center text-sm leading-relaxed">
            {error}
          </p>
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 mb-6 text-6xl flex items-center justify-center">
            🏛️
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {t('noActiveAuctions')}
          </h3>
          <p className="text-text-muted text-center text-sm leading-relaxed">
            Available auctions will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => {
            const primaryGift = listing.groupedGifts?.[0];
            
            return (
              <Card key={listing.id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer border border-border/50 bg-card">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center space-y-3">
                    {/* Gift Icon */}
                    <div className="relative w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                      {primaryGift?.sticker_base64 || primaryGift?.emoji ? (
                        <>
                          <TGSViewer
                            sticker_base64={primaryGift.sticker_base64}
                            emoji={primaryGift.emoji || "🎁"}
                            size="sm"
                          />
                          <GiftCounter count={primaryGift.count || 1} />
                        </>
                      ) : (
                        "📺"
                      )}
                    </div>

                    {/* Channel Name */}
                    <div className="text-center">
                      <h3 className="font-medium text-text-primary text-sm">
                        {listing.channel?.channel_username || "Unknown Channel"}
                      </h3>
                      {listing.channel?.is_verified && (
                        <span className="text-xs text-primary">✓ Verified</span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-center">
                      <p className="text-lg font-bold text-primary">
                        {listing.price} TON
                      </p>
                      {listing.groupedGifts.length > 1 && (
                        <p className="text-xs text-text-muted">
                          +{listing.groupedGifts.length - 1} more gifts
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Auctions;