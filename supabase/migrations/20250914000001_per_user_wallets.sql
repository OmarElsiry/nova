-- Create user_wallets table for per-user wallet isolation
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL UNIQUE,
  encrypted_mnemonic TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, is_primary) WHERE is_primary = true
);

-- Create wallet_transactions table for tracking deposits/withdrawals per user
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  transaction_hash TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'internal')),
  amount DECIMAL(20,9) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  from_address TEXT,
  to_address TEXT,
  block_number BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Create wallet_balances table for tracking user balances
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  balance DECIMAL(20,9) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, wallet_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_wallets (users can only access their own wallets)
CREATE POLICY "Users can only access their own wallets" ON public.user_wallets
FOR ALL
USING (user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_user_id'::text))::bigint)
WITH CHECK (user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_user_id'::text))::bigint);

-- Create RLS policies for wallet_transactions (users can only access their own transactions)
CREATE POLICY "Users can only access their own transactions" ON public.wallet_transactions
FOR ALL
USING (user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_user_id'::text))::bigint)
WITH CHECK (user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_user_id'::text))::bigint);

-- Create RLS policies for wallet_balances (users can only access their own balances)
CREATE POLICY "Users can only access their own balances" ON public.wallet_balances
FOR ALL
USING (user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_user_id'::text))::bigint)
WITH CHECK (user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_user_id'::text))::bigint);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON public.user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_hash ON public.wallet_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_user_id ON public.wallet_balances(user_id);

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_user_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS update_user_wallets_updated_at ON public.user_wallets;
CREATE TRIGGER update_user_wallets_updated_at
BEFORE UPDATE ON public.user_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_user_wallets_updated_at();

-- Create function to automatically create wallet balance record
CREATE OR REPLACE FUNCTION public.create_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallet_balances (user_id, wallet_id, balance)
  VALUES (NEW.user_id, NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-create balance record when wallet is created
DROP TRIGGER IF EXISTS create_wallet_balance_trigger ON public.user_wallets;
CREATE TRIGGER create_wallet_balance_trigger
AFTER INSERT ON public.user_wallets
FOR EACH ROW
EXECUTE FUNCTION public.create_wallet_balance();
