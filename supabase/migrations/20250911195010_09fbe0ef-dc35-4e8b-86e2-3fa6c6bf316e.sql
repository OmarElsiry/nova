-- Fix the security definer function to have a stable search path
CREATE OR REPLACE FUNCTION public.get_current_telegram_user_id()
RETURNS BIGINT AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claims', true)::json ->> 'telegram_user_id', '')::bigint;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;