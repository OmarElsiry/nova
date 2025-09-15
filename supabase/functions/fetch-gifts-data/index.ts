import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Comprehensive fallback data
const fallbackData = {
  nfts: [
    {
      id: "1",
      name: "Delicious Cake",
      models: [
        { id: "1", name: "Chocolate Cake", price: 100 },
        { id: "2", name: "Vanilla Cake", price: 80 },
        { id: "3", name: "Strawberry Cake", price: 120 }
      ]
    },
    {
      id: "2", 
      name: "Star",
      models: [
        { id: "4", name: "Golden Star", price: 200 },
        { id: "5", name: "Silver Star", price: 150 },
        { id: "6", name: "Platinum Star", price: 300 }
      ]
    },
    {
      id: "3",
      name: "Green Star",
      models: [
        { id: "7", name: "Emerald Star", price: 250 },
        { id: "8", name: "Jade Star", price: 180 }
      ]
    },
    {
      id: "4",
      name: "Blue Star", 
      models: [
        { id: "9", name: "Sapphire Star", price: 280 },
        { id: "10", name: "Azure Star", price: 220 }
      ]
    }
  ],
  backgrounds: [
    { id: "1", name: "Red", value: "#ef4444" },
    { id: "2", name: "Blue", value: "#3b82f6" },
    { id: "3", name: "Green", value: "#10b981" },
    { id: "4", name: "Purple", value: "#8b5cf6" },
    { id: "5", name: "Orange", value: "#f97316" },
    { id: "6", name: "Pink", value: "#ec4899" }
  ],
  symbols: [
    { id: "1", name: "Heart", emoji: "❤️" },
    { id: "2", name: "Star", emoji: "⭐" },
    { id: "3", name: "Fire", emoji: "🔥" },
    { id: "4", name: "Crown", emoji: "👑" },
    { id: "5", name: "Diamond", emoji: "💎" },
    { id: "6", name: "Rocket", emoji: "🚀" }
  ]
};

// Array of potential data sources to try
const dataSources = [
  'https://raw.githubusercontent.com/kxk8/Name/main/gifts_formatted.min.json',
  'https://api.github.com/repos/kxk8/Name/contents/gifts_formatted.min.json',
  // Add more potential sources here as they become available
];

async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      console.log(`Attempting to fetch from ${url} (attempt ${i + 1}/${maxRetries + 1})`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Supabase Edge Function',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        return response;
      }
      
      console.log(`Failed with status ${response.status}: ${response.statusText}`);
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    } catch (error) {
      console.log(`Request failed: ${error.message}`);
      lastError = error;
      
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching gifts data from external APIs...');
    
    let data = null;
    let sourceUsed = 'fallback';

    // Try each data source
    for (const source of dataSources) {
      try {
        const response = await fetchWithRetry(source);
        data = await response.json();
        sourceUsed = source;
        console.log(`Successfully fetched gifts data from: ${source}`);
        break;
      } catch (error) {
        console.log(`Failed to fetch from ${source}: ${error.message}`);
        continue;
      }
    }

    // If all sources failed, use fallback data
    if (!data) {
      console.log('All external sources failed, using fallback data');
      data = fallbackData;
    }

    return new Response(JSON.stringify({
      ...data,
      _meta: {
        source: sourceUsed,
        timestamp: new Date().toISOString(),
        fallback: sourceUsed === 'fallback'
      }
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': sourceUsed === 'fallback' ? 'public, max-age=300' : 'public, max-age=3600' // Shorter cache for fallback
      },
    });
  } catch (error) {
    console.error('Critical error in fetch-gifts-data:', error);
    
    // Return fallback data even on critical errors
    return new Response(JSON.stringify({
      ...fallbackData,
      _meta: {
        source: 'emergency_fallback',
        timestamp: new Date().toISOString(),
        fallback: true,
        error: error.message
      }
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60' // Very short cache for emergency fallback
      },
    });
  }
});