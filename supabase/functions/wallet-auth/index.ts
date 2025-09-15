import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Wallet Auth function started')

interface WalletAuthData {
  walletAddress: string
  signature?: string
  publicKey?: string
  telegramUserId?: number
}

/**
 * TON Address utilities for Edge Function
 * Copy of address utilities to avoid import issues
 */

// Simple validation for Raw format address
const isRawFormat = (address: string): boolean => {
  return !!address?.match(/^-?\d+:[a-fA-F0-9]{64}$/);
};

// Simple validation for User-friendly format 
const isUserFriendlyFormat = (address: string): boolean => {
  return !!address?.match(/^[EU]Q[A-Za-z0-9_-]{46}$/);
};

// Convert hex string to Uint8Array
const hexToUint8Array = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

// Parse raw address format manually
const parseRawAddress = (rawAddress: string): { workchain: number, hash: Uint8Array } => {
  const parts = rawAddress.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid raw address format');
  }
  
  const workchain = parseInt(parts[0]);
  const hashHex = parts[1];
  
  if (isNaN(workchain) || hashHex.length !== 64) {
    throw new Error('Invalid workchain or hash format');
  }
  
  const hash = hexToUint8Array(hashHex);
  return { workchain, hash };
};

// Simple Address class for Edge Function
class SimpleAddress {
  constructor(public workchain: number, public hash: Uint8Array) {}
  
  toString(): string {
    // This is a simplified implementation
    // In a real implementation, you'd need full Base64 encoding with checksum
    const hashHex = Array.from(this.hash)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `EQ${hashHex.slice(0, 44)}`;
  }
}

// Convert Raw format to User-friendly format
const rawToUserFriendly = (rawAddress: string): string => {
  try {
    const { workchain, hash } = parseRawAddress(rawAddress);
    const address = new SimpleAddress(workchain, hash);
    return address.toString();
  } catch (error) {
    console.error('Failed to convert raw address to user-friendly:', error);
    throw new Error('فشل في تحويل تنسيق العنوان');
  }
};

// Normalize address to user-friendly format
const normalizeAddress = (address: string): string => {
  if (!address || typeof address !== 'string') {
    throw new Error('عنوان غير صحيح');
  }

  const trimmedAddress = address.trim();
  console.log('Normalizing address:', trimmedAddress);
  
  // Check if it's Raw format (workchain:hash)
  if (isRawFormat(trimmedAddress)) {
    console.log('Converting Raw format to User-friendly');
    return rawToUserFriendly(trimmedAddress);
  }
  
  // Check if it's User-friendly format (EQ... or UQ...)
  if (isUserFriendlyFormat(trimmedAddress)) {
    console.log('Address already in User-friendly format');
    return trimmedAddress;
  }
  
  throw new Error('تنسيق العنوان غير صحيح. يرجى استخدام التنسيق الخام (0:...) أو التنسيق المألوف (EQ...)');
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { walletAddress, telegramUserId } = await req.json()
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'عنوان المحفظة مطلوب' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing wallet auth for original address:', walletAddress)

    // Normalize wallet address to ensure consistent format
    let normalizedAddress: string
    try {
      normalizedAddress = normalizeAddress(walletAddress)
      console.log('Normalized address:', normalizedAddress)
    } catch (error) {
      console.error('Address normalization error:', error)
      return new Response(
        JSON.stringify({ error: 'تنسيق عنوان المحفظة غير صحيح' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if wallet is already connected to a user
    const { data: existingConnection } = await supabase
      .from('wallet_connections')
      .select('user_id, users(*)')
      .eq('wallet_address', normalizedAddress)
      .single()

    let userId: number
    let userData: any

    if (existingConnection) {
      // Wallet already connected to a user
      userId = existingConnection.user_id
      userData = existingConnection.users
      console.log('Wallet already connected to user:', userId)
    } else {
      // Create new user or link to existing Telegram user
      if (telegramUserId) {
        // Link to existing Telegram user
        userId = telegramUserId
        
        // Update user with wallet address
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            wallet_address: normalizedAddress,
            auth_method: 'wallet_telegram'
          })
          .eq('id', telegramUserId)
          .select()
          .single()

        if (updateError) {
          console.error('User update error:', updateError)
          return new Response(
            JSON.stringify({ error: 'فشل في ربط المحفظة بالحساب' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        userData = updatedUser
      } else {
        // Create new user for wallet-only auth
        const walletUserId = Date.now() // Generate unique ID
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: walletUserId,
            wallet_address: normalizedAddress,
            auth_method: 'wallet_only',
            first_name: `Wallet User`,
            username: `wallet_${walletUserId}`
          })
          .select()
          .single()

        if (createError) {
          console.error('User creation error:', createError)
          return new Response(
            JSON.stringify({ error: 'فشل في إنشاء حساب المحفظة' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        userId = walletUserId
        userData = newUser
      }

      // Create wallet connection
      const { error: connectionError } = await supabase
        .from('wallet_connections')
        .insert({
          user_id: userId,
          wallet_address: normalizedAddress,
          connection_type: 'ton',
          is_primary: true
        })

      if (connectionError) {
        console.error('Wallet connection error:', connectionError)
        return new Response(
          JSON.stringify({ error: 'فشل في ربط المحفظة' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Create Supabase auth session
    const email = `wallet_${userId}@tonconnect.local`
    const password = `wallet_${userId}_${normalizedAddress.slice(-8)}`

    let authResult
    try {
      // Try to sign in first
      authResult = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authResult.error) {
        // If sign in fails, try to create user
        authResult = await supabase.auth.admin.createUser({
          email,
          password,
          user_metadata: {
            telegram_user_id: userId,
            wallet_address: normalizedAddress,
            auth_method: 'wallet',
            username: userData.username,
            first_name: userData.first_name
          }
        })
      }
    } catch (createError) {
      // User might already exist, try to update password
      console.log('Auth user might exist, updating password...')
      try {
        await supabase.auth.admin.updateUserById(
          email,
          { password }
        )
        
        // Try sign in again
        authResult = await supabase.auth.signInWithPassword({
          email,
          password
        })
      } catch (updateError) {
        console.error('Password update error:', updateError)
      }
    }

    if (authResult.error) {
      console.error('Wallet auth error:', authResult.error)
      return new Response(
        JSON.stringify({ error: 'فشل في مصادقة المحفظة' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Wallet auth successful for user:', userId)
    console.log('Final wallet address saved:', normalizedAddress)

    return new Response(
      JSON.stringify({
        user: userData,
        session: authResult.data.session,
        message: 'تم تسجيل الدخول بالمحفظة بنجاح'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Wallet auth error:', error)
    return new Response(
      JSON.stringify({ error: 'خطأ في الخادم' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})