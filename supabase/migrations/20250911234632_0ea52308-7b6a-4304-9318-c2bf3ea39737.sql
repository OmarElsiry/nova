-- Add foreign key constraints with CASCADE DELETE for proper data cleanup

-- Add foreign key constraint for channel_gifts
ALTER TABLE public.channel_gifts 
ADD CONSTRAINT fk_channel_gifts_channel_id 
FOREIGN KEY (channel_id) 
REFERENCES public.channels(id) 
ON DELETE CASCADE;

-- Add foreign key constraint for listings
ALTER TABLE public.listings 
ADD CONSTRAINT fk_listings_channel_id 
FOREIGN KEY (channel_id) 
REFERENCES public.channels(id) 
ON DELETE CASCADE;

-- Add index for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_channel_gifts_channel_id ON public.channel_gifts(channel_id);
CREATE INDEX IF NOT EXISTS idx_listings_channel_id ON public.listings(channel_id);