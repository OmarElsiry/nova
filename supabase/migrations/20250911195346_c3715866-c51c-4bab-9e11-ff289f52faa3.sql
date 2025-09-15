-- Enhance function to read telegram_user_id from both root and user_metadata
CREATE OR REPLACE FUNCTION public.get_current_telegram_user_id()
RETURNS BIGINT AS $$
DECLARE
  claims json;
  id_text text;
BEGIN
  claims := current_setting('request.jwt.claims', true)::json;
  -- Try root-level claim
  id_text := COALESCE(claims ->> 'telegram_user_id', (claims -> 'user_metadata') ->> 'telegram_user_id');
  IF id_text IS NULL OR id_text = '' THEN
    RETURN NULL;
  END IF;
  RETURN id_text::bigint;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;