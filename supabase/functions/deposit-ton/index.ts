import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DepositRequest {
  amount: number;
  walletAddress: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { amount, walletAddress }: DepositRequest = await req.json();

    if (!amount || amount < 1) {
      throw new Error('Minimum deposit amount is 1 TON');
    }

    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }

    // Get current user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user's telegram ID from metadata
    const telegramUserId = user.user_metadata?.telegram_user_id;
    if (!telegramUserId) {
      throw new Error('Telegram user ID not found');
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert([{
        user_id: telegramUserId,
        type: 'deposit',
        amount: amount,
        wallet_address: walletAddress,
        status: 'pending'
      }])
      .select()
      .single();

    if (transactionError) {
      throw new Error('Failed to create transaction record');
    }

    console.log('Deposit transaction created:', {
      transaction_id: transaction.id,
      user_id: telegramUserId,
      amount,
      walletAddress
    });

    // In a real implementation, you would:
    // 1. Monitor the TON blockchain for incoming transactions to walletAddress
    // 2. Verify the transaction amount matches the deposit
    // 3. Update the wallet balance once confirmed
    // 4. Send confirmation message to user

    return new Response(JSON.stringify({ 
      success: true,
      transaction_id: transaction.id,
      message: 'Deposit initiated. Please transfer TON to the provided address.'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in deposit-ton function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    });
  }
};

serve(handler);