import { Address } from '@ton/core';

export interface WalletLinkOptions {
  amount?: string;
  comment?: string;
  returnUrl?: string;
}

export interface GeneratedWalletLink {
  tonkeeperLink: string;
  tonwalletLink: string;
  universalLink: string;
  qrCodeData: string;
}

export class WalletLinkGenerator {
  private static instance: WalletLinkGenerator;

  public static getInstance(): WalletLinkGenerator {
    if (!WalletLinkGenerator.instance) {
      WalletLinkGenerator.instance = new WalletLinkGenerator();
    }
    return WalletLinkGenerator.instance;
  }

  /**
   * Generate wallet-specific deep links for deposits
   */
  generateDepositLinks(
    toAddress: string,
    options: WalletLinkOptions = {}
  ): GeneratedWalletLink {
    try {
      // Validate TON address
      Address.parse(toAddress);
    } catch (error) {
      throw new Error('Invalid TON address format');
    }

    const { amount, comment, returnUrl } = options;
    
    // Base parameters
    const params = new URLSearchParams();
    if (amount) {
      // Convert TON to nanoTON
      const nanoAmount = (parseFloat(amount) * 1000000000).toString();
      params.append('amount', nanoAmount);
    }
    if (comment) {
      params.append('text', comment);
    }
    if (returnUrl) {
      params.append('return', returnUrl);
    }

    const queryString = params.toString();
    const baseUrl = `ton://transfer/${toAddress}`;
    const fullUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    // Generate wallet-specific links
    const tonkeeperLink = this.generateTonkeeperLink(toAddress, options);
    const tonwalletLink = this.generateTonwalletLink(toAddress, options);
    const universalLink = fullUrl;

    return {
      tonkeeperLink,
      tonwalletLink,
      universalLink,
      qrCodeData: universalLink
    };
  }

  /**
   * Generate Tonkeeper-specific deep link
   */
  private generateTonkeeperLink(toAddress: string, options: WalletLinkOptions): string {
    const { amount, comment } = options;
    
    const params = new URLSearchParams();
    params.append('to', toAddress);
    
    if (amount) {
      params.append('amount', amount);
    }
    if (comment) {
      params.append('text', comment);
    }

    return `https://app.tonkeeper.com/transfer/${toAddress}?${params.toString()}`;
  }

  /**
   * Generate TON Wallet-specific deep link
   */
  private generateTonwalletLink(toAddress: string, options: WalletLinkOptions): string {
    const { amount, comment } = options;
    
    const params = new URLSearchParams();
    if (amount) {
      // Convert TON to nanoTON for TON Wallet
      const nanoAmount = (parseFloat(amount) * 1000000000).toString();
      params.append('amount', nanoAmount);
    }
    if (comment) {
      params.append('text', comment);
    }

    const queryString = params.toString();
    const baseUrl = `tonwallet://transfer/${toAddress}`;
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Generate QR code-friendly URL
   */
  generateQRCodeUrl(toAddress: string, options: WalletLinkOptions = {}): string {
    const links = this.generateDepositLinks(toAddress, options);
    return links.universalLink;
  }

  /**
   * Generate multiple wallet options for user choice
   */
  generateWalletOptions(toAddress: string, options: WalletLinkOptions = {}): Array<{
    name: string;
    icon: string;
    link: string;
    description: string;
  }> {
    const links = this.generateDepositLinks(toAddress, options);
    
    return [
      {
        name: 'Tonkeeper',
        icon: '💎',
        link: links.tonkeeperLink,
        description: 'افتح في محفظة Tonkeeper'
      },
      {
        name: 'TON Wallet',
        icon: '🔷',
        link: links.tonwalletLink,
        description: 'افتح في محفظة TON الرسمية'
      },
      {
        name: 'رابط عام',
        icon: '🔗',
        link: links.universalLink,
        description: 'يعمل مع جميع محافظ TON'
      }
    ];
  }

  /**
   * Generate deposit instruction with multiple wallet options
   */
  generateDepositInstructions(
    toAddress: string,
    amount: string,
    options: Omit<WalletLinkOptions, 'amount'> = {}
  ): {
    address: string;
    amount: string;
    walletOptions: Array<{
      name: string;
      icon: string;
      link: string;
      description: string;
    }>;
    qrCodeUrl: string;
    instructions: string[];
  } {
    const walletOptions = this.generateWalletOptions(toAddress, { ...options, amount });
    const qrCodeUrl = this.generateQRCodeUrl(toAddress, { ...options, amount });

    const instructions = [
      `أرسل ${amount} TON إلى العنوان التالي:`,
      'يمكنك استخدام أي من الخيارات التالية:',
      '• انقر على اسم المحفظة لفتحها مباشرة',
      '• امسح رمز QR ضوئياً باستخدام محفظتك',
      '• انسخ العنوان واستخدمه يدوياً',
      'سيتم تحديث رصيدك تلقائياً بعد تأكيد المعاملة'
    ];

    return {
      address: toAddress,
      amount,
      walletOptions,
      qrCodeUrl,
      instructions
    };
  }

  /**
   * Check if user agent supports wallet deep links
   */
  isWalletDeepLinkSupported(): {
    tonkeeper: boolean;
    tonwallet: boolean;
    universal: boolean;
  } {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);

    return {
      tonkeeper: isMobile, // Tonkeeper supports mobile deep links
      tonwallet: isMobile, // TON Wallet supports mobile deep links
      universal: true // Universal links work everywhere
    };
  }

  /**
   * Get recommended wallet option based on platform
   */
  getRecommendedWalletOption(toAddress: string, options: WalletLinkOptions = {}): {
    name: string;
    icon: string;
    link: string;
    description: string;
    reason: string;
  } {
    const support = this.isWalletDeepLinkSupported();
    const walletOptions = this.generateWalletOptions(toAddress, options);

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);

    if (isIOS && support.tonkeeper) {
      return {
        ...walletOptions[0], // Tonkeeper
        reason: 'الأفضل لأجهزة iOS'
      };
    }

    if (isAndroid && support.tonwallet) {
      return {
        ...walletOptions[1], // TON Wallet
        reason: 'الأفضل لأجهزة Android'
      };
    }

    return {
      ...walletOptions[2], // Universal
      reason: 'يعمل على جميع الأجهزة'
    };
  }

  /**
   * Generate shareable deposit link
   */
  generateShareableLink(toAddress: string, options: WalletLinkOptions = {}): string {
    const { amount, comment } = options;
    const baseUrl = window.location.origin;
    
    const params = new URLSearchParams();
    params.append('to', toAddress);
    if (amount) params.append('amount', amount);
    if (comment) params.append('comment', comment);

    return `${baseUrl}/deposit?${params.toString()}`;
  }
}

export default WalletLinkGenerator;
