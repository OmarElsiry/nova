import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/contexts/TelegramContext';

export interface Channel {
  id: string;
  channel_username: string;
  channel_id?: number;
  owner_username?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  is_verified: boolean;
  created_at: string;
  owner_id?: number; // Only visible to channel owner
}

export interface ChannelGift {
  id: string;
  gift_index: number;
  name: string;
  sticker_base64?: string;
  emoji: string;
  value: number;
}

export interface Listing {
  id: string;
  channel_id: string;
  price: number;
  status: string;
  created_at: string;
  channel: Channel;
  gifts: ChannelGift[];
}

export const useChannels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useTelegram();

  const fetchUserChannels = async () => {
    console.log('=== FETCH CHANNELS DEBUG ===');
    console.log('fetchUserChannels called');
    console.log('user object:', user);
    console.log('user.id:', user?.id, 'type:', typeof user?.id);
    console.log('isAuthenticated:', isAuthenticated);
    
    // Check Supabase session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Supabase session:', session);
    console.log('Session error:', sessionError);
    console.log('Session user claims:', session?.user?.user_metadata);
    
    if (!user?.id) {
      console.log('No user ID available, skipping fetch');
      setError('المستخدم غير متوفر - لا يوجد معرف مستخدم');
      setLoading(false);
      return;
    }

    // Ensure user.id is a number for database comparison
    const userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
    console.log('Using user ID for query:', userId, 'type:', typeof userId);
    
    if (isNaN(userId)) {
      console.error('Invalid user ID - cannot convert to number:', user.id);
      setError('معرف المستخدم غير صحيح');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch user's channels first (this usually works)
      console.log('Querying channels with owner_id =', userId);
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('id, channel_username, channel_id, is_verified, created_at, owner_id, owner_username, owner_first_name, owner_last_name')
        .eq('owner_id', userId);

      console.log('Channels query result:', { channelsData, channelsError });
      
      if (channelsError) {
        console.error('Channels error details:', channelsError);
        console.error('Error code:', channelsError.code);
        console.error('Error message:', channelsError.message);
        console.error('Error details:', channelsError.details);
        setError(`فشل في تحميل القنوات: ${channelsError.message || 'خطأ غير معروف'}`);
        setLoading(false);
        return;
      }

      // Set channels data immediately
      setChannels(channelsData || []);
      console.log('Channels loaded successfully:', channelsData?.length || 0);

      // Clear any previous error since channels loaded successfully
      setError(null);

      // Now try to fetch listings (this might fail due to foreign key issues)
      try {
        console.log('Querying listings with owner_id =', userId);
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false });

        console.log('Listings query result:', { listingsData, listingsError });
        
        if (listingsError) {
          console.error('Listings error details:', listingsError);
          // Don't throw - just log and continue with empty listings
          setListings([]);
          return;
        }

        // For each listing, get channel and gifts data separately
        const listingsWithData = await Promise.all(
          (listingsData || []).map(async (listing: any) => {
            // Get channel data (only public info for channels not owned by user)
            const { data: channelData } = await supabase
              .from('channels')
              .select('id, channel_username, channel_id, is_verified, created_at')
              .eq('id', listing.channel_id)
              .maybeSingle();

            // Get gifts data
            const { data: giftsData } = await supabase
              .from('channel_gifts')
              .select('*')
              .eq('channel_id', listing.channel_id);

            return {
              ...listing,
              channel: channelData || { 
                id: listing.channel_id, 
                channel_username: 'Unknown Channel',
                is_verified: false 
              },
              gifts: giftsData || []
            };
          })
        );

        console.log('Listings loaded successfully:', listingsWithData?.length || 0);
        setListings(listingsWithData);

      } catch (listingsErr) {
        console.error('Error fetching listings (non-critical):', listingsErr);
        // Don't set error - channels are still loaded
        setListings([]);
      }

    } catch (err) {
      console.error('Error fetching channels:', err);
      console.error('Error type:', typeof err);
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack');
      const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
      setError(`فشل في تحميل القنوات: ${errorMessage}. تحقق من الاتصال والمصادقة.`);
    } finally {
      setLoading(false);
    }
  };

  const cancelListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'cancelled' })
        .eq('id', listingId);

      if (error) throw error;

      // Refresh data
      await fetchUserChannels();
      
      return { success: true };
    } catch (err) {
      console.error('Error cancelling listing:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to cancel listing' 
      };
    }
  };

  const updateListingPrice = async (listingId: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ price: newPrice })
        .eq('id', listingId);

      if (error) throw error;

      // Refresh data
      await fetchUserChannels();
      
      return { success: true };
    } catch (err) {
      console.error('Error updating listing price:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update price' 
      };
    }
  };

  const deleteChannel = async (channelId: string) => {
    console.log('Starting channel deletion:', channelId);
    setDeletingChannelId(channelId);
    
    // Optimistic update - remove from UI immediately
    const originalChannels = [...channels];
    const originalListings = [...listings];
    
    setChannels(prev => prev.filter(channel => channel.id !== channelId));
    setListings(prev => prev.filter(listing => listing.channel_id !== channelId));

    try {
      console.log('Deleting all related data for channel:', channelId);
      
      // Delete channel gifts explicitly first
      const { error: giftsError } = await supabase
        .from('channel_gifts')
        .delete()
        .eq('channel_id', channelId);
      
      if (giftsError) {
        console.error('Error deleting channel gifts:', giftsError);
      } else {
        console.log('Channel gifts deleted successfully');
      }

      // Delete listings explicitly
      const { error: listingsError } = await supabase
        .from('listings')
        .delete()
        .eq('channel_id', channelId);
      
      if (listingsError) {
        console.error('Error deleting listings:', listingsError);
      } else {
        console.log('Channel listings deleted successfully');
      }

      // Finally delete the channel itself
      const { error: channelError } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

      if (channelError) {
        console.error('Database error deleting channel:', channelError);
        // Rollback optimistic update
        setChannels(originalChannels);
        setListings(originalListings);
        throw channelError;
      }

      console.log('Channel and all related data deleted successfully from DB:', channelId);
      
      // Verify complete deletion
      const { count: remainingGifts } = await supabase
        .from('channel_gifts')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId);
        
      const { count: remainingListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId);
        
      console.log('Verification - Remaining gifts:', remainingGifts, 'Remaining listings:', remainingListings);
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting channel:', err);
      // Rollback optimistic update on error
      setChannels(originalChannels);
      setListings(originalListings);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete channel' 
      };
    } finally {
      setDeletingChannelId(null);
    }
  };

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!user?.id) return;

    fetchUserChannels();

    // Subscribe to channels changes
    const channelsChannel = supabase
      .channel('channels-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `owner_id=eq.${typeof user.id === 'string' ? parseInt(user.id) : user.id}`
        },
        (payload) => {
          console.log('Channels realtime update:', payload);
          
          if (payload.eventType === 'DELETE') {
            setChannels(prev => prev.filter(channel => channel.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT') {
            setChannels(prev => [...prev, payload.new as Channel]);
          } else if (payload.eventType === 'UPDATE') {
            setChannels(prev => prev.map(channel => 
              channel.id === payload.new.id ? payload.new as Channel : channel
            ));
          }
        }
      )
      .subscribe();

    // Subscribe to listings changes
    const listingsChannel = supabase
      .channel('listings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
          filter: `owner_id=eq.${typeof user.id === 'string' ? parseInt(user.id) : user.id}`
        },
        (payload) => {
          console.log('Listings realtime update:', payload);
          
          if (payload.eventType === 'DELETE') {
            setListings(prev => prev.filter(listing => listing.id !== payload.old.id));
          } else {
            // For INSERT and UPDATE, refetch to get complete data with joins
            fetchUserChannels();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelsChannel);
      supabase.removeChannel(listingsChannel);
    };
  }, [user?.id]);

  return {
    channels,
    listings,
    loading,
    deletingChannelId,
    error,
    refreshData: fetchUserChannels,
    cancelListing,
    updateListingPrice,
    deleteChannel
  };
};