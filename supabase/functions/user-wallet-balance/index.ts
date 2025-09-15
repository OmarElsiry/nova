import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

/**
 * Secure endpoint to get user's wallet balance
 * Validates user ownership and prevents cross-user access
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    const telegramUserId = user.user_metadata?.telegram_user_id
    if (!telegramUserId) {
      throw new Error('Invalid user session')
    }

    // Get user's primary wallet with ownership validation
    const { data: userWallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('wallet_address')
      .eq('user_id', telegramUserId)
      .eq('is_primary', true)
      .single()

    if (walletError) {
      throw new Error('No wallet found for user')
    }

    // Fetch balance from TON API
    const response = await fetch(
      `https://toncenter.com/api/v2/getAddressInformation?address=${userWallet.wallet_address}`
    )
    const data = await response.json()

    let balance = '0'
    if (data.ok) {
      const balanceNano = data.result.balance
      balance = (parseInt(balanceNano) / 1000000000).toFixed(4)
    }

    // Update balance in database
    await supabase
      .from('wallet_balances')
      .upsert({
        user_id: telegramUserId,
        wallet_id: userWallet.id,
        balance: parseFloat(balance)
      })

    return new Response(
      JSON.stringify({
        success: true,
        balance,
        walletAddress: userWallet.wallet_address,
        userId: telegramUserId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Wallet balance error:', error)
    
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
