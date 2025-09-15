import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channel_username, telegram_user_id } = await req.json();

    if (!channel_username || !telegram_user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: channel_username and telegram_user_id' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Verifying channel listing:', { channel_username, telegram_user_id });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if channel exists and belongs to user
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_username', channel_username)
      .eq('owner_id', telegram_user_id)
      .single();

    if (channelError || !channelData) {
      console.error('Channel not found or not owned by user:', channelError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Channel not found or access denied' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Re-verify bot admin status using the same API as channel-owner-verification
    console.log('Verifying bot admin status for channel:', channel_username);
    const ownerApiResponse = await fetch(`https://api.channelsseller.site/channel_owner_bot?channel=${encodeURIComponent(channel_username)}`);
    
    if (!ownerApiResponse.ok) {
      console.error('Owner API verification failed:', ownerApiResponse.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to verify channel ownership - check if bot is admin' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const ownerData = await ownerApiResponse.json();
    console.log('Owner verification response:', ownerData);

    if (ownerData.status === 'error' || !ownerData.is_bot_admin) {
      console.error('Bot is not admin or verification failed:', ownerData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Bot is not admin of this channel - please make the bot admin first' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch current gifts using the correct API
    console.log('Fetching channel gifts for:', channel_username);
    const giftsApiResponse = await fetch(`https://api.channelsseller.site/channel_gifts?channel=${encodeURIComponent(channel_username)}&telegram_user_id=${telegram_user_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!giftsApiResponse.ok) {
      console.error('Gifts API failed:', giftsApiResponse.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch channel gifts - ensure bot has proper permissions' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiData = await giftsApiResponse.json();
    console.log('Channel verification API response:', apiData);

    if (!apiData.channel_id || !apiData.gifts) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid response from channel API - bot may not be admin' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update channel verification status
    const { error: updateError } = await supabase
      .from('channels')
      .update({ 
        is_verified: true,
        channel_id: apiData.channel_id 
      })
      .eq('id', channelData.id);

    if (updateError) {
      console.error('Error updating channel:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update channel verification' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update gifts data
    if (apiData.gifts && apiData.gifts.length > 0) {
      // Delete old gifts
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
        value: gift.value || 0
      }));

      const { error: giftsError } = await supabase
        .from('channel_gifts')
        .insert(giftsToInsert);

      if (giftsError) {
        console.error('Error updating gifts:', giftsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        channel_id: channelData.id,
        gifts: apiData.gifts || [],
        total_gifts: apiData.gifts?.length || 0,
        message: 'Channel verified and ready for listing'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-channel-listing:', error);
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