import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface AuthenticatedUser {
  id: number;
  wallet_address?: string;
}

/**
 * Secure endpoint to get user's deposit address
 * Validates authentication and ensures user can only access their own wallet
 */
serve(async (req) => {
  // Handle CORS preflight requests
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

    // Extract user ID from token metadata
    const telegramUserId = user.user_metadata?.telegram_user_id
    if (!telegramUserId) {
      throw new Error('Invalid user session')
    }

    // Get user data with strict ownership validation
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('id', telegramUserId)
      .single()

    if (userError || !userData) {
      throw new Error('User not found')
    }

    const authenticatedUser = userData as AuthenticatedUser

    // Check if user has a dedicated wallet
    const { data: userWallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('wallet_address')
      .eq('user_id', authenticatedUser.id)
      .eq('is_primary', true)
      .single()

    let depositAddress: string

    if (walletError && walletError.code === 'PGRST116') {
      // User doesn't have a dedicated wallet, create one
      // This would typically call the wallet creation service
      return new Response(
        JSON.stringify({
          error: 'No wallet found. Please create a wallet first.',
          requiresWalletCreation: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else if (walletError) {
      throw new Error(`Wallet lookup failed: ${walletError.message}`)
    } else {
      depositAddress = userWallet.wallet_address
    }

    // Log access for audit trail (without exposing sensitive data)
    console.log(`Deposit address accessed by user ${authenticatedUser.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        depositAddress,
        userId: authenticatedUser.id,
        message: 'This address is exclusively for your deposits'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('User wallet address error:', error)
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false
      }),
      {
        status: error instanceof Error && error.message.includes('authentication') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
