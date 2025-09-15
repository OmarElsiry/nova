-- Add foreign key constraints and CASCADE DELETE for better data integrity
-- This ensures that when a channel is deleted, all related data is properly cleaned up

-- Add foreign key from listings to channels
ALTER TABLE listings 
ADD CONSTRAINT fk_listings_channel_id 
FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;

-- Add foreign key from channel_gifts to channels  
ALTER TABLE channel_gifts 
ADD CONSTRAINT fk_channel_gifts_channel_id 
FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;

-- Enable realtime for channels table to get instant updates
ALTER TABLE channels REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE channels;

-- Enable realtime for listings table 
ALTER TABLE listings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE listings;

-- Enable realtime for channel_gifts table
ALTER TABLE channel_gifts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_gifts;