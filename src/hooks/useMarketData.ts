import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define interfaces for grouped gifts and market listings
export interface GroupedGift {
  name: string;
  emoji: string;
  sticker_base64?: string;
  value: number;
  count: number;
  total_value: number;
}

export interface MarketListing {
  id: string;
  channel_id: string;
  price: number;
  status: string;
  created_at: string;
  channel: {
    id: string;
    channel_username: string;
    channel_id?: number;
    is_verified: boolean;
  } | null;
  gifts: any[];
  groupedGifts: GroupedGift[];
}

export interface ActivityItem {
  id: string;
  type: 'gift' | 'channel';
  name: string;
  emoji: string;
  value: number;
  timestamp: string;
  channel_name: string;
  count?: number;
  sticker_base64?: string;
}

export const useMarketData = () => {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to group similar gifts
  const groupSimilarGifts = (gifts: any[]): GroupedGift[] => {
    console.log('useMarketData: Grouping gifts:', gifts);
    
    const groupMap = new Map<string, GroupedGift>();

    gifts.forEach(gift => {
      const key = `${gift.name}-${gift.emoji}`;
      const giftValue = gift.value || 0; // Handle undefined/null values
      
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.count += 1;
        existing.total_value += giftValue;
      } else {
        groupMap.set(key, {
          name: gift.name,
          emoji: gift.emoji,
          sticker_base64: gift.sticker_base64,
          value: giftValue,
          count: 1,
          total_value: giftValue
        });
      }
    });

    const result = Array.from(groupMap.values());
    console.log('useMarketData: Grouped gifts result:', result);
    return result;
  };

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('useMarketData: Fetching market data...');

      // Fetch listings with their channels (only public info) and gifts
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          *,
          channel:channels!fk_listings_channel_id(id, channel_username, channel_id, is_verified, created_at)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listingsError) {
        console.error('useMarketData: Error fetching listings:', listingsError);
        throw listingsError;
      }

      console.log('useMarketData: Raw listings data:', listingsData);

      // Fetch gifts for each listing and group them
      const listingsWithGifts = await Promise.all(
        (listingsData || []).map(async (listing) => {
          const { data: giftsData, error: giftsError } = await supabase
            .from('channel_gifts')
            .select('*')
            .eq('channel_id', listing.channel?.id);

          if (giftsError) {
            console.error('useMarketData: Error fetching gifts for channel:', listing.channel?.id, giftsError);
            return {
              ...listing,
              gifts: [],
              groupedGifts: []
            };
          }

          console.log(`useMarketData: Gifts for channel ${listing.channel?.channel_username}:`, giftsData);

          const groupedGifts = groupSimilarGifts(giftsData || []);
          
          return {
            ...listing,
            gifts: giftsData || [],
            groupedGifts
          };
        })
      );

      console.log('useMarketData: Processed listings with gifts:', listingsWithGifts);

      setListings(listingsWithGifts);

      // Generate activities from listings
      const allActivities: ActivityItem[] = [];
      
      listingsWithGifts.forEach(listing => {
        // Add listing activity
        allActivities.push({
          id: `listing-${listing.id}`,
          type: 'channel',
          name: listing.channel?.channel_username || 'Unknown Channel',
          emoji: '📺',
          value: listing.price,
          timestamp: listing.created_at,
          channel_name: listing.channel?.channel_username || 'Unknown Channel'
        });

        // Add gift activities
        listing.groupedGifts.forEach(gift => {
          allActivities.push({
            id: `gift-${listing.id}-${gift.name}`,
            type: 'gift',
            name: gift.name,
            emoji: gift.emoji,
            value: gift.total_value || gift.value || 0,
            timestamp: listing.created_at,
            channel_name: listing.channel?.channel_username || 'Unknown Channel',
            count: gift.count,
            sticker_base64: gift.sticker_base64
          });
        });
      });

      // Sort activities by timestamp
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(allActivities);

    } catch (err) {
      console.error('useMarketData: Error fetching market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  return {
    listings,
    activities,
    loading,
    error,
    refreshData: fetchMarketData
  };
};