-- Add new columns to users table for enhanced authentication
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'telegram',
ADD COLUMN IF NOT EXISTS telegram_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS telegram_hash TEXT;

-- Create wallet_connections table to link wallets with users
CREATE TABLE IF NOT EXISTS public.wallet_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT NOT NULL,
  wallet_address TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'ton',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, wallet_address)
);

-- Enable RLS on wallet_connections
ALTER TABLE public.wallet_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for wallet_connections
CREATE POLICY "Users can manage their own wallet connections"
ON public.wallet_connections
FOR ALL
USING (user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_user_id'::text))::bigint)
WITH CHECK (user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_user_id'::text))::bigint);

-- Create trigger for wallet_connections updated_at
CREATE OR REPLACE FUNCTION public.update_wallet_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wallet_connections_updated_at
BEFORE UPDATE ON public.wallet_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_connections_updated_at();