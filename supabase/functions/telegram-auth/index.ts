import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Telegram auth function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { telegramData } = await req.json()
    
    if (!telegramData || !telegramData.user) {
      throw new Error('Missing Telegram user data')
    }

    const { user } = telegramData
    console.log('Authenticating user:', user.id, 'Username:', user.username)

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Upsert user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      })
      .select()
      .single()

    if (userError) {
      console.error('User upsert error:', userError)
      throw userError
    }

    console.log('User data saved:', userData)

    // Create user in auth.users if doesn't exist
    const email = `user_${user.id}@telegram.local`
    // Generate cryptographically secure random password
    const password = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
    
    let authUser;
    let sessionData;
    
    try {
      // First try to sign in with existing credentials
      const { data: existingSession, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (!signInError && existingSession) {
        console.log('User signed in successfully with existing credentials')
        sessionData = existingSession
        authUser = existingSession.user
      }
    } catch (signInError) {
      console.log('Sign in failed, will try to create user:', signInError.message)
    }
    
    // If sign in failed, try to create the user
    if (!authUser) {
      try {
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            telegram_user_id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
          }
        })
        
        if (createError) {
          console.log('User creation failed:', createError.message)
          
          if (createError.message.includes('already registered')) {
            // User exists but password might be different, let's reset it
            const { data: existingUsers } = await supabase.auth.admin.listUsers()
            const existingUser = existingUsers.users.find(u => u.email === email)
            
            if (existingUser) {
              // Update the user's password and confirm email
              await supabase.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true })
              console.log('Updated password for existing user')
              
              // Now try to sign in again
              const { data: retrySession, error: retryError } = await supabase.auth.signInWithPassword({
                email,
                password
              })
              
              if (!retryError) {
                sessionData = retrySession
                authUser = retrySession.user
              } else {
                throw retryError
              }
            }
          } else {
            throw createError
          }
        } else {
          // User created successfully, now sign them in
          const { data: newSession, error: newSignInError } = await supabase.auth.signInWithPassword({
            email,
            password
          })
          
          if (newSignInError) {
            throw newSignInError
          }
          
          sessionData = newSession
          authUser = newSession.user
        }
        
      } catch (error) {
        console.error('CreateUser threw error:', error)
        const msg = (error && (error.message || String(error)))
        if (typeof msg === 'string' && (msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('already registered'))) {
          // Fallback: find existing user and reset password, then sign in
          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const existingUser = existingUsers.users.find((u: any) => u.email === email)
          if (existingUser) {
            await supabase.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true })
            console.log('Updated password for existing user (via catch)')
            const { data: retrySession, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password
            })
            if (retryError) throw retryError
            sessionData = retrySession
            authUser = retrySession.user
          } else {
            throw error
          }
        } else {
          throw error
        }
      }
    }
    if (!sessionData) {
      throw new Error('Failed to create session')
    }

    console.log('Authentication successful for user:', user.id, 'Auth user ID:', authUser.id)

    return new Response(
      JSON.stringify({
        success: true,
        user: userData,
        auth_user: sessionData.user,
        session: sessionData.session,
        token: sessionData.session?.access_token,
        refresh_token: sessionData.session?.refresh_token,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Authentication error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        details: error.stack || 'No additional details',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})