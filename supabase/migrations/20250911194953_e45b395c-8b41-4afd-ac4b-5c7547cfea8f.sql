-- Create a security definer function to get current telegram user id from JWT claims
CREATE OR REPLACE FUNCTION public.get_current_telegram_user_id()
RETURNS BIGINT AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claims', true)::json ->> 'telegram_user_id', '')::bigint;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update the listings RLS policies to use the security definer function
DROP POLICY IF EXISTS "Users can manage their own listings" ON public.listings;

CREATE POLICY "Users can manage their own listings" ON public.listings
FOR ALL 
USING (owner_id = public.get_current_telegram_user_id())
WITH CHECK (owner_id = public.get_current_telegram_user_id());