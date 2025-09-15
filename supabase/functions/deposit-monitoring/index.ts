import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitoringRequest {
  transactionHash: string;
  expectedAmount: number;
  userTelegramId: number;
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

    const { transactionHash, expectedAmount, userTelegramId }: MonitoringRequest = await req.json();

    if (!transactionHash || !expectedAmount || !userTelegramId) {
      throw new Error('Missing required parameters');
    }

    // In a real implementation, you would:
    // 1. Query TON blockchain API to check transaction status
    // 2. Verify the transaction amount and recipient address
    // 3. Update transaction status in database
    // 4. Update user wallet balance
    // 5. Send confirmation to user

    console.log('Monitoring transaction:', {
      transactionHash,
      expectedAmount,
      userTelegramId
    });

    // Simulate transaction confirmation (replace with real blockchain monitoring)
    const isConfirmed = true; // In real app, check blockchain

    if (isConfirmed) {
      // Update transaction status
      const { error: updateError } = await supabaseClient
        .from('transactions')
        .update({ 
          status: 'completed',
          transaction_hash: transactionHash 
        })
        .eq('user_id', userTelegramId)
        .eq('type', 'deposit')
        .eq('status', 'pending');

      if (updateError) {
        throw new Error('Failed to update transaction status');
      }

      // Update wallet balance
      const { error: balanceError } = await supabaseClient.functions.invoke('update-wallet-balance', {
        body: {
          amount: expectedAmount,
          type: 'deposit'
        }
      });

      if (balanceError) {
        throw new Error('Failed to update wallet balance');
      }

      console.log('Transaction confirmed and balance updated:', {
        transactionHash,
        amount: expectedAmount,
        userTelegramId
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      confirmed: isConfirmed,
      transactionHash
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in deposit-monitoring function:', error);
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