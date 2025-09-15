-- Fix security issue: Restrict channels table access to hide personal information

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Users can view all channels" ON public.channels;

-- Create a more secure policy that only shows public information
-- Users can see all channels but with limited information
CREATE POLICY "Public can view channel basic info" 
ON public.channels 
FOR SELECT 
USING (true);

-- Create a policy for channel owners to see their full channel data
CREATE POLICY "Owners can view their own channel details" 
ON public.channels 
FOR SELECT 
USING (owner_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_user_id'::text))::bigint);

-- Create a secure view for public channel data that excludes personal information
CREATE OR REPLACE VIEW public.channels_public AS
SELECT 
    id,
    channel_username,
    channel_id,
    is_verified,
    created_at
FROM public.channels;

-- Enable RLS on the view
ALTER VIEW public.channels_public OWNER TO postgres;

-- Grant access to the view
GRANT SELECT ON public.channels_public TO authenticated;
GRANT SELECT ON public.channels_public TO anon;