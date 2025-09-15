import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawRequest {
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

    const { amount, walletAddress }: WithdrawRequest = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid withdrawal amount');
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

    // Get current wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('balance')
      .eq('user_id', telegramUserId)
      .single();

    if (walletError) {
      throw new Error('Wallet not found');
    }

    if (Number(wallet.balance) < amount) {
      throw new Error('Insufficient balance');
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert([{
        user_id: telegramUserId,
        type: 'withdrawal',
        amount: amount,
        wallet_address: walletAddress,
        status: 'pending'
      }])
      .select()
      .single();

    if (transactionError) {
      throw new Error('Failed to create transaction record');
    }

    console.log('Withdrawal transaction created:', {
      transaction_id: transaction.id,
      user_id: telegramUserId,
      amount,
      walletAddress,
      currentBalance: wallet.balance
    });

    // In a real implementation, you would:
    // 1. Initiate TON blockchain transaction to send amount to walletAddress
    // 2. Wait for transaction confirmation
    // 3. Update wallet balance and transaction status
    // 4. Send confirmation message to user

    return new Response(JSON.stringify({ 
      success: true,
      transaction_id: transaction.id,
      message: 'Withdrawal initiated. Processing blockchain transaction...'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in withdraw-ton function:', error);
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