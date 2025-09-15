-- Remove the view completely and use application-level filtering instead
DROP VIEW IF EXISTS public.channels_public;

-- The security fix is already in place with the RLS policies:
-- 1. "Public can view channel basic info" - allows everyone to see channels
-- 2. "Owners can view their own channel details" - owners see full details

-- The application code will be updated to handle filtering of sensitive fields