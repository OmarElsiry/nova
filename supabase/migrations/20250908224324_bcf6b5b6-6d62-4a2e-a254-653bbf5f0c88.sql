-- Create users table for Telegram users
CREATE TABLE public.users (
  id BIGINT PRIMARY KEY, -- Telegram user ID
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channels table
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  channel_username TEXT NOT NULL UNIQUE, -- @channel_name
  channel_id BIGINT, -- Telegram channel ID from API
  owner_username TEXT,
  owner_first_name TEXT,
  owner_last_name TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channel_gifts table
CREATE TABLE public.channel_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  gift_index INTEGER,
  name TEXT,
  sticker_base64 TEXT,
  emoji TEXT,
  value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create listings table for items for sale
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can manage their own data" ON public.users
  FOR ALL USING (id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint);

-- Create RLS policies for channels table
CREATE POLICY "Users can view all channels" ON public.channels
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own channels" ON public.channels
  FOR INSERT WITH CHECK (owner_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint);

CREATE POLICY "Users can update their own channels" ON public.channels
  FOR UPDATE USING (owner_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint);

CREATE POLICY "Users can delete their own channels" ON public.channels
  FOR DELETE USING (owner_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint);

-- Create RLS policies for channel_gifts table
CREATE POLICY "Anyone can view channel gifts" ON public.channel_gifts
  FOR SELECT USING (true);

CREATE POLICY "Channel owners can manage gifts" ON public.channel_gifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.channels 
      WHERE channels.id = channel_gifts.channel_id 
      AND channels.owner_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    )
  );

-- Create RLS policies for listings table
CREATE POLICY "Anyone can view active listings" ON public.listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can manage their own listings" ON public.listings
  FOR ALL USING (owner_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint);

-- Create indexes for better performance
CREATE INDEX idx_channels_owner_id ON public.channels(owner_id);
CREATE INDEX idx_channels_channel_username ON public.channels(channel_username);
CREATE INDEX idx_channel_gifts_channel_id ON public.channel_gifts(channel_id);
CREATE INDEX idx_listings_owner_id ON public.listings(owner_id);
CREATE INDEX idx_listings_status ON public.listings(status);