import React, { useMemo } from 'react';
import { ThemedDropdown } from './themed-dropdown';
import { ColorDropdown } from './color-dropdown';
import { MultiSelectNFT } from './multi-select-nft';
import { useLanguage } from '@/contexts/LanguageContext';
import useNFTData from '@/hooks/useNFTData';

interface NFTSelectorsProps {
  selectedNFT: string[];
  selectedModel: string;
  selectedBackground: string;
  selectedSymbol: string;
  onNFTChange: (value: string[]) => void;
  onModelChange: (value: string) => void;
  onBackgroundChange: (value: string) => void;
  onSymbolChange: (value: string) => void;
  className?: string;
  showOnlyNFTAndModel?: boolean;
  showOnlyBackgroundAndSymbol?: boolean;
}

export const NFTSelectors: React.FC<NFTSelectorsProps> = ({
  selectedNFT,
  selectedModel,
  selectedBackground,
  selectedSymbol,
  onNFTChange,
  onModelChange,
  onBackgroundChange,
  onSymbolChange,
  className = '',
  showOnlyNFTAndModel = false,
  showOnlyBackgroundAndSymbol = false
}) => {
  const { t } = useLanguage();
  const { data, loading, error, isUsingFallback } = useNFTData();

  // Generate NFT options from hardcoded list
  const nftOptions = useMemo(() => {
    const hardcodedNFTs = [
      "Artisan Brick",
      "Astral Shard",
      "B-Day Candle",
      "Berry Box",
      "Big Year",
      "Bonded Ring",
      "Bow Tie",
      "Bunny Muffin",
      "Candy Cane",
      "Clover Pin",
      "Cookie Heart",
      "Crystal Ball",
      "Cupid Charm",
      "Desk Calendar",
      "Diamond Ring",
      "Durov's Cap",
      "Easter Egg",
      "Electric Skull",
      "Eternal Candle",
      "Eternal Rose",
      "Evil Eye",
      "Flying Broom",
      "Fresh Socks",
      "Gem Signet",
      "Genie Lamp",
      "Ginger Cookie",
      "Hanging Star",
      "Heart Locket",
      "Heroic Helmet",
      "Hex Pot",
      "Holiday Drink",
      "Homemade Cake",
      "Hypno Lollipop",
      "Input Key",
      "Ion Gem",
      "Ionic Dryer",
      "Jack-in-the-Box",
      "Jelly Bunny",
      "Jester Hat",
      "Jingle Bells",
      "Jolly Chimp",
      "Joyful Bundle",
      "Kissed Frog",
      "Light Sword",
      "Lol Pop",
      "Loot Bag",
      "Love Candle",
      "Love Potion",
      "Low Rider",
      "Lunar Snake",
      "Lush Bouquet",
      "Mad Pumpkin",
      "Magic Potion",
      "Mighty Arm",
      "Mini Oscar",
      "Moon Pendant",
      "Nail Bracelet",
      "Neko Helmet",
      "Party Sparkler",
      "Perfume Bottle",
      "Pet Snake",
      "Plush Pepe",
      "Precious Peach",
      "Record Player",
      "Restless Jar",
      "Sakura Flower",
      "Santa Hat",
      "Scared Cat",
      "Sharp Tongue",
      "Signet Ring",
      "Skull Flower",
      "Sky Stilettos",
      "Sleigh Bell",
      "Snake Box",
      "Snoop Cigar",
      "Snoop Dogg",
      "Snow Globe",
      "Snow Mittens",
      "Spiced Wine",
      "Spy Agaric",
      "Star Notepad",
      "Stellar Rocket",
      "Swag Bag",
      "Swiss Watch",
      "Tama Gadget",
      "Top Hat",
      "Toy Bear",
      "Trapped Heart",
      "Valentine Box",
      "Vintage Cigar",
      "Voodoo Doll",
      "Westside Sign",
      "Whip Cupcake",
      "Winter Wreath",
      "Witch Hat",
      "Xmas Stocking"
    ];
    
    return hardcodedNFTs.map(nft => ({
      value: nft,
      label: nft
    }));
  }, []);

  // Generate model options based on selected NFTs with union logic
  const modelOptions = useMemo(() => {
    const options = [{ value: 'all', label: t('all') }];
    
    if (!data?.nfts) return options;
    
    const selectedNFTArray = Array.isArray(selectedNFT) ? selectedNFT : [];
    const validSelectedNFTs = selectedNFTArray.filter(id => id && id !== 'all');
    
    if (validSelectedNFTs.length === 0) {
      // Show all models from all NFTs (global)
      const allModels = new Set<string>();
      const modelMap = new Map<string, string>();
      
      data.nfts.forEach(nft => {
        if (nft.models) {
          nft.models.forEach(model => {
            if (!allModels.has(model.id)) {
              allModels.add(model.id);
              modelMap.set(model.id, model.name);
            }
          });
        }
      });
      
      const sortedModels = Array.from(allModels)
        .map(id => ({ value: id, label: modelMap.get(id) || id }))
        .sort((a, b) => a.label.localeCompare(b.label));
      
      options.push(...sortedModels);
    } else {
      // Show union of models from selected NFTs
      const modelSet = new Set<string>();
      const modelMap = new Map<string, string>();
      
      validSelectedNFTs.forEach(nftId => {
        const nft = data.nfts.find(n => n._id === nftId);
        if (nft?.models) {
          nft.models.forEach(model => {
            if (!modelSet.has(model.id)) {
              modelSet.add(model.id);
              modelMap.set(model.id, model.name);
            }
          });
        }
      });
      
      const sortedModels = Array.from(modelSet)
        .map(id => ({ value: id, label: modelMap.get(id) || id }))
        .sort((a, b) => a.label.localeCompare(b.label));
      
      options.push(...sortedModels);
    }
    
    return options;
  }, [data?.nfts, selectedNFT, t]);

  // Generate background options - using predefined color list
  const backgroundOptions = useMemo(() => {
    const backgroundColors = [
      { "name": "Black", "hex": "#000000" },
      { "name": "Onyx Black", "hex": "#35393C" },
      { "name": "Amber", "hex": "#FFBF00" },
      { "name": "Aquamarine", "hex": "#49D6C6" },
      { "name": "Azure Blue", "hex": "#3FA7FF" },
      { "name": "Battleship Grey", "hex": "#84898C" },
      { "name": "Burgundy", "hex": "#800020" },
      { "name": "Burnt Sienna", "hex": "#E97451" },
      { "name": "Camo Green", "hex": "#6B8E23" },
      { "name": "Cappuccino", "hex": "#A67C52" },
      { "name": "Caramel", "hex": "#C68E17" },
      { "name": "Carrot Juice", "hex": "#E8893E" },
      { "name": "Carmine", "hex": "#960018" },
      { "name": "Celtic Blue", "hex": "#246BCE" },
      { "name": "Chestnut", "hex": "#954535" },
      { "name": "Chocolate", "hex": "#7B3F00" },
      { "name": "Cobalt Blue", "hex": "#0047AB" },
      { "name": "Copper", "hex": "#B87333" },
      { "name": "Coral Red", "hex": "#FF4040" },
      { "name": "Cyberpunk", "hex": "#9D79FF" },
      { "name": "Dark Lilac", "hex": "#7B5AA6" },
      { "name": "Deep Cyan", "hex": "#0F9BAE" },
      { "name": "Desert Sand", "hex": "#EDC9AF" },
      { "name": "Electric Indigo", "hex": "#6F00FF" },
      { "name": "Electric Purple", "hex": "#8F00FF" },
      { "name": "Emerald", "hex": "#50C878" },
      { "name": "English Violet", "hex": "#563C5C" },
      { "name": "Fandango", "hex": "#B53389" },
      { "name": "Feldgrau", "hex": "#4D5D53" },
      { "name": "Fire Engine", "hex": "#CE2029" },
      { "name": "French Blue", "hex": "#0072BB" },
      { "name": "French Violet", "hex": "#8806CE" },
      { "name": "Gunmetal", "hex": "#2A3439" },
      { "name": "Gunship Green", "hex": "#4C6A4F" },
      { "name": "Hunter Green", "hex": "#3F704D" },
      { "name": "Indigo Dye", "hex": "#00416A" },
      { "name": "Ivory White", "hex": "#FFFFF0" },
      { "name": "Jade Green", "hex": "#00A86B" },
      { "name": "Khaki Green", "hex": "#728639" },
      { "name": "Lavender", "hex": "#C09BE6" },
      { "name": "Lemongrass", "hex": "#9DC209" },
      { "name": "Light Olive", "hex": "#B7B470" },
      { "name": "Malachite", "hex": "#0BDA51" },
      { "name": "Marine Blue", "hex": "#3B5BA9" },
      { "name": "Mexican Pink", "hex": "#E4007C" },
      { "name": "Midnight Blue", "hex": "#191970" },
      { "name": "Mint Green", "hex": "#98FF98" },
      { "name": "Moonstone", "hex": "#8EC5C0" },
      { "name": "Mustard", "hex": "#FFDB58" },
      { "name": "Mystic Pearl", "hex": "#C8B7A6" },
      { "name": "Navy Blue", "hex": "#001F54" },
      { "name": "Neon Blue", "hex": "#586BFF" },
      { "name": "Old Gold", "hex": "#CFB53B" },
      { "name": "Orange", "hex": "#FF7A00" },
      { "name": "Pacific Cyan", "hex": "#00B8D9" },
      { "name": "Pacific Green", "hex": "#1CA784" },
      { "name": "Pine Green", "hex": "#01796F" },
      { "name": "Pistachio", "hex": "#93C572" },
      { "name": "Platinum", "hex": "#E5E4E2" },
      { "name": "Pure Gold", "hex": "#E6B325" },
      { "name": "Purple", "hex": "#7D4CDB" },
      { "name": "Ranger Green", "hex": "#4D6A3D" },
      { "name": "Raspberry", "hex": "#E30B5C" },
      { "name": "Rifle Green", "hex": "#444C38" },
      { "name": "Roman Silver", "hex": "#838996" },
      { "name": "Rosewood", "hex": "#65000B" },
      { "name": "Sapphire", "hex": "#0F52BA" },
      { "name": "Satin Gold", "hex": "#D4AF37" },
      { "name": "Seal Brown", "hex": "#59260B" },
      { "name": "Shamrock Green", "hex": "#009E60" },
      { "name": "Silver Blue", "hex": "#6D9BC3" },
      { "name": "Sky Blue", "hex": "#87CEEB" },
      { "name": "Steel Grey", "hex": "#71797E" },
      { "name": "Strawberry", "hex": "#E44B5E" },
      { "name": "Tactical Pine", "hex": "#3E5F43" },
      { "name": "Tomato", "hex": "#FF6347" },
      { "name": "Turquoise", "hex": "#40E0D0" }
    ];
    
    const options = [{ value: 'all', label: t('all') }];
    
    // Add background colors respecting the exact order from JSON
    options.push(...backgroundColors.map(color => ({
      value: color.name.toLowerCase().replace(/\s+/g, '-'),
      label: color.name,
      hex: color.hex
    })));
    
    return options;
  }, [t]);

  // Generate symbol options - global, show ALL
  const symbolOptions = useMemo(() => {
    const options = [{ value: 'all', label: t('all') }];
    if (data?.symbols && data.symbols.length > 0) {
      // Show ALL symbols (no slicing)
      options.push(...data.symbols.map(symbol => ({
        value: symbol.id,
        label: `${symbol.emoji} ${symbol.name}`
      })));
    }
    return options;
  }, [data?.symbols, t]);

  // Handle NFT change and reset model selection
  const handleNFTChange = (value: string[]) => {
    onNFTChange(value);
    // Always reset model to "all" when NFT changes
    onModelChange('all');
  };

  if (loading) {
    const skeletonCount = showOnlyNFTAndModel || showOnlyBackgroundAndSymbol ? 2 : 4;
    return (
      <div className={`grid grid-cols-2 gap-3 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="h-12 bg-surface border border-border rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    console.warn('NFT data loading error:', error);
  }

  // Show only NFT and Model
  if (showOnlyNFTAndModel) {
    return (
      <div className={`grid grid-cols-2 gap-3 ${className}`}>
        {/* NFT Multi-Selection */}
        <MultiSelectNFT
          options={nftOptions}
          value={selectedNFT}
          onChange={handleNFTChange}
          placeholder={t('nfts')}
        />

        {/* Model Selection - filtered by NFT */}
        <ThemedDropdown
          label={t('model')}
          value={selectedModel}
          options={modelOptions}
          onChange={onModelChange}
          id="model-select"
        />
      </div>
    );
  }

  // Show only Background and Symbol
  if (showOnlyBackgroundAndSymbol) {
    return (
      <div className={`grid grid-cols-2 gap-3 ${className}`}>
        {/* Background Selection - global */}
        <ColorDropdown
          label={t('background')}
          value={selectedBackground}
          options={backgroundOptions}
          onChange={onBackgroundChange}
          id="background-select"
        />

        {/* Symbol Selection - global */}
        <ThemedDropdown
          label={t('symbol')}
          value={selectedSymbol}
          options={symbolOptions}
          onChange={onSymbolChange}
          id="symbol-select"
        />
      </div>
    );
  }

  // Show all selectors (default)
  return (
    <div className={className}>
      {isUsingFallback && (
        <div className="mb-3 p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
          ⚠️ Using offline gift data. Some options may be limited.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
      {/* NFT Multi-Selection */}
      <MultiSelectNFT
        options={nftOptions}
        value={selectedNFT}
        onChange={handleNFTChange}
        placeholder={t('nfts')}
      />

      {/* Model Selection - filtered by NFT */}
      <ThemedDropdown
        label={t('model')}
        value={selectedModel}
        options={modelOptions}
        onChange={onModelChange}
        id="model-select"
      />

      {/* Background Selection - global */}
      <ColorDropdown
        label={t('background')}
        value={selectedBackground}
        options={backgroundOptions}
        onChange={onBackgroundChange}
        id="background-select"
      />

      {/* Symbol Selection - global */}
      <ThemedDropdown
        label={t('symbol')}
        value={selectedSymbol}
        options={symbolOptions}
        onChange={onSymbolChange}
        id="symbol-select"
      />
      </div>
    </div>
  );
};

export default NFTSelectors;