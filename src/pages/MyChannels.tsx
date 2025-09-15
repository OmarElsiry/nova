import { useState } from "react";
import { Plus, X, Edit, Tv, Gift, TrendingUp, Layers3, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChannels } from "@/hooks/useChannels";
import { AddChannelDialog } from "@/components/channels/AddChannelDialog";
import TonIcon from "@/components/ui/ton-icon";
import TGSViewer from '@/components/ui/tgs-viewer';
import GiftCounter from '@/components/ui/gift-counter';
import { supabase } from "@/integrations/supabase/client";
import { useTelegram } from "@/contexts/TelegramContext";

const MyChannels = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"owned" | "gifts" | "for-sale" | "fractional-nft">("owned");
  const [editPrice, setEditPrice] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listingChannel, setListingChannel] = useState<any>(null);
  const [listPrice, setListPrice] = useState("");
  const { user, hapticFeedback } = useTelegram();

  const { 
    channels, 
    listings, 
    loading, 
    deletingChannelId,
    error, 
    refreshData, 
    cancelListing, 
    updateListingPrice,
    deleteChannel 
  } = useChannels();

  const tabs = [
    { id: "owned" as const, label: t('channels'), icon: Tv },
    { id: "gifts" as const, label: t('gifts'), icon: Gift },
    { id: "for-sale" as const, label: t('forSale'), icon: TrendingUp },
    { id: "fractional-nft" as const, label: t('fractionalNFT'), icon: Layers3 },
  ];

  // Filter out listed channels from owned section
  const availableChannels = channels.filter(channel => 
    !listings.some(listing => listing.channel_id === channel.id)
  );

  const handleCancel = async (listing: any) => {
    const result = await cancelListing(listing.id);
    if (result.success) {
      toast({
        title: t('listingCancelled'),
        description: `${listing.channel.channel_username} has been removed from sale`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const handleEditPrice = async () => {
    if (editingItem && editPrice) {
      const result = await updateListingPrice(editingItem.id, parseFloat(editPrice));
      if (result.success) {
        toast({
          title: t('priceUpdated'),
          description: `${editingItem.channel.channel_username} price updated to ${editPrice} TON`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
      setEditingItem(null);
      setEditPrice("");
      setIsEditModalOpen(false);
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditPrice(item.price.toString());
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditPrice("");
    setIsEditModalOpen(false);
  };

  const openListModal = (channel: any) => {
    setListingChannel(channel);
    setListPrice("");
    setIsListModalOpen(true);
  };

  const closeListModal = () => {
    setIsListModalOpen(false);
    setListingChannel(null);
    setListPrice("");
  };

  const handleCreateListing = async () => {
    if (!listingChannel) return;
    const priceNum = parseFloat(listPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price",
        variant: "destructive"
      });
      return;
    }
    if (!user?.id) {
      toast({ title: "Error", description: "User not found. Please restart the app.", variant: "destructive" });
      return;
    }
    try {
      console.log('Creating listing for channel:', listingChannel);
      console.log('User from context:', user);
      console.log('Price:', priceNum);

      // First check if user is authenticated with Supabase
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      console.log('Current Supabase user:', currentUser);
      console.log('User error:', userError);

      if (!currentUser) {
        toast({
          title: "Authentication Required",
          description: "Please refresh the app to authenticate",
          variant: "destructive"
        });
        return;
      }

      // Test our security function
      const { data: testData, error: testError } = await supabase.rpc('get_current_telegram_user_id');
      console.log('Security function test:', { testData, testError });

      hapticFeedback?.impact('medium');
      console.log('Inserting listing with data:', {
        owner_id: user.id,
        channel_id: listingChannel.id, 
        price: priceNum,
        status: 'active'
      });

      const { data, error } = await supabase
        .from('listings')
        .insert({
          owner_id: user.id,
          channel_id: listingChannel.id,
          price: priceNum,
          status: 'active'
        })
        .select();

      console.log('Insert response:', { data, error });
      if (error) throw error;
      toast({ title: "Success ✅", description: `${listingChannel.channel_username} listed for ${priceNum} TON` });
      setIsListModalOpen(false);
      setListPrice("");
      setListingChannel(null);
      setActiveTab('for-sale');
      refreshData();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create listing", variant: "destructive" });
    }
  };

  const handleDeleteChannel = async (channel: any) => {
    const result = await deleteChannel(channel.id);
    if (result.success) {
      toast({
        title: "Channel Deleted",
        description: `${channel.channel_username} has been deleted successfully`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <h1 className="text-xl font-semibold text-text-primary">{t('myChannels')}</h1>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content based on active tab */}
      {activeTab === "owned" && (
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary">{t('owned')}</h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                className="h-9"
                onClick={refreshData}
              >
                Refresh
              </Button>
              <Button 
                variant="outline"
                className="h-9"
                onClick={() => setShowDebug((v) => !v)}
              >
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </Button>
              <Button 
                className="gap-2 h-9"
                onClick={() => setIsAddChannelOpen(true)}
              >
                <Plus className="w-4 h-4" />
                {t('addChannel')}
              </Button>
            </div>
          </div>

          {/* Debug Panel */}
          {showDebug && (
            <div className="rounded-xl border border-border bg-card p-3 text-xs space-y-2">
              <div className="flex flex-wrap gap-3">
                <span>channels: <b>{channels.length}</b></span>
                <span>listings: <b>{listings.length}</b></span>
                <span>loading: <b>{String(loading)}</b></span>
                <span>error: <b>{error ? 'yes' : 'no'}</b></span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="font-medium mb-1">Channels</div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(channels, null, 2)}</pre>
                </div>
                <div>
                  <div className="font-medium mb-1">Listings</div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(listings, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner (non-blocking) */}
          {error && !loading && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="text-destructive text-sm">Error: {error}</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshData}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading channels...</span>
            </div>
          )}

          {/* Channels List or Empty State */}
          {!loading && (
            <>
              {availableChannels.length > 0 ? (
                <div className="space-y-3">
                  {availableChannels.map((channel) => (
                    <Card key={channel.id} className="bg-surface border-border">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Channel Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-semibold">
                                {channel.channel_username.charAt(1).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-medium text-text-primary">{channel.channel_username}</h3>
                                <div className="flex items-center gap-1 text-sm">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    channel.is_verified 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {channel.is_verified ? 'Verified' : 'Pending'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                                {t('edit')}
                              </Button>
                              
                              <ConfirmationDialog
                                trigger={
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={deletingChannelId === channel.id}
                                  >
                                    {deletingChannelId === channel.id ? (
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3 mr-1" />
                                    )}
                                    {deletingChannelId === channel.id ? 'Deleting...' : 'Delete'}
                                  </Button>
                                }
                                title="Delete Channel"
                                description={`Are you sure you want to delete ${channel.channel_username}? This action cannot be undone and will remove all related listings and gifts.`}
                                confirmLabel="Delete Channel"
                                onConfirm={() => handleDeleteChannel(channel)}
                                variant="destructive"
                              />
                              
                              {channel.is_verified && (
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => openListModal(channel)}>
                                  List for Sale
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Channel Gifts Display */}
                          {(channel as any).gifts && (channel as any).gifts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-text-muted">Channel Gifts</h4>
                              <div className="flex flex-wrap gap-2">
                                {(channel as any).groupedGifts?.map((gift: any, index: number) => (
                                  <div key={index} className="relative">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center shadow-sm">
                                      <TGSViewer
                                        sticker_base64={gift.sticker_base64}
                                        emoji={gift.emoji || "🎁"}
                                        size="sm"
                                      />
                                    </div>
                                    <GiftCounter count={gift.count} />
                                  </div>
                                )) || (
                                  <div className="text-xs text-text-muted py-2">No gifts available</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <Tv className="w-16 h-16 text-text-muted mb-6" />
                  
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    {t('noResults')}
                  </h3>
                  
                  <p className="text-text-muted text-center text-sm mb-6">
                    Add your first channel to get started
                  </p>

                  <Button 
                    className="gap-2"
                    onClick={() => setIsAddChannelOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    {t('addChannel')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Gifts Tab */}
      {activeTab === "gifts" && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-text-primary">{t('gifts')}</h2>
          
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <Gift className="w-16 h-16 text-text-muted mb-6" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No gifts yet</h3>
            <p className="text-text-muted text-center text-sm">Your received gifts will appear here</p>
          </div>
        </div>
      )}

      {/* For Sale Tab */}
      {activeTab === "for-sale" && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-text-primary">{t('forSale')}</h2>
          
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading listings...</span>
            </div>
          )}
          
          {!loading && (
            <>
              {listings.length > 0 ? (
                <div className="space-y-3">
                  {listings.map((listing) => (
                    <Card key={listing.id} className="bg-surface border-border">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Listing Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-semibold">
                                {listing.channel?.channel_username?.charAt(1)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <h3 className="font-medium text-text-primary">
                                  {listing.channel?.channel_username || 'Unknown Channel'}
                                </h3>
                                <div className="flex items-center gap-1 text-sm">
                                  <TonIcon size="sm" />
                                  <span className="text-text-muted">{listing.price}</span>
                                  <span className="text-xs text-text-muted ml-2">
                                    {(listing as any).groupedGifts?.length || 0} gift types
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-xs"
                                onClick={() => openEditModal(listing)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                {t('edit')}
                              </Button>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-xs text-danger border-danger/20 hover:bg-danger/5"
                                onClick={() => handleCancel(listing)}
                              >
                                {t('cancel')}
                              </Button>
                            </div>
                          </div>

                          {/* Listing Gifts Display */}
                          {(listing as any).groupedGifts && (listing as any).groupedGifts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-text-muted">Listed Gifts</h4>
                              <div className="flex flex-wrap gap-2">
                                {(listing as any).groupedGifts.map((gift: any, index: number) => (
                                  <div key={index} className="relative">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center shadow-sm">
                                      <TGSViewer
                                        sticker_base64={gift.sticker_base64}
                                        emoji={gift.emoji || "🎁"}
                                        size="sm"
                                      />
                                    </div>
                                    <GiftCounter count={gift.count} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <TrendingUp className="w-16 h-16 text-text-muted mb-6" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">Nothing for sale</h3>
                  <p className="text-text-muted text-center text-sm">Items you list for sale will appear here</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Fractional NFT Tab */}
      {activeTab === "fractional-nft" && (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="relative mb-8">
            <Layers3 className="w-20 h-20 text-primary/60 animate-pulse" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-primary to-accent rounded-full animate-ping" />
          </div>
          
          <h3 className="text-2xl font-semibold text-text-primary mb-3">
            Fractional NFT
          </h3>
          
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-6 text-center max-w-sm">
            <p className="text-text-primary font-medium mb-2">Coming Soon</p>
            <p className="text-text-muted text-sm">
              Split your NFTs into fractions and trade them with enhanced liquidity
            </p>
          </div>
        </div>
      )}

      {/* Add Channel Dialog */}
      <AddChannelDialog 
        open={isAddChannelOpen}
        onOpenChange={setIsAddChannelOpen}
        onChannelAdded={refreshData}
      />

      {/* List Channel Modal */}
      <Dialog open={isListModalOpen} onOpenChange={setIsListModalOpen}>
        <DialogContent className="bg-surface border-border max-w-sm mx-auto rounded-2xl p-6">
          <DialogHeader className="relative pb-4">
            <DialogTitle className="text-center text-lg font-semibold text-text-primary">
              List Channel for Sale
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm"
              className="absolute right-0 top-0 p-1 h-8 w-8 rounded-full hover:bg-card"
              onClick={closeListModal}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-4">
            {listingChannel?.channel_username && (
              <div className="text-sm text-text-muted">
                Channel: <span className="font-medium text-text-primary">{listingChannel.channel_username}</span>
              </div>
            )}
            <div>
              <label className="text-sm block mb-1">Sale Price (TON)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeListModal}>Cancel</Button>
              <Button onClick={handleCreateListing}>List</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Price Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-surface border-border max-w-sm mx-auto rounded-2xl p-6">
          <DialogHeader className="relative pb-4">
            <DialogTitle className="text-center text-lg font-semibold text-text-primary">
              Edit Price
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm"
              className="absolute right-0 top-0 p-1 h-8 w-8 rounded-full hover:bg-card"
              onClick={closeEditModal}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-muted block mb-2">
                Price (TON)
              </label>
              <Input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="bg-card border-input-border rounded-xl h-12 text-center text-lg font-semibold"
                placeholder="Enter price"
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleEditPrice}
                className="flex-1 h-11 rounded-xl font-medium"
              >
                Confirm
              </Button>
              <Button 
                variant="outline" 
                onClick={closeEditModal}
                className="flex-1 h-11 rounded-xl font-medium"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyChannels;