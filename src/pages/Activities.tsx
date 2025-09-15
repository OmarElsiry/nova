import { useState } from "react";
import { Search, ChevronDown, ChevronUp, Trash2, Gift, Tv } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ThemedDropdown } from "@/components/ui/themed-dropdown";
import { useLanguage } from "@/contexts/LanguageContext";
import TonIcon from "@/components/ui/ton-icon";
import NFTSelectors from "@/components/ui/nft-selectors";
import { useMarketData } from "@/hooks/useMarketData";


const Activities = () => {
  const { t } = useLanguage();
  const { activities, loading } = useMarketData();
  const [activeTab, setActiveTab] = useState<"channels" | "gifts">("gifts");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Gift filters
  const [giftFilters, setGiftFilters] = useState({
    nft: [] as string[],
    sort: "latest",
    model: "all",
    symbol: "all", 
    giftId: "",
    background: "all",
    priceFrom: "",
    priceTo: ""
  });
  
  // Channel filters
  const [channelFilters, setChannelFilters] = useState({
    type: "all",
    sort: "price-high-low",
    priceFrom: "",
    priceTo: "",
    quantityFrom: "",
    quantityTo: "",
    withNFT: false
  });

  // Dropdown options
  const giftSortOptions = [
    { value: "latest", label: t('sortLatest') },
    { value: "price-high-low", label: t('sortPriceHighLow') },
    { value: "price-low-high", label: t('sortPriceLowHigh') },
    { value: "gift-id-asc", label: t('sortGiftIdAsc') },
    { value: "gift-id-desc", label: t('sortGiftIdDesc') }
  ];

  const channelSortOptions = [
    { value: "latest", label: t('sortLatest') },
    { value: "price-high-low", label: t('sortPriceHighLow') },
    { value: "price-low-high", label: t('sortPriceLowHigh') },
    { value: "quantity-high-low", label: t('sortQuantityHighLow') },
    { value: "quantity-low-high", label: t('sortQuantityLowHigh') }
  ];

  const typeOptions = [
    { value: "all", label: t('all') }
  ];

  const validateNumericInput = (value: string, onChange: (val: string) => void) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    onChange(numericValue);
  };

  const resetFilters = () => {
    if (activeTab === "gifts") {
      setGiftFilters({
        nft: [],
        sort: "latest",
        model: "all",
        symbol: "all",
        giftId: "",
        background: "all",
        priceFrom: "",
        priceTo: ""
      });
    } else {
      setChannelFilters({
        type: "all",
        sort: "price-high-low",
        priceFrom: "",
        priceTo: "",
        quantityFrom: "",
        quantityTo: "",
        withNFT: false
      });
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesTab = activeTab === "channels" ? activity.type === "channel" : activity.type === "gift";
    const matchesSearch = activity.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-semibold text-text-primary mb-1">{t('activities')}</h1>
        <p className="text-sm text-text-muted">Recent Activities</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          placeholder={t('searchGifts')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-surface border-input-border rounded-xl"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border">
        <button 
          onClick={() => setActiveTab("channels")}
          className={`text-sm font-medium pb-3 border-b-2 transition-all duration-200 flex items-center gap-2 relative ${
            activeTab === "channels" 
              ? "text-text-primary border-primary" 
              : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          <Tv className="w-4 h-4" />
          {t('channels')}
        </button>
        <button 
          onClick={() => setActiveTab("gifts")}
          className={`text-sm font-medium pb-3 border-b-2 transition-all duration-200 flex items-center gap-2 relative ${
            activeTab === "gifts" 
              ? "text-text-primary border-primary" 
              : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          <Gift className="w-4 h-4" />
          {t('gifts')}
        </button>
      </div>

      {/* Collapsible Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
        {activeTab === "gifts" ? (
          // Gifts Filters
          <div className="space-y-4">
            {/* NFT Filters - show NFT and Model by default, all when expanded */}
            <NFTSelectors
              selectedNFT={giftFilters.nft}
              selectedModel={giftFilters.model}
              selectedBackground={giftFilters.background}
              selectedSymbol={giftFilters.symbol}
              onNFTChange={(value) => setGiftFilters(prev => ({ ...prev, nft: value }))}
              onModelChange={(value) => setGiftFilters(prev => ({ ...prev, model: value }))}
              onBackgroundChange={(value) => setGiftFilters(prev => ({ ...prev, background: value }))}
              onSymbolChange={(value) => setGiftFilters(prev => ({ ...prev, symbol: value }))}
              showOnlyNFTAndModel={!filtersExpanded}
            />

            {/* Expandable filters */}
            <div className={`overflow-hidden transition-all duration-200 ${filtersExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-3 pt-1">
                {/* Sort and Gift ID */}
                <div className="grid grid-cols-2 gap-3">
                  <ThemedDropdown
                    label={t('sort')}
                    value={giftFilters.sort}
                    options={giftSortOptions}
                    onChange={(value) => setGiftFilters(prev => ({ ...prev, sort: value }))}
                    id="activities-gifts-sort-select"
                  />
                  
                  {/* Gift ID */}
                  <div className="bg-card border border-border rounded-xl px-3 py-2 h-12 flex flex-col justify-center">
                    <div className="text-xs font-medium text-text-muted leading-none mb-0.5">{t('giftId')}</div>
                    <Input
                      placeholder="#"
                      value={giftFilters.giftId}
                      onChange={(e) => validateNumericInput(e.target.value, (val) => setGiftFilters(prev => ({ ...prev, giftId: val })))}
                      className="bg-transparent border-0 p-0 text-sm font-semibold text-text-primary h-auto leading-none"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div className="bg-card border border-border rounded-xl px-3 py-2 h-12 flex flex-col justify-center">
                  <div className="text-xs font-medium text-text-muted leading-none mb-0.5">{t('price')}</div>
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder={t('from')}
                      value={giftFilters.priceFrom}
                      onChange={(e) => validateNumericInput(e.target.value, (val) => setGiftFilters(prev => ({ ...prev, priceFrom: val })))}
                      className="bg-transparent border border-border/50 rounded-md px-2 py-1 text-xs h-6 w-16 leading-none"
                      inputMode="decimal"
                    />
                    <Input
                      placeholder={t('to')}
                      value={giftFilters.priceTo}
                      onChange={(e) => validateNumericInput(e.target.value, (val) => setGiftFilters(prev => ({ ...prev, priceTo: val })))}
                      className="bg-transparent border border-border/50 rounded-md px-2 py-1 text-xs h-6 w-16 leading-none"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Channels Filters (Type and Sort only)
          <div className="space-y-4">
            {/* Only Type and Sort filters for Channels */}
            <div className="grid grid-cols-2 gap-3">
              {/* Type Filter */}
              <ThemedDropdown
                label={t('type')}
                value={channelFilters.type}
                options={typeOptions}
                onChange={(value) => setChannelFilters(prev => ({ ...prev, type: value }))}
                id="activities-channels-type-select"
              />

              {/* Sort Filter */}
              <ThemedDropdown
                label={t('sort')}
                value={channelFilters.sort}
                options={channelSortOptions}
                onChange={(value) => setChannelFilters(prev => ({ ...prev, sort: value }))}
                id="activities-channels-sort-select"
              />
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="gap-2 text-text-muted hover:text-text-primary transition-all duration-150 hover:border-primary/40"
          >
            <Trash2 className="w-4 h-4" />
            {t('reset')}
          </Button>

          {activeTab === "gifts" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="gap-2 text-text-muted hover:text-text-primary transition-all duration-150 hover:border-primary/40"
            >
              {filtersExpanded ? (
                <>
                  {t('collapse')}
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  {t('expand')}
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-3 mt-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-surface border-border animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                      <div className="h-4 bg-muted rounded w-32"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-4 bg-muted rounded w-16"></div>
                      <div className="h-9 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <Card key={activity.id} className="bg-surface border-border theme-shadow hover:theme-glow transition-all duration-300 hover:scale-[1.01] fade-slide-in">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      {activity.emoji || (activity.type === "channel" ? <Tv className="w-6 h-6 text-primary" /> : <Gift className="w-6 h-6 text-primary" />)}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">
                        {activity.name} {activity.emoji} {activity.count && activity.count > 1 ? `x${activity.count}` : ''}
                      </h3>
                    </div>
                  </div>

                  {/* Price and Action */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                          {activity.value}
                          <TonIcon size="xs" />
                        </p>
                    </div>
                    <Button size="sm" className="bg-gradient-to-r from-success to-success/90 text-success-foreground shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 h-9 px-4">
                      {t('purchase')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Empty State */}
      {filteredActivities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 mb-6 text-4xl flex items-center justify-center">
            {activeTab === "gifts" ? <Gift className="w-16 h-16 text-text-muted" /> : <Tv className="w-16 h-16 text-text-muted" />}
          </div>
          
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {t('noResults')}
          </h3>
          
          <p className="text-text-muted text-center text-sm">
            {t('noResults')}
          </p>
        </div>
      )}
    </div>
  );
};

export default Activities;