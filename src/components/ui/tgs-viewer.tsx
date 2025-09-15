import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { gunzip } from 'fflate';
import { cn } from '@/lib/utils';

interface TGSViewerProps {
  sticker_base64?: string;
  emoji: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TGSViewer: React.FC<TGSViewerProps> = ({ 
  sticker_base64, 
  emoji, 
  className,
  size = 'md' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  useEffect(() => {
    console.log('TGSViewer: Component props received', {
      hasSticker: !!sticker_base64,
      stickerLength: sticker_base64?.length,
      emoji,
      size,
      error,
      hasContainer: !!containerRef.current
    });

    if (!sticker_base64 || !containerRef.current || error) {
      console.log('TGS Viewer: Early exit', { 
        hasSticker: !!sticker_base64, 
        hasContainer: !!containerRef.current, 
        error 
      });
      setLoading(false);
      return;
    }

    const processSticker = async () => {
      try {
        console.log('TGS Viewer: Attempting to load sticker', { 
          hasBase64: !!sticker_base64, 
          base64Length: sticker_base64?.length,
          emoji 
        });

        // Convert base64 to binary data
        let binaryData;
        try {
          binaryData = atob(sticker_base64);
        } catch (base64Error) {
          console.error('TGS Viewer: Base64 decode error:', base64Error);
          throw new Error('Invalid base64 format');
        }

        // Convert string to Uint8Array
        const uint8Array = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          uint8Array[i] = binaryData.charCodeAt(i);
        }

        let animationData;
        let jsonString = binaryData;

        // Check if it's gzip compressed (magic bytes: 1f 8b)
        if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
          console.log('TGS Viewer: Detected gzip compressed TGS, decompressing...');
          try {
            await new Promise<void>((resolve, reject) => {
              gunzip(uint8Array, (err, decompressed) => {
                if (err) {
                  reject(err);
                } else {
                  jsonString = new TextDecoder().decode(decompressed);
                  console.log('TGS Viewer: Successfully decompressed TGS data');
                  resolve();
                }
              });
            });
          } catch (gzipError) {
            console.error('TGS Viewer: Gzip decompression failed:', gzipError);
            throw new Error('Failed to decompress TGS data');
          }
        }

        // Parse the JSON animation data
        try {
          animationData = JSON.parse(jsonString);
          console.log('TGS Viewer: Animation data parsed successfully');
        } catch (parseError) {
          console.error('TGS Viewer: JSON parse error:', parseError);
          throw new Error('Invalid TGS JSON format');
        }

        if (!containerRef.current) return;

        const animation = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: animationData,
        });

        setLoading(false);
        console.log('TGS Viewer: Animation loaded successfully');

        return () => {
          animation.destroy();
        };
      } catch (err) {
        console.error('TGS Viewer: Error loading animation:', err, {
          sticker_base64: sticker_base64?.substring(0, 100) + '...',
          emoji
        });
        setError(true);
        setLoading(false);
      }
    };

    processSticker();
  }, [sticker_base64, error, loading]);

  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted animate-pulse rounded-lg",
        sizeClasses[size],
        className
      )}>
        <div className="text-xs text-muted-foreground">...</div>
      </div>
    );
  }

  if (error || !sticker_base64) {
    return (
      <div className={cn(
        "flex items-center justify-center text-lg bg-muted/50 rounded-lg",
        sizeClasses[size],
        className
      )}>
        {emoji}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    />
  );
};

export default TGSViewer;