import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTelegram } from '@/contexts/TelegramContext';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import TGSViewer from '@/components/ui/tgs-viewer';
import GiftCounter from '@/components/ui/gift-counter';
import GiftsDisplay from './GiftsDisplay';

interface Gift {
  index: number;
  name: string;
  sticker_base64: string;
  emoji: string;
  value: number;
}

interface GroupedGift {
  name: string;
  emoji: string;
  sticker_base64?: string;
  value: number;
  count: number;
  total_value: number;
}

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelAdded: () => void;
}

export const AddChannelDialog: React.FC<AddChannelDialogProps> = ({
  open,
  onOpenChange,
  onChannelAdded
}) => {
  const [channelUsername, setChannelUsername] = useState('');
  const [price, setPrice] = useState('');
  const [step, setStep] = useState<'input' | 'verifying' | 'gifts' | 'price' | 'saving'>('input');
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [groupedGifts, setGroupedGifts] = useState<GroupedGift[]>([]);
  const [channelId, setChannelId] = useState<string>('');
  const { toast } = useToast();
  const { user, hapticFeedback } = useTelegram();
  const { t } = useLanguage();

  const groupSimilarGifts = (gifts: Gift[]): GroupedGift[] => {
    console.log('AddChannelDialog: Grouping gifts:', gifts);
    
    const groupMap = new Map<string, GroupedGift>();

    gifts.forEach(gift => {
      const key = `${gift.name}-${gift.emoji}`;
      const giftValue = gift.value || 0; // Handle undefined/null values
      
      console.log('Processing gift:', { 
        name: gift.name, 
        emoji: gift.emoji, 
        value: gift.value, 
        giftValue,
        hasSticker: !!gift.sticker_base64 
      });
      
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.count += 1;
        existing.total_value += giftValue;
      } else {
        groupMap.set(key, {
          name: gift.name,
          emoji: gift.emoji,
          sticker_base64: gift.sticker_base64,
          value: giftValue,
          count: 1,
          total_value: giftValue
        });
      }
    });

    const result = Array.from(groupMap.values());
    console.log('AddChannelDialog: Grouped gifts result:', result);
    return result;
  };

  const resetDialog = () => {
    setChannelUsername('');
    setPrice('');
    setStep('input');
    setGifts([]);
    setGroupedGifts([]);
    setChannelId('');
  };

  const validateChannelUsername = (username: string) => {
    if (!username.startsWith('@')) {
      return 'Channel username must start with @';
    }
    if (username.length < 6) {
      return 'Channel username is too short';
    }
    return null;
  };

  const handleVerifyChannel = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not found. Please restart the app.",
        variant: "destructive"
      });
      return;
    }

    const validationError = validateChannelUsername(channelUsername);
    if (validationError) {
      toast({
        title: "Invalid Channel",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setStep('verifying');
    hapticFeedback?.impact('medium');

    try {
      // Call verification function
      const { data, error } = await supabase.functions.invoke('channel-owner-verification', {
        body: {
          channel: channelUsername,
          telegram_user_id: user.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        toast({
          title: "Verification Failed",
          description: data.error,
          variant: "destructive"
        });
        setStep('input');
        return;
      }

      // Proceed to fetch gifts
      await handleFetchGifts();

    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Error",
        description: "Failed to verify channel ownership",
        variant: "destructive"
      });
      setStep('input');
    }
  };

  const handleFetchGifts = async () => {
    setStep('gifts');
    setGifts([]); // Reset gifts while loading
    setGroupedGifts([]);

    try {
      // Call gifts fetcher function
      const { data, error } = await supabase.functions.invoke('channel-gifts-fetcher', {
        body: {
          channel: channelUsername,
          telegram_user_id: user!.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        toast({
          title: "Failed to Fetch Gifts",
          description: data.error,
          variant: "destructive"
        });
        setStep('input');
        return;
      }

      const gifts = data.gifts || [];
      setGifts(gifts);
      const grouped = groupSimilarGifts(gifts);
      setGroupedGifts(grouped);
      setChannelId(data.channel_id);
      
      // Show gifts immediately in the gifts step, then move to price
      setTimeout(() => {
        setStep('price');
      }, 1500); // Give user time to see the gifts

    } catch (error) {
      console.error('Gifts fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch channel gifts",
        variant: "destructive"
      });
      setStep('input');
    }
  };

  const handleSaveListing = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price",
        variant: "destructive"
      });
      return;
    }

    setStep('saving');
    hapticFeedback?.impact('heavy');

    try {
      console.log('AddChannelDialog: Saving listing with verification');

      // First verify the channel and update gifts
      const verifyResponse = await supabase.functions.invoke('verify-channel-listing', {
        body: {
          channel_username: channelUsername,
          telegram_user_id: user!.id
        }
      });

      if (verifyResponse.error) {
        console.error('Verification error:', verifyResponse.error);
        throw new Error('Channel verification failed');
      }

      const verifyData = verifyResponse.data;
      
      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Channel verification failed');
      }

      console.log('Channel verified successfully:', verifyData);

      // Now create the listing using the verified channel ID
      const { error } = await supabase
        .from('listings')
        .insert({
          owner_id: user!.id,
          channel_id: verifyData.channel_id,
          price: parseFloat(price),
          status: 'active'
        });

      if (error) {
        throw error;
      }

      // Send confirmation message
      try {
        await supabase.functions.invoke('send-telegram-message', {
          body: {
            to: user!.id,
            message: `✅ Channel ${channelUsername} has been listed for sale at ${price} TON!\n\n🎁 ${verifyData.total_gifts || 0} gifts verified\n📺 Bot admin status confirmed\n\nYour listing is now active in the marketplace.`
          }
        });
      } catch (messageError) {
        console.error('Failed to send confirmation message:', messageError);
      }

      toast({
        title: "Success ✅",
        description: "Channel listed successfully with verification!",
      });

      hapticFeedback?.notification('success');
      resetDialog();
      onOpenChange(false);
      onChannelAdded();

    } catch (error) {
      console.error('Save listing error:', error);
      let errorMessage = 'Failed to save listing';
      
      if (error instanceof Error) {
        if (error.message.includes('verification failed') || error.message.includes('bot')) {
          errorMessage = 'Bot verification failed. Please ensure the bot is still an admin in your channel.';
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'This channel is already listed for sale.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      setStep('price');
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Channel for Sale</DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Channel Username</Label>
              <Input
                id="channel"
                placeholder="@channel_username"
                value={channelUsername}
                onChange={(e) => setChannelUsername(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Enter your public channel username (must start with @)
              </p>
            </div>
            <Button onClick={handleVerifyChannel} className="w-full">
              Verify Ownership
            </Button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-center">Verifying channel ownership...</p>
          </div>
        )}

        {step === 'gifts' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Fetching channel gifts...</span>
            </div>
            
            <GiftsDisplay 
              gifts={gifts}
              groupedGifts={groupedGifts}
              isLoading={gifts.length === 0}
              className="animate-fade-in"
            />
            
            {gifts.length > 0 && (
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Gifts loaded successfully!</span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'price' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Channel verified successfully!</span>
            </div>

            <GiftsDisplay 
              gifts={gifts}
              groupedGifts={groupedGifts}
              className="animate-fade-in"
            />

            <div className="space-y-2">
              <Label htmlFor="price">Sale Price (TON)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <Button onClick={handleSaveListing} className="w-full">
              List Channel for Sale
            </Button>
          </div>
        )}

        {step === 'saving' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-center">Saving listing...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};