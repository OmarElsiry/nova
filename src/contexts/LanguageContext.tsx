import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'ar' | 'en' | 'ru' | 'zh' | 'fr' | 'de' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  ar: {
    // Navigation
    market: 'السوق',
    auctions: 'المزادات',
    activities: 'الأنشطة',
    myChannels: 'مجموعتي',
    profile: 'الملف الشخصي',
    
    // Header
    connectWallet: 'ربط المحفظة',
    
    // Market
    searchGifts: 'البحث عن الهدايا...',
    all: 'الكل',
    deliciousCake: 'كعكة لذيذة 🎂',
    goldenStar: 'نجمة ذهبية ⭐',
    redHeart: 'قلب أحمر ❤️',
    goldenCrown: 'تاج ذهبي 👑',
    diamond: 'ماس 💎',
    newest: 'الأحدث',
    oldest: 'الأقدم',
    priceLowHigh: 'السعر: منخفض→مرتفع',
    priceHighLow: 'السعر: مرتفع→منخفض',
    buy: 'شراء',
    
    // Auctions
    endingSoon: 'ينتهي قريباً',
    latest: 'الأحدث',
    highestBid: 'أعلى عرض',
    latestBid: 'آخر عرض',
    bid: 'عرض',
    noActiveAuctions: 'لا توجد مزادات نشطة',
    
    // Activities  
    channels: 'القنوات',
    gifts: 'الهدايا',
    purchase: 'شراء',
    noResults: 'لا توجد نتائج',
    
    // My Channels
    owned: 'مملوكة',
    forSale: 'للبيع',
    addChannel: 'إضافة قناة',
    
    // Profile
    totalVolume: 'إجمالي الحجم',
    bought: 'المشتريات',
    sold: 'المبيعات',
    settings: 'الإعدادات',
    language: 'اللغة',
    theme: 'السمة',
    quickNavigation: 'التنقل السريع',
    topTraders: 'أفضل المتداولين',
    referralStatistics: 'إحصائيات الإحالة',
    
    // Languages
    arabic: 'العربية',
    english: 'English',
    russian: 'Русский',
    chinese: '中文',
    french: 'Français',
    german: 'Deutsch',
    spanish: 'Español',
    
    // Themes
    lightTheme: 'فاتح',
    darkTheme: 'داكن',
    blueTheme: 'أزرق',
    goldTheme: 'ذهبي',
    purpleTheme: 'بنفسجي',
    royalRedTheme: 'أحمر ملكي',
    deepTealTheme: 'أزرق عميق',
    blossomPinkTheme: 'وردي',
    paleChampagneTheme: 'فاتح',
    cocoaLuxeTheme: 'كاكاو',
    
    // Referral
    earnedTon: 'المكتسب (TON)',
    // Collection
    fractionalNFT: "Fractional NFT",
    friendsVolume: 'حجم الأصدقاء',
    inviteFriends: 'دعوة الأصدقاء',
    referralLink: 'رابط الدعوة الخاص بك',
    inviteInstruction: 'ادع أصدقاءك باستخدام رابط الدعوة الخاص بك',
    earnPercentage: 'احصل على نسبة من معاملاتهم على المنصة',
    
    // NFT Selection
    selected: 'محدد',
    
    // Top Traders
    topTradersTitle: 'أفضل 100 متداول',
    tradingVolume: 'حجم التداول',
    
    // Common
    apply: 'تطبيق',
    clear: 'مسح',
    from: 'من',
    to: 'إلى',
    loading: 'جاري التحميل...',
    retry: 'إعادة المحاولة',
    confirm: 'تأكيد',
    reset: 'إعادة تعيين',
    expand: 'توسيع',
    collapse: 'طي',
    filtersReset: 'تم إعادة تعيين المرشحات',
    allFiltersCleared: 'تم مسح جميع المرشحات',
    withNFT: 'مع NFT',
    error: 'خطأ',
    success: 'نجح',
    
    // Wallet terms
    disconnect: 'قطع الاتصال',
    deposit: 'إيداع',
    withdraw: 'سحب',
    balance: 'الرصيد',
    availableBalance: 'الرصيد المتاح',
    amount: 'المبلغ',
    walletAddress: 'عنوان المحفظة',
    depositAddress: 'عنوان الإيداع',
    minimumAmount: 'الحد الأدنى 1 TON',
    minimumDepositAmount: 'الحد الأدنى للإيداع هو 1 TON',
    minimumDepositInfo: 'الحد الأدنى للإيداع هو 1 TON',
    depositInstructions: 'قم بتحويل المبلغ إلى هذا العنوان',
    confirmDeposit: 'تأكيد الإيداع',
    confirmWithdraw: 'تأكيد السحب',
    processing: 'جاري المعالجة...',
    depositSuccessful: 'تم الإيداع بنجاح',
    withdrawalSuccessful: 'تم السحب بنجاح',
    depositFailed: 'فشل الإيداع',
    withdrawalFailed: 'فشل السحب',
    invalidAmount: 'مبلغ غير صحيح',
    insufficientBalance: 'رصيد غير كافي',
    walletAddressRequired: 'عنوان المحفظة مطلوب',
    enterAmount: 'أدخل المبلغ',
    enterWalletAddress: 'أدخل عنوان المحفظة',
    walletAddressCopied: 'تم نسخ عنوان المحفظة',
  },
  en: {
    // Navigation
    market: 'Market',
    auctions: 'Auctions',
    activities: 'Activities',
    myChannels: 'My Collection',
    profile: 'Profile',
    
    // Header
    connectWallet: 'Connect Wallet',
    
    // Market
    searchGifts: 'Search gifts...',
    all: 'All',
    deliciousCake: 'Delicious cake 🎂',
    goldenStar: 'Golden star ⭐',
    redHeart: 'Red heart ❤️',
    goldenCrown: 'Golden crown 👑',
    diamond: 'Diamond 💎',
    newest: 'Newest',
    oldest: 'Oldest',
    priceLowHigh: 'Price: Low→High',
    priceHighLow: 'Price: High→Low',
    buy: 'Buy',
    
    // Auctions
    endingSoon: 'Ending Soon',
    latest: 'Latest',
    highestBid: 'Highest Bid',
    latestBid: 'Latest Bid',
    bid: 'Bid',
    noActiveAuctions: 'No active auctions',
    
    // Activities
    channels: 'Channels',
    gifts: 'Gifts',
    purchase: 'Purchase',
    noResults: 'No results',
    
    // My Channels
    owned: 'Owned',
    forSale: 'For Sale',
    addChannel: 'Add Channel',
    
    // Profile
    totalVolume: 'Total Volume',
    bought: 'Bought',
    sold: 'Sold',
    settings: 'Settings',
    language: 'Language',
    theme: 'Theme',
    other: 'Other',
    topTraders: 'Top Traders',
    referralStatistics: 'Referral Statistics',
    
    // Sort options
    sortLatest: 'Latest',
    sortPriceHighLow: 'Price: high to low',
    sortPriceLowHigh: 'Price: low to high',
    sortGiftIdAsc: 'Gift ID: Ascending',
    sortGiftIdDesc: 'Gift ID: Descending',
    sortQuantityHighLow: 'Quantity: high to low',
    sortQuantityLowHigh: 'Quantity: low to high',
    
    // Filters
    nfts: 'NFTs',
    model: 'Model',
    background: 'Background',
    type: 'Type',
    sort: 'Sort',
    giftId: 'Gift ID',
    symbol: 'Symbol',
    price: 'Price',
    quantity: 'Quantity',
    showUpgradeGifts: 'Show upgrade Gifts',
    
    // Actions
    edit: 'Edit',
    cancel: 'Cancel',
    confirmPrice: 'Confirm',
    listingCancelled: 'Listing cancelled',
    priceUpdated: 'Price updated',
    
    // Languages
    arabic: 'العربية',
    english: 'English',
    russian: 'Русский',
    chinese: '中文',
    french: 'Français',
    german: 'Deutsch',
    spanish: 'Español',
    
    // Themes
    lightTheme: 'Light',
    darkTheme: 'Dark',
    blueTheme: 'Blue',
    goldTheme: 'Gold',
    purpleTheme: 'Purple',
    royalRedTheme: 'Royal Red',
    deepTealTheme: 'Deep Teal',
    blossomPinkTheme: 'Pink',
    paleChampagneTheme: 'Pale',
    cocoaLuxeTheme: 'Cocoa',
    
    // Referral
    earnedTon: 'Earned (TON)',
    referrals: 'Referrals',
    inviteFriends: 'Invite friends',
    referralLink: 'Your referral link',
    inviteInstruction: 'Invite your friends using your referral link',
    earnPercentage: 'Earn a percentage from their transactions',
    copied: 'Copied',
    
    // Top Traders
    topTradersTitle: 'Top 100 Traders',
    tradingVolume: 'Trading Volume',
    
    // Common
    apply: 'Apply',
    clear: 'Clear',
    from: 'From',
    to: 'To',
    loading: 'Loading...',
    retry: 'Retry',
    confirm: 'Confirm',
    reset: 'Reset',
    expand: 'Expand',
    collapse: 'Collapse',
    filtersReset: 'Filters Reset',
    allFiltersCleared: 'All filters have been cleared',
    withNFT: 'With NFT',
    error: 'Error',
    success: 'Success',
    
    // Wallet terms
    disconnect: 'Disconnect',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    balance: 'Balance',
    availableBalance: 'Available Balance',
    amount: 'Amount',
    walletAddress: 'Wallet Address',
    depositAddress: 'Deposit Address',
    minimumAmount: 'Minimum 1 TON',
    minimumDepositAmount: 'Minimum deposit amount is 1 TON',
    minimumDepositInfo: 'Minimum deposit amount is 1 TON',
    depositInstructions: 'Transfer the amount to this address',
    confirmDeposit: 'Confirm Deposit',
    confirmWithdraw: 'Confirm Withdraw',
    processing: 'Processing...',
    depositSuccessful: 'Deposit successful',
    withdrawalSuccessful: 'Withdrawal successful',
    depositFailed: 'Deposit failed',
    withdrawalFailed: 'Withdrawal failed',
    invalidAmount: 'Invalid amount',
    insufficientBalance: 'Insufficient balance',
    walletAddressRequired: 'Wallet address is required',
    enterAmount: 'Enter amount',
    enterWalletAddress: 'Enter wallet address',
    walletAddressCopied: 'Wallet address copied',
    
    // NFT Selection
    selected: 'Selected',
  },
  ru: {
    // Navigation
    market: 'Рынок',
    auctions: 'Аукционы',
    activities: 'Активность',
    myChannels: 'Мои каналы',
    profile: 'Профиль',
    
    // Header
    connectWallet: 'Подключить кошелек',
    
    // Market
    searchGifts: 'Поиск подарков...',
    all: 'Все',
    deliciousCake: 'Вкусный торт 🎂',
    goldenStar: 'Золотая звезда ⭐',
    redHeart: 'Красное сердце ❤️',
    goldenCrown: 'Золотая корона 👑',
    diamond: 'Бриллиант 💎',
    newest: 'Новые',
    oldest: 'Старые',
    priceLowHigh: 'Цена: По возрастанию',
    priceHighLow: 'Цена: По убыванию',
    buy: 'Купить',
    
    // Auctions
    endingSoon: 'Скоро закончатся',
    latest: 'Последние',
    highestBid: 'Наивысшая ставка',
    latestBid: 'Последняя ставка',
    bid: 'Ставка',
    noActiveAuctions: 'Нет активных аукционов',
    
    // Activities
    channels: 'Каналы',
    gifts: 'Подарки',
    purchase: 'Купить',
    noResults: 'Нет результатов',
    
    // My Channels
    owned: 'Владею',
    forSale: 'На продажу',
    addChannel: 'Добавить канал',
    
    // Profile
    totalVolume: 'Общий объем',
    bought: 'Куплено',
    sold: 'Продано',
    settings: 'Настройки',
    language: 'Язык',
    theme: 'Тема',
    quickNavigation: 'Быстрая навигация',
    topTraders: 'Топ трейдеров',
    referralStatistics: 'Реферальная статистика',
    
    // Languages
    arabic: 'العربية',
    english: 'English',
    russian: 'Русский',
    chinese: '中文',
    french: 'Français',
    german: 'Deutsch',
    spanish: 'Español',
    
    // Themes
    lightTheme: 'Светлая',
    darkTheme: 'Темная',
    blueTheme: 'Синяя',
    goldTheme: 'Золотая',
    purpleTheme: 'Фиолетовая',
    royalRedTheme: 'Королевский красный',
    deepTealTheme: 'Глубокий бирюзовый',
    blossomPinkTheme: 'Розовая',
    paleChampagneTheme: 'Бледная',
    cocoaLuxeTheme: 'Какао',
    
    // Referral
    earnedTon: 'Заработано (TON)',
    referrals: 'Рефералы',
    friendsVolume: 'Объем друзей',
    inviteFriends: 'Пригласить друзей',
    referralLink: 'Ваша реферальная ссылка',
    inviteInstruction: 'Пригласите друзей по вашей реферальной ссылке',
    earnPercentage: 'Получайте процент с их транзакций',
    
    // Top Traders
    topTradersTitle: 'Топ 100 трейдеров',
    tradingVolume: 'Объем торгов',
    
    // Common
    apply: 'Применить',
    clear: 'Очистить',
    from: 'От',
    to: 'До',
    loading: 'Загрузка...',
    retry: 'Повторить',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
    reset: 'Сбросить',
    expand: 'Развернуть',
    collapse: 'Свернуть',
    filtersReset: 'Фильтры сброшены',
    allFiltersCleared: 'Все фильтры очищены',
    withNFT: 'С NFT',
    
    // NFT Selection
    selected: 'Выбрано',
  },
  zh: {
    // Navigation
    market: '市场',
    auctions: '拍卖',
    activities: '活动',
    myChannels: '我的频道',
    profile: '个人资料',
    
    // Header
    connectWallet: '连接钱包',
    
    // Market
    searchGifts: '搜索礼品...',
    all: '全部',
    deliciousCake: '美味蛋糕 🎂',
    goldenStar: '金星 ⭐',
    redHeart: '红心 ❤️',
    goldenCrown: '金冠 👑',
    diamond: '钻石 💎',
    newest: '最新',
    oldest: '最旧',
    priceLowHigh: '价格：低到高',
    priceHighLow: '价格：高到低',
    buy: '购买',
    
    // Auctions
    endingSoon: '即将结束',
    latest: '最新',
    highestBid: '最高出价',
    latestBid: '最新出价',
    bid: '出价',
    noActiveAuctions: '没有活跃的拍卖',
    
    // Activities
    channels: '频道',
    gifts: '礼品',
    purchase: '购买',
    noResults: '无结果',
    
    // My Channels
    owned: '拥有',
    forSale: '待售',
    addChannel: '添加频道',
    
    // Profile
    totalVolume: '总交易量',
    bought: '已购买',
    sold: '已出售',
    settings: '设置',
    language: '语言',
    theme: '主题',
    quickNavigation: '快速导航',
    topTraders: '顶级交易员',
    referralStatistics: '推荐统计',
    
    // Languages
    arabic: 'العربية',
    english: 'English',
    russian: 'Русский',
    chinese: '中文',
    french: 'Français',
    german: 'Deutsch',
    spanish: 'Español',
    
    // Themes
    lightTheme: '浅色',
    darkTheme: '深色',
    blueTheme: '蓝色',
    goldTheme: '金色',
    purpleTheme: '紫色',
    royalRedTheme: '皇家红',
    deepTealTheme: '深青色',
    blossomPinkTheme: '粉色',
    paleChampagneTheme: '淡色',
    cocoaLuxeTheme: '可可',
    
    // Referral
    earnedTon: '已赚取 (TON)',
    referrals: '推荐',
    friendsVolume: '朋友交易量',
    inviteFriends: '邀请朋友',
    referralLink: '您的推荐链接',
    inviteInstruction: '使用您的推荐链接邀请朋友',
    earnPercentage: '从他们的交易中获得百分比',
    
    // Top Traders
    topTradersTitle: '前100名交易员',
    tradingVolume: '交易量',
    
    // Common
    apply: '应用',
    clear: '清除',
    from: '从',
    to: '到',
    loading: '加载中...',
    retry: '重试',
    confirm: '确认',
    cancel: '取消',
    reset: '重置',
    expand: '展开',
    collapse: '折叠',
    filtersReset: '筛选已重置',
    allFiltersCleared: '所有筛选已清除',
    withNFT: '带NFT',
    
    // NFT Selection
    selected: '已选择',
  },
  fr: {
    // Navigation
    market: 'Marché',
    auctions: 'Enchères',
    activities: 'Activités',
    myChannels: 'Mes chaînes',
    profile: 'Profil',
    
    // Header
    connectWallet: 'Connecter le portefeuille',
    
    // Market
    searchGifts: 'Rechercher des cadeaux...',
    all: 'Tous',
    deliciousCake: 'Gâteau délicieux 🎂',
    goldenStar: 'Étoile dorée ⭐',
    redHeart: 'Cœur rouge ❤️',
    goldenCrown: 'Couronne dorée 👑',
    diamond: 'Diamant 💎',
    newest: 'Plus récent',
    oldest: 'Plus ancien',
    priceLowHigh: 'Prix : Bas→Haut',
    priceHighLow: 'Prix : Haut→Bas',
    buy: 'Acheter',
    
    // Auctions
    endingSoon: 'Se termine bientôt',
    latest: 'Dernier',
    highestBid: 'Offre la plus élevée',
    latestBid: 'Dernière offre',
    bid: 'Enchérir',
    noActiveAuctions: 'Aucune enchère active',
    
    // Activities
    channels: 'Chaînes',
    gifts: 'Cadeaux',
    purchase: 'Acheter',
    noResults: 'Aucun résultat',
    
    // My Channels
    owned: 'Possédé',
    forSale: 'À vendre',
    addChannel: 'Ajouter une chaîne',
    
    // Profile
    totalVolume: 'Volume total',
    bought: 'Acheté',
    sold: 'Vendu',
    settings: 'Paramètres',
    language: 'Langue',
    theme: 'Thème',
    quickNavigation: 'Navigation rapide',
    topTraders: 'Meilleurs traders',
    referralStatistics: 'Statistiques de parrainage',
    
    // Languages
    arabic: 'العربية',
    english: 'English',
    russian: 'Русский',
    chinese: '中文',
    french: 'Français',
    german: 'Deutsch',
    spanish: 'Español',
    
    // Themes
    lightTheme: 'Clair',
    darkTheme: 'Sombre',
    blueTheme: 'Bleu',
    goldTheme: 'Or',
    purpleTheme: 'Violet',
    royalRedTheme: 'Rouge Royal',
    deepTealTheme: 'Sarcelle Profond',
    blossomPinkTheme: 'Rose',
    paleChampagneTheme: 'Pâle',
    cocoaLuxeTheme: 'Cacao',
    
    // Referral
    earnedTon: 'Gagné (TON)',
    referrals: 'Parrainages',
    friendsVolume: 'Volume des amis',
    inviteFriends: 'Inviter des amis',
    referralLink: 'Votre lien de parrainage',
    inviteInstruction: 'Invitez vos amis avec votre lien de parrainage',
    earnPercentage: 'Gagnez un pourcentage de leurs transactions',
    
    // Top Traders
    topTradersTitle: 'Top 100 des traders',
    tradingVolume: 'Volume de trading',
    
    // Common
    apply: 'Appliquer',
    clear: 'Effacer',
    from: 'De',
    to: 'À',
    loading: 'Chargement...',
    retry: 'Réessayer',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    reset: 'Réinitialiser',
    expand: 'Développer',
    collapse: 'Réduire',
    filtersReset: 'Filtres réinitialisés',
    allFiltersCleared: 'Tous les filtres ont été effacés',
    withNFT: 'Avec NFT',
    
    // NFT Selection  
    selected: 'Sélectionné',
  },
  de: {
    // Navigation
    market: 'Markt',
    auctions: 'Auktionen',
    activities: 'Aktivitäten',
    myChannels: 'Meine Kanäle',
    profile: 'Profil',
    
    // Header
    connectWallet: 'Wallet verbinden',
    
    // Market
    searchGifts: 'Geschenke suchen...',
    all: 'Alle',
    deliciousCake: 'Leckerer Kuchen 🎂',
    goldenStar: 'Goldener Stern ⭐',
    redHeart: 'Rotes Herz ❤️',
    goldenCrown: 'Goldene Krone 👑',
    diamond: 'Diamant 💎',
    newest: 'Neueste',
    oldest: 'Älteste',
    priceLowHigh: 'Preis: Niedrig→Hoch',
    priceHighLow: 'Preis: Hoch→Niedrig',
    buy: 'Kaufen',
    
    // Auctions
    endingSoon: 'Endet bald',
    latest: 'Neueste',
    highestBid: 'Höchstes Gebot',
    latestBid: 'Neuestes Gebot',
    bid: 'Bieten',
    noActiveAuctions: 'Keine aktiven Auktionen',
    
    // Activities
    channels: 'Kanäle',
    gifts: 'Geschenke',
    purchase: 'Kaufen',
    noResults: 'Keine Ergebnisse',
    
    // My Channels
    owned: 'Besessen',
    forSale: 'Zu verkaufen',
    addChannel: 'Kanal hinzufügen',
    
    // Profile
    totalVolume: 'Gesamtvolumen',
    bought: 'Gekauft',
    sold: 'Verkauft',
    settings: 'Einstellungen',
    language: 'Sprache',
    theme: 'Thema',
    quickNavigation: 'Schnellnavigation',
    topTraders: 'Top-Händler',
    referralStatistics: 'Empfehlungsstatistiken',
    
    // Languages
    arabic: 'العربية',
    english: 'English',
    russian: 'Русский',
    chinese: '中文',
    french: 'Français',
    german: 'Deutsch',
    spanish: 'Español',
    
    // Themes
    lightTheme: 'Hell',
    darkTheme: 'Dunkel',
    blueTheme: 'Blau',
    goldTheme: 'Gold',
    purpleTheme: 'Lila',
    royalRedTheme: 'Königsrot',
    deepTealTheme: 'Tiefes Petrol',
    blossomPinkTheme: 'Rosa',
    paleChampagneTheme: 'Hell',
    cocoaLuxeTheme: 'Kakao',
    
    // Referral
    earnedTon: 'Verdient (TON)',
    referrals: 'Empfehlungen',
    friendsVolume: 'Freunde-Volumen',
    inviteFriends: 'Freunde einladen',
    referralLink: 'Ihr Empfehlungslink',
    inviteInstruction: 'Laden Sie Freunde mit Ihrem Empfehlungslink ein',
    earnPercentage: 'Verdienen Sie einen Prozentsatz von ihren Transaktionen',
    
    // Top Traders
    topTradersTitle: 'Top 100 Händler',
    tradingVolume: 'Handelsvolumen',
    
    // Common
    apply: 'Anwenden',
    clear: 'Löschen',
    from: 'Von',
    to: 'Bis',
    loading: 'Wird geladen...',
    retry: 'Wiederholen',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
    reset: 'Zurücksetzen',
    expand: 'Erweitern',
    collapse: 'Einklappen',
    filtersReset: 'Filter zurückgesetzt',
    allFiltersCleared: 'Alle Filter wurden gelöscht',
    withNFT: 'Mit NFT',
    
    // NFT Selection
    selected: 'Ausgewählt',
  },
  es: {
    // Navigation
    market: 'Mercado',
    auctions: 'Subastas',
    activities: 'Actividades',
    myChannels: 'Mis canales',
    profile: 'Perfil',
    
    // Header
    connectWallet: 'Conectar billetera',
    
    // Market
    searchGifts: 'Buscar regalos...',
    all: 'Todos',
    deliciousCake: 'Pastel delicioso 🎂',
    goldenStar: 'Estrella dorada ⭐',
    redHeart: 'Corazón rojo ❤️',
    goldenCrown: 'Corona dorada 👑',
    diamond: 'Diamante 💎',
    newest: 'Más reciente',
    oldest: 'Más antiguo',
    priceLowHigh: 'Precio: Bajo→Alto',
    priceHighLow: 'Precio: Alto→Bajo',
    buy: 'Comprar',
    
    // Auctions
    endingSoon: 'Terminando pronto',
    latest: 'Último',
    highestBid: 'Oferta más alta',
    latestBid: 'Última oferta',
    bid: 'Ofertar',
    noActiveAuctions: 'No hay subastas activas',
    
    // Activities
    channels: 'Canales',
    gifts: 'Regalos',
    purchase: 'Comprar',
    noResults: 'Sin resultados',
    
    // My Channels
    owned: 'Poseído',
    forSale: 'En venta',
    addChannel: 'Agregar canal',
    
    // Profile
    totalVolume: 'Volumen total',
    bought: 'Comprado',
    sold: 'Vendido',
    settings: 'Configuración',
    language: 'Idioma',
    theme: 'Tema',
    quickNavigation: 'Navegación rápida',
    topTraders: 'Mejores comerciantes',
    referralStatistics: 'Estadísticas de referidos',
    
    // Languages
    arabic: 'العربية',
    english: 'English',
    russian: 'Русский',
    chinese: '中文',
    french: 'Français',
    german: 'Deutsch',
    spanish: 'Español',
    
    // Themes
    lightTheme: 'Claro',
    darkTheme: 'Oscuro',
    blueTheme: 'Azul',
    goldTheme: 'Dorado',
    purpleTheme: 'Morado',
    royalRedTheme: 'Rojo Real',
    deepTealTheme: 'Verde Azulado Profundo',
    blossomPinkTheme: 'Rosa',
    paleChampagneTheme: 'Pálido',
    cocoaLuxeTheme: 'Cacao',
    
    // Referral
    earnedTon: 'Ganado (TON)',
    referrals: 'Referencias',
    friendsVolume: 'Volumen de amigos',
    inviteFriends: 'Invitar amigos',
    referralLink: 'Tu enlace de referido',
    inviteInstruction: 'Invita a tus amigos usando tu enlace de referido',
    earnPercentage: 'Gana un porcentaje de sus transacciones',
    
    // Top Traders
    topTradersTitle: 'Top 100 comerciantes',
    tradingVolume: 'Volumen de comercio',
    
    // Common
    apply: 'Aplicar',
    clear: 'Limpiar',
    from: 'Desde',
    to: 'Hasta',
    loading: 'Cargando...',
    retry: 'Reintentar',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    reset: 'Restablecer',
    expand: 'Expandir',
    collapse: 'Contraer',
    filtersReset: 'Filtros restablecidos',
    allFiltersCleared: 'Todos los filtros han sido eliminados',
    withNFT: 'Con NFT',
    
    // NFT Selection
    selected: 'Seleccionado',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Set direction for RTL languages
    const isRTL = language === 'ar';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Store language in localStorage
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};