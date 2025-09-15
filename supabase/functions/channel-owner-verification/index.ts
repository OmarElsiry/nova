import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channel, telegram_user_id } = await req.json();

    if (!channel || !telegram_user_id) {
      return new Response(
        JSON.stringify({ error: 'Channel and telegram_user_id are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call external API to verify channel ownership with timeout and validation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const apiResponse = await fetch(`https://api.channelsseller.site/channel_owner_bot?channel=${encodeURIComponent(channel)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Supabase Edge Function',
        'Accept': 'application/json',
      }
    });
    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      throw new Error(`API request failed with status ${apiResponse.status}`);
    }

    const apiData = await apiResponse.json();

    console.log('API Response:', apiData);

    if (apiData.status === 'error') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiData.message || 'Failed to verify channel ownership' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if the telegram user ID matches the channel owner
    const isOwner = apiData.owner_id && apiData.owner_id.toString() === telegram_user_id.toString();

    if (!isOwner) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You are not the owner of this channel',
          owner_info: {
            owner_username: apiData.owner_username,
            owner_first_name: apiData.owner_first_name,
            owner_last_name: apiData.owner_last_name
          }
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save/update user data
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: telegram_user_id,
        username: apiData.owner_username,
        first_name: apiData.owner_first_name,
        last_name: apiData.owner_last_name
      });

    if (userError) {
      console.error('Error saving user:', userError);
    }

    // Return success with channel owner data
    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        channel_data: {
          channel_username: channel,
          owner_id: apiData.owner_id,
          owner_username: apiData.owner_username,
          owner_first_name: apiData.owner_first_name,
          owner_last_name: apiData.owner_last_name,
          is_bot_admin: apiData.is_bot_admin
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in channel-owner-verification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});