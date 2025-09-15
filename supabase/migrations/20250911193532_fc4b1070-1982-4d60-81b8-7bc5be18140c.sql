-- Fix security definer view issue by removing SECURITY DEFINER and using regular view
DROP VIEW IF EXISTS public.channels_public;

-- Create a regular view without SECURITY DEFINER
CREATE VIEW public.channels_public AS
SELECT 
    id,
    channel_username,
    channel_id,
    is_verified,
    created_at
FROM public.channels;

-- Grant access to the view for authenticated and anonymous users
GRANT SELECT ON public.channels_public TO authenticated;
GRANT SELECT ON public.channels_public TO anon;