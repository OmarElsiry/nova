import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NFTModel {
  id: string;
  name: string;
  price?: number;
}

export interface NFTData {
  _id: string;
  name?: string;
  models: NFTModel[];
}

export interface BackgroundColor {
  id: string;
  name: string;
  value: string;
}

export interface BackgroundSymbol {
  id: string;
  name: string;
  emoji: string;
}

export interface NFTDataResponse {
  nfts: NFTData[];
  backgrounds: BackgroundColor[];
  symbols: BackgroundSymbol[];
}

const useNFTData = () => {
  const [data, setData] = useState<NFTDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use Supabase edge function to fetch data (avoids CORS issues)
        const { data: response, error: functionError } = await supabase.functions.invoke('fetch-gifts-data');
        
        if (functionError) {
          throw new Error(functionError.message || 'Failed to fetch gifts data');
        }
        
        const jsonData = response;
        
        // Check if we're using fallback data
        const isUsingFallbackData = jsonData._meta?.fallback || false;
        setIsUsingFallback(isUsingFallbackData);
        
        // Handle the new structured data format from the edge function
        if (jsonData.nfts && jsonData.backgrounds && jsonData.symbols) {
          // New structured format
          const transformedData: NFTDataResponse = {
            nfts: jsonData.nfts.map((nft: any) => ({
              _id: nft.id || nft._id,
              name: nft.name,
              models: (nft.models || []).map((model: any) => ({
                id: model.id,
                name: model.name,
                price: model.price || 0
              }))
            })),
            backgrounds: jsonData.backgrounds,
            symbols: jsonData.symbols
          };
          
          setData(transformedData);
          return;
        }
        
        // Handle legacy format (array of items)
        const arrayData = Array.isArray(jsonData) ? jsonData : [];
        
        // Extract unique NFTs, backgrounds, and symbols from legacy format
        const nftsMap = new Map();
        const backgroundsSet = new Set();
        const symbolsSet = new Set();
        
        arrayData.forEach((item: any) => {
          // Add NFT data using _id as identifier
          if (item._id && !nftsMap.has(item._id)) {
            nftsMap.set(item._id, {
              _id: item._id,
              name: item._id, // Use _id as the display name
              models: (item.models || []).map((model: any) => ({
                id: model.id || model.name,
                name: model.name,
                price: model.price || 0
              }))
            });
          }
          
          // Collect backgrounds
          if (item.backgrounds && Array.isArray(item.backgrounds)) {
            item.backgrounds.forEach((bg: any) => {
              if (bg.name) {
                backgroundsSet.add(JSON.stringify({ 
                  id: bg.id || bg.name, 
                  name: String(bg.name), 
                  value: String(bg.value || '#000000')
                }));
              }
            });
          }
          
          // Collect symbols
          if (item.symbols && Array.isArray(item.symbols)) {
            item.symbols.forEach((symbol: any) => {
              if (symbol.name) {
                symbolsSet.add(JSON.stringify({ 
                  id: symbol.id || symbol.name, 
                  name: String(symbol.name), 
                  emoji: String(symbol.emoji || '🎁')
                }));
              }
            });
          }
        });

        // Convert to arrays and sort
        const nfts = Array.from(nftsMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
        const backgrounds = Array.from(backgroundsSet).map((str: string) => JSON.parse(str)).sort((a: any, b: any) => a.name.localeCompare(b.name));
        const symbols = Array.from(symbolsSet).map((str: string) => JSON.parse(str)).sort((a: any, b: any) => a.name.localeCompare(b.name));

        const transformedData: NFTDataResponse = {
          nfts,
          backgrounds,
          symbols
        };

        setData(transformedData);
      } catch (err) {
        console.error('Error fetching NFT data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setIsUsingFallback(true);
        // Use comprehensive mock data as fallback
        setData({
          nfts: [
            { 
              _id: 'cake', 
              name: 'Delicious Cake', 
              models: [
                { id: 'classic_cake', name: 'Classic Cake', price: 100 }, 
                { id: 'birthday_cake', name: 'Birthday Cake', price: 150 },
                { id: 'wedding_cake', name: 'Wedding Cake', price: 300 }
              ]
            },
            { 
              _id: 'star', 
              name: 'Star Gift', 
              models: [
                { id: 'gold_star', name: 'Gold Star', price: 200 }, 
                { id: 'silver_star', name: 'Silver Star', price: 100 },
                { id: 'platinum_star', name: 'Platinum Star', price: 500 }
              ]
            },
            { 
              _id: 'heart', 
              name: 'Heart', 
              models: [
                { id: 'red_heart', name: 'Red Heart', price: 80 }, 
                { id: 'pink_heart', name: 'Pink Heart', price: 90 },
                { id: 'golden_heart', name: 'Golden Heart', price: 250 }
              ]
            },
            { 
              _id: 'crown', 
              name: 'Crown', 
              models: [
                { id: 'gold_crown', name: 'Gold Crown', price: 400 }, 
                { id: 'royal_crown', name: 'Royal Crown', price: 800 },
                { id: 'diamond_crown', name: 'Diamond Crown', price: 1500 }
              ]
            },
            { 
              _id: 'diamond', 
              name: 'Diamond', 
              models: [
                { id: 'blue_diamond', name: 'Blue Diamond', price: 1000 }, 
                { id: 'white_diamond', name: 'White Diamond', price: 1200 },
                { id: 'pink_diamond', name: 'Pink Diamond', price: 2000 }
              ]
            },
          ].sort((a, b) => a._id.localeCompare(b._id)),
          backgrounds: [
            { id: 'ocean_blue', name: 'Ocean Blue', value: '#0077be' },
            { id: 'sunset_orange', name: 'Sunset Orange', value: '#ff6b35' },
            { id: 'forest_green', name: 'Forest Green', value: '#228b22' },
            { id: 'royal_purple', name: 'Royal Purple', value: '#6a0dad' },
            { id: 'rose_gold', name: 'Rose Gold', value: '#e8b4a0' },
            { id: 'midnight_black', name: 'Midnight Black', value: '#000000' },
            { id: 'pearl_white', name: 'Pearl White', value: '#f8f8ff' },
          ].sort((a, b) => a.name.localeCompare(b.name)),
          symbols: [
            { id: 'sparkle', name: 'Sparkle', emoji: '✨' },
            { id: 'star', name: 'Star', emoji: '⭐' },
            { id: 'heart', name: 'Heart', emoji: '💖' },
            { id: 'crown', name: 'Crown', emoji: '👑' },
            { id: 'diamond', name: 'Diamond', emoji: '💎' },
            { id: 'fire', name: 'Fire', emoji: '🔥' },
            { id: 'lightning', name: 'Lightning', emoji: '⚡' },
          ].sort((a, b) => a.name.localeCompare(b.name))
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, isUsingFallback };
};

export default useNFTData;