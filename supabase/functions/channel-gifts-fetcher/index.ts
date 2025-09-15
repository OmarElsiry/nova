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

    // Enhanced input validation
    if (!channel || !telegram_user_id || typeof channel !== 'string' || typeof telegram_user_id !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Valid channel and telegram_user_id are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (channel.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Channel name too long' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call external API to get channel gifts with timeout and validation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const apiResponse = await fetch(`https://api.channelsseller.site/channel_gifts?channel=${encodeURIComponent(channel)}`, {
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

    console.log('Channel Gifts API Response:', apiData);

    if (apiData.status === 'error') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiData.message || 'Failed to fetch channel gifts' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if channel already exists
    const { data: existingChannel, error: checkError } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_username', channel)
      .single();

    let channelData;

    if (existingChannel) {
      // Channel exists, check if it belongs to the same user
      if (existingChannel.owner_id !== telegram_user_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'هذه القناة مملوكة بالفعل لمستخدم آخر' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Update existing channel data
      const { data: updatedChannel, error: updateError } = await supabase
        .from('channels')
        .update({
          channel_id: apiData.channel_id,
          is_verified: true,
          owner_first_name: apiData.owner_first_name || existingChannel.owner_first_name,
          owner_last_name: apiData.owner_last_name || existingChannel.owner_last_name,
          owner_username: apiData.owner_username || existingChannel.owner_username
        })
        .eq('id', existingChannel.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating channel:', updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'فشل في تحديث بيانات القناة' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      channelData = updatedChannel;
    } else {
      // Create new channel
      const { data: newChannel, error: insertError } = await supabase
        .from('channels')
        .insert({
          owner_id: telegram_user_id,
          channel_username: channel,
          channel_id: apiData.channel_id,
          is_verified: true,
          owner_first_name: apiData.owner_first_name,
          owner_last_name: apiData.owner_last_name,
          owner_username: apiData.owner_username
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating channel:', insertError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'فشل في إضافة القناة الجديدة' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      channelData = newChannel;
    }

    // Save gifts data
    if (apiData.gifts && apiData.gifts.length > 0) {
      // First, delete existing gifts for this channel
      await supabase
        .from('channel_gifts')
        .delete()
        .eq('channel_id', channelData.id);

      // Insert new gifts
      const giftsToInsert = apiData.gifts.map((gift: any) => ({
        channel_id: channelData.id,
        gift_index: gift.index,
        name: gift.name,
        sticker_base64: gift.sticker_base64,
        emoji: gift.emoji,
        value: gift.value
      }));

      const { error: giftsError } = await supabase
        .from('channel_gifts')
        .insert(giftsToInsert);

      if (giftsError) {
        console.error('Error saving gifts:', giftsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        channel_id: channelData.id,
        gifts: apiData.gifts || [],
        total_gifts: apiData.total_gifts || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in channel-gifts-fetcher:', error);
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