import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateBalanceRequest {
  amount: number;
  type: 'deposit' | 'withdrawal';
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

    const { amount, type }: UpdateBalanceRequest = await req.json();

    if (!amount || !type) {
      throw new Error('Amount and type are required');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (!['deposit', 'withdrawal'].includes(type)) {
      throw new Error('Type must be either deposit or withdrawal');
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

    // Get current wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', telegramUserId)
      .single();

    if (walletError) {
      throw new Error('Wallet not found');
    }

    // Calculate new balance
    let newBalance: number;
    if (type === 'deposit') {
      newBalance = Number(wallet.balance) + amount;
    } else {
      newBalance = Number(wallet.balance) - amount;
      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }
    }

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await supabaseClient
      .from('wallets')
      .update({ balance: newBalance })
      .eq('user_id', telegramUserId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update wallet balance');
    }

    // Update transaction status to completed
    const { error: transactionUpdateError } = await supabaseClient
      .from('transactions')
      .update({ status: 'completed' })
      .eq('user_id', telegramUserId)
      .eq('type', type)
      .eq('amount', amount)
      .eq('status', 'pending');

    if (transactionUpdateError) {
      console.warn('Failed to update transaction status:', transactionUpdateError);
    }

    console.log(`=== ${type.toUpperCase()} SUCCESSFUL ===`, {
      user_id: telegramUserId,
      amount,
      newBalance,
      previousBalance: wallet.balance,
      transaction_id: 'auto-generated'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      newBalance,
      wallet: updatedWallet,
      message: `${type} of ${amount} TON processed successfully`
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('=== WALLET BALANCE UPDATE ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      details: 'Check edge function logs for more information'
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