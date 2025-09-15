import { useState } from "react";
import { Search, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { GiftCardSkeleton } from "@/components/ui/loading-skeleton";
import { ThemedDropdown } from "@/components/ui/themed-dropdown";
import { toast } from "@/hooks/use-toast";
import TonIcon from "@/components/ui/ton-icon";
import { useLanguage } from "@/contexts/LanguageContext";
import NFTSelectors from "@/components/ui/nft-selectors";
import { useMarketData } from "@/hooks/useMarketData";
import TGSViewer from '@/components/ui/tgs-viewer';
import GiftCounter from '@/components/ui/gift-counter';


const Market = () => {
  const { t } = useLanguage();
  const { listings, loading, error } = useMarketData();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"channels" | "gifts">("gifts");
  
  // Collapsible filter state
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
    { value: "price-high-low", label: t('sortPriceHighLow') },
    { value: "price-low-high", label: t('sortPriceLowHigh') },
    { value: "latest", label: t('sortLatest') },
    { value: "quantity-high-low", label: t('sortQuantityHighLow') },
    { value: "quantity-low-high", label: t('sortQuantityLowHigh') }
  ];

  const typeOptions = [
    { value: "all", label: t('all') }
  ];

  const handleBuy = (item: any) => {
    toast({
      title: "Purchase Successful! ✅",
      description: `You bought ${item.name} ${item.emoji || ''} for ${item.price} TON`,
    });
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
    toast({
      title: t('filtersReset'),
      description: t('allFiltersCleared'),
    });
  };

  const validateNumericInput = (value: string, onChange: (val: string) => void) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    onChange(numericValue);
  };

  // Filter items based on active tab
  const filteredItems = activeTab === "channels" 
    ? listings.filter(listing => 
        listing.channel.channel_username.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (!channelFilters.priceFrom || listing.price >= parseFloat(channelFilters.priceFrom)) &&
        (!channelFilters.priceTo || listing.price <= parseFloat(channelFilters.priceTo))
      )
    : listings.flatMap(listing => 
        listing.groupedGifts.filter(gift =>
          gift.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          (!giftFilters.priceFrom || gift.total_value >= parseFloat(giftFilters.priceFrom)) &&
          (!giftFilters.priceTo || gift.total_value <= parseFloat(giftFilters.priceTo))
        )
      );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
        <Input
          placeholder={t('searchGifts')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 sm:pl-12 h-12 sm:h-14 text-base bg-surface border-input-border rounded-xl"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 sm:gap-8 border-b border-border">
        <button 
          onClick={() => setActiveTab("channels")}
          className={`text-sm sm:text-base font-medium pb-3 sm:pb-4 border-b-2 transition-all duration-200 relative px-2 ${
            activeTab === "channels" 
              ? "text-text-primary border-primary" 
              : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          {t('channels')}
        </button>
        <button 
          onClick={() => setActiveTab("gifts")}
          className={`text-sm sm:text-base font-medium pb-3 sm:pb-4 border-b-2 transition-all duration-200 relative px-2 ${
            activeTab === "gifts" 
              ? "text-text-primary border-primary" 
              : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          {t('gifts')}
        </button>
      </div>

      {/* Collapsible Filters */}
      <div className="bg-surface border border-border rounded-xl p-3 sm:p-6 space-y-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ThemedDropdown
                    label={t('sort')}
                    value={giftFilters.sort}
                    options={giftSortOptions}
                    onChange={(value) => setGiftFilters(prev => ({ ...prev, sort: value }))}
                    id="gifts-sort-select"
                  />
                  
                  {/* Gift ID */}
                  <div className="bg-card border border-border rounded-xl px-3 py-2 h-12 sm:h-14 flex flex-col justify-center">
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
                <div className="bg-card border border-border rounded-xl px-3 py-2 h-12 sm:h-14 flex flex-col justify-center">
                  <div className="text-xs font-medium text-text-muted leading-none mb-0.5">{t('price')}</div>
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder={t('from')}
                      value={giftFilters.priceFrom}
                      onChange={(e) => validateNumericInput(e.target.value, (val) => setGiftFilters(prev => ({ ...prev, priceFrom: val })))}
                      className="bg-transparent border border-border/50 rounded-md px-2 py-1 text-xs h-6 w-20 sm:w-24 leading-none"
                      inputMode="decimal"
                    />
                    <Input
                      placeholder={t('to')}
                      value={giftFilters.priceTo}
                      onChange={(e) => validateNumericInput(e.target.value, (val) => setGiftFilters(prev => ({ ...prev, priceTo: val })))}
                      className="bg-transparent border border-border/50 rounded-md px-2 py-1 text-xs h-6 w-20 sm:w-24 leading-none"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Channels Filters
          <div className="space-y-4">
            {/* Always visible filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Type Filter */}
              <ThemedDropdown
                label={t('type')}
                value={channelFilters.type}
                options={typeOptions}
                onChange={(value) => setChannelFilters(prev => ({ ...prev, type: value }))}
                id="channels-type-select"
              />

              {/* Sort Filter */}
              <ThemedDropdown
                label={t('sort')}
                value={channelFilters.sort}
                options={channelSortOptions}
                onChange={(value) => setChannelFilters(prev => ({ ...prev, sort: value }))}
                id="channels-sort-select"
              />
            </div>

            {/* Expandable filters */}
            <div className={`overflow-hidden transition-all duration-200 ${filtersExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-3 pt-1">
                {/* Row B: Price Range, Quantity Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-xl px-3 py-2 h-12 sm:h-14 flex flex-col justify-center">
                    <div className="text-xs font-medium text-text-muted leading-none mb-0.5">{t('price')}</div>
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder={t('from')}
                        value={channelFilters.priceFrom}
                        onChange={(e) => validateNumericInput(e.target.value, (val) => setChannelFilters(prev => ({ ...prev, priceFrom: val })))}
                        className="bg-transparent border border-border/50 rounded-md px-2 py-1 text-xs h-6 w-20 sm:w-24 leading-none"
                        inputMode="decimal"
                      />
                      <Input
                        placeholder={t('to')}
                        value={channelFilters.priceTo}
                        onChange={(e) => validateNumericInput(e.target.value, (val) => setChannelFilters(prev => ({ ...prev, priceTo: val })))}
                        className="bg-transparent border border-border/50 rounded-md px-2 py-1 text-xs h-6 w-20 sm:w-24 leading-none"
                        inputMode="decimal"
                      />
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl px-3 py-2 h-12 sm:h-14 flex flex-col justify-center">
                    <div className="text-xs font-medium text-text-muted leading-none mb-0.5">{t('quantity')}</div>
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder={t('from')}
                        value={channelFilters.quantityFrom}
                        onChange={(e) => validateNumericInput(e.target.value, (val) => setChannelFilters(prev => ({ ...prev, quantityFrom: val })))}
                        className="bg-transparent border border-border/50 rounded-md px-2 py-1 text-xs h-6 w-20 sm:w-24 leading-none"
                        inputMode="numeric"
                      />
                      <Input
                        placeholder={t('to')}
                        value={channelFilters.quantityTo}
                        onChange={(e) => validateNumericInput(e.target.value, (val) => setChannelFilters(prev => ({ ...prev, quantityTo: val })))}
                        className="bg-transparent border border-border/50 rounded-md px-2 py-1 text-xs h-6 w-20 sm:w-24 leading-none"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>

                {/* Row C: With NFT Toggle */}
                <div className="flex justify-center">
                  <div 
                    className="bg-card border border-border rounded-xl px-4 py-2 flex items-center justify-between min-w-[180px] h-12 cursor-pointer"
                    onClick={() => setChannelFilters(prev => ({ ...prev, withNFT: !prev.withNFT }))}
                  >
                    <div className="text-sm font-medium text-text-primary">{t('withNFT')}</div>
                    <Switch
                      checked={channelFilters.withNFT}
                      onCheckedChange={(checked) => setChannelFilters(prev => ({ ...prev, withNFT: checked }))}
                      className="ml-3"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="gap-2 text-text-muted hover:text-text-primary transition-all duration-150 hover:border-primary/40 w-full sm:w-auto h-10 sm:h-8"
          >
            <Trash2 className="w-4 h-4" />
            {t('reset')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="gap-2 text-text-muted hover:text-text-primary transition-all duration-150 hover:border-primary/40 w-full sm:w-auto h-10 sm:h-8"
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
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mt-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <GiftCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mt-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="bg-surface border-border theme-shadow hover:theme-glow transition-all duration-300 hover:scale-[1.02] fade-slide-in">
              <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* All Gift Icons for Channels */}
                {activeTab === "channels" ? (
                  <div className="space-y-3">
                    {/* Multiple Gifts Display */}
                    <div className="flex flex-wrap gap-1 sm:gap-2 justify-center min-h-[50px] sm:min-h-[60px] items-center">
                      {(item as any).groupedGifts?.length > 0 ? (
                        (item as any).groupedGifts.slice(0, 4).map((gift: any, index: number) => (
                          <div key={index} className="relative">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm">
                              <TGSViewer
                                sticker_base64={gift.sticker_base64}
                                emoji={gift.emoji || "🎁"}
                                size="sm"
                              />
                            </div>
                            <GiftCounter count={gift.count} />
                          </div>
                        ))
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg sm:rounded-xl flex items-center justify-center text-2xl sm:text-3xl">
                          📺
                        </div>
                      )}
                      {(item as any).groupedGifts?.length > 4 && (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-medium text-muted-foreground">
                          +{(item as any).groupedGifts.length - 4}
                        </div>
                      )}
                    </div>
                    
                    {/* Channel Price */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TonIcon size="sm" />
                        <span className="text-base sm:text-lg font-bold text-text-primary">
                          {(item as any).price}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Single Gift Display */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center shadow-sm relative">
                      <TGSViewer 
                        sticker_base64={(item as any).sticker_base64}
                        emoji={(item as any).emoji || "🎁"}
                        size="md"
                      />
                      <GiftCounter count={(item as any).count} />
                    </div>
                    
                    {/* Gift Info */}
                    <div className="text-center">
                      <h3 className="text-xs sm:text-sm font-medium text-text-primary mb-1 sm:mb-2 line-clamp-2">
                        {(item as any).name}
                      </h3>
                      <div className="flex items-center justify-center gap-1">
                        <TonIcon size="sm" />
                        <span className="text-sm sm:text-lg font-bold text-text-primary">
                          {(item as any).total_value || (item as any).value}
                        </span>
                      </div>
                      {(item as any).count > 1 && (
                        <div className="text-xs text-text-muted mt-1">
                          {(item as any).count}x {(item as any).value} TON each
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Buy Button */}
                <ConfirmationDialog
                  trigger={
                    <Button className="w-full h-8 sm:h-10 text-xs sm:text-sm font-medium rounded-lg bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-1 sm:gap-2">
                      <span className="flex items-center gap-1">
                        {activeTab === "channels" ? (item as any).price : (item as any).value}
                        <div className="theme-glow rounded-full p-0.5">
                          <TonIcon size="xs" />
                        </div>
                      </span>
                      <span className="hidden sm:inline">{t('buy')}</span>
                      <span className="sm:hidden">Buy</span>
                    </Button>
                  }
                  title={t('confirm')}
                  description={`Are you sure you want to buy ${activeTab === "channels" 
                    ? (item as any).channel?.channel_username || (item as any).name
                    : (item as any).name} for ${activeTab === "channels" ? (item as any).price : (item as any).value} TON?`}
                  confirmLabel={t('buy')}
                  onConfirm={() => handleBuy({
                    name: activeTab === "channels" 
                      ? (item as any).channel?.channel_username || (item as any).name
                      : (item as any).name,
                    emoji: activeTab === "channels" ? "" : (item as any).emoji,
                    price: activeTab === "channels" ? (item as any).price : (item as any).value
                  })}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎁</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No gifts found</h3>
          <p className="text-text-muted text-sm">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
};

export default Market;