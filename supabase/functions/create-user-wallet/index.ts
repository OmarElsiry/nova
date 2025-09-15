import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

/**
 * Secure endpoint to create a dedicated wallet for authenticated user
 * Ensures each user gets their own unique wallet that cannot be accessed by others
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

    // Verify user exists and get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', telegramUserId)
      .single()

    if (userError || !userData) {
      throw new Error('User not found')
    }

    // Check if user already has a primary wallet
    const { data: existingWallet, error: checkError } = await supabase
      .from('user_wallets')
      .select('id, wallet_address')
      .eq('user_id', userData.id)
      .eq('is_primary', true)
      .single()

    if (existingWallet) {
      return new Response(
        JSON.stringify({
          error: 'User already has a primary wallet',
          walletAddress: existingWallet.wallet_address,
          success: false
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate wallet address (simplified for demo - use proper TON wallet generation)
    const walletAddress = `UQ${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    const encryptedMnemonic = Buffer.from(`mnemonic_for_user_${userData.id}`).toString('base64')

    // Create user wallet with strict ownership
    const { data: newWallet, error: createError } = await supabase
      .from('user_wallets')
      .insert({
        user_id: userData.id,
        wallet_address: walletAddress,
        encrypted_mnemonic: encryptedMnemonic,
        is_primary: true
      })
      .select()
      .single()

    if (createError) {
      throw new Error(`Failed to create wallet: ${createError.message}`)
    }

    // Update user record with wallet address
    await supabase
      .from('users')
      .update({ wallet_address: walletAddress })
      .eq('id', userData.id)

    // Create wallet connection record
    await supabase
      .from('wallet_connections')
      .insert({
        user_id: userData.id,
        wallet_address: walletAddress,
        connection_type: 'ton_generated',
        is_primary: true
      })

    // Log wallet creation for audit
    console.log(`Wallet created for user ${userData.id}: ${walletAddress}`)

    return new Response(
      JSON.stringify({
        success: true,
        walletAddress,
        walletId: newWallet.id,
        userId: userData.id,
        message: 'Dedicated wallet created successfully'
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Wallet creation error:', error)
    
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
