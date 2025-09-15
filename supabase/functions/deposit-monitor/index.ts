import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface DepositEvent {
  walletAddress: string;
  transactionHash: string;
  amount: string;
  fromAddress: string;
  blockNumber: number;
}

/**
 * Secure deposit monitoring endpoint
 * Processes deposits and updates ONLY the correct user's balance
 * Prevents cross-user balance contamination
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { walletAddress, transactionHash, amount, fromAddress, blockNumber }: DepositEvent = await req.json()

    if (!walletAddress || !transactionHash || !amount) {
      throw new Error('Missing required deposit data')
    }

    // Find the user who owns this wallet address
    const { data: userWallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('id, user_id, wallet_address')
      .eq('wallet_address', walletAddress)
      .single()

    if (walletError || !userWallet) {
      console.log(`Deposit to unknown wallet: ${walletAddress}`)
      return new Response(
        JSON.stringify({ error: 'Wallet not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate this is a legitimate user wallet
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userWallet.user_id)
      .single()

    if (userError || !user) {
      throw new Error('Invalid wallet owner')
    }

    // Check if transaction already processed (prevent double-processing)
    const { data: existingTx, error: txCheckError } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('transaction_hash', transactionHash)
      .single()

    if (existingTx) {
      return new Response(
        JSON.stringify({ message: 'Transaction already processed', success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Record the deposit transaction (scoped to the correct user)
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userWallet.user_id,
        wallet_id: userWallet.id,
        transaction_hash: transactionHash,
        transaction_type: 'deposit',
        amount: parseFloat(amount),
        status: 'confirmed',
        from_address: fromAddress,
        to_address: walletAddress,
        block_number: blockNumber,
        confirmed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (txError) {
      throw new Error(`Failed to record transaction: ${txError.message}`)
    }

    // Update user's balance (isolated to this user only)
    const { data: currentBalance, error: balanceError } = await supabase
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', userWallet.user_id)
      .eq('wallet_id', userWallet.id)
      .single()

    const newBalance = (currentBalance?.balance || 0) + parseFloat(amount)

    const { error: updateError } = await supabase
      .from('wallet_balances')
      .upsert({
        user_id: userWallet.user_id,
        wallet_id: userWallet.id,
        balance: newBalance,
        last_updated: new Date().toISOString()
      })

    if (updateError) {
      throw new Error(`Failed to update balance: ${updateError.message}`)
    }

    // Send notification to user (optional)
    try {
      await supabase.functions.invoke('send-telegram-message', {
        body: {
          to: userWallet.user_id.toString(),
          message: `تم استلام إيداع بقيمة ${amount} TON في محفظتك`
        }
      })
    } catch (notificationError) {
      console.log('Notification failed:', notificationError)
    }

    // Audit log (without exposing sensitive data)
    console.log(`Deposit processed: User ${userWallet.user_id}, Amount ${amount} TON`)

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        userId: userWallet.user_id,
        newBalance,
        message: 'Deposit processed successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Deposit monitoring error:', error)
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
