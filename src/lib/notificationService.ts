import { toast } from 'sonner';

export interface NotificationOptions {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface DepositNotification {
  transactionHash: string;
  amount: string;
  fromAddress: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export class NotificationService {
  private static instance: NotificationService;
  private pushNotificationSupported: boolean = false;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.initializePushNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize push notification support
   */
  private async initializePushNotifications(): Promise<void> {
    if ('Notification' in window) {
      this.pushNotificationSupported = true;
      this.permission = Notification.permission;

      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission();
      }
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.pushNotificationSupported) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  /**
   * Show in-app notification using Sonner
   */
  showInAppNotification(options: NotificationOptions): void {
    const { title, message, type, duration = 5000, persistent = false } = options;
    
    const toastOptions = {
      duration: persistent ? Infinity : duration,
      description: message,
      action: options.actions?.[0] ? {
        label: options.actions[0].label,
        onClick: options.actions[0].action
      } : undefined
    };

    switch (type) {
      case 'success':
        toast.success(title, toastOptions);
        break;
      case 'error':
        toast.error(title, toastOptions);
        break;
      case 'warning':
        toast.warning(title, toastOptions);
        break;
      case 'info':
      default:
        toast.info(title, toastOptions);
        break;
    }
  }

  /**
   * Show browser push notification
   */
  async showPushNotification(options: NotificationOptions): Promise<void> {
    if (!this.pushNotificationSupported || this.permission !== 'granted') {
      return;
    }

    const notification = new Notification(options.title, {
      body: options.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'ton-wallet-notification',
      requireInteraction: options.persistent || false,
      silent: false
    });

    if (options.actions && options.actions.length > 0) {
      notification.onclick = options.actions[0].action;
    }

    // Auto close after duration if not persistent
    if (!options.persistent && options.duration) {
      setTimeout(() => {
        notification.close();
      }, options.duration);
    }
  }

  /**
   * Show both in-app and push notifications
   */
  async showBothNotifications(options: NotificationOptions): Promise<void> {
    // Always show in-app notification
    this.showInAppNotification(options);

    // Show push notification if supported and permitted
    if (this.pushNotificationSupported && this.permission === 'granted') {
      await this.showPushNotification(options);
    }
  }

  /**
   * Notify about deposit confirmation
   */
  async notifyDepositConfirmed(deposit: DepositNotification): Promise<void> {
    const options: NotificationOptions = {
      title: '✅ تم تأكيد الإيداع',
      message: `تم إيداع ${deposit.amount} TON بنجاح في محفظتك`,
      type: 'success',
      duration: 8000,
      persistent: false,
      actions: [{
        label: 'عرض التفاصيل',
        action: () => {
          window.open(`https://tonscan.org/tx/${deposit.transactionHash}`, '_blank');
        }
      }]
    };

    await this.showBothNotifications(options);
  }

  /**
   * Notify about pending deposit
   */
  async notifyDepositPending(deposit: DepositNotification): Promise<void> {
    const options: NotificationOptions = {
      title: '⏳ إيداع في الانتظار',
      message: `جاري تأكيد إيداع ${deposit.amount} TON...`,
      type: 'info',
      duration: 5000,
      actions: [{
        label: 'تتبع المعاملة',
        action: () => {
          window.open(`https://tonscan.org/tx/${deposit.transactionHash}`, '_blank');
        }
      }]
    };

    await this.showBothNotifications(options);
  }

  /**
   * Notify about failed deposit
   */
  async notifyDepositFailed(deposit: DepositNotification): Promise<void> {
    const options: NotificationOptions = {
      title: '❌ فشل الإيداع',
      message: `فشل في إيداع ${deposit.amount} TON. يرجى المحاولة مرة أخرى.`,
      type: 'error',
      duration: 10000,
      persistent: true,
      actions: [{
        label: 'عرض التفاصيل',
        action: () => {
          window.open(`https://tonscan.org/tx/${deposit.transactionHash}`, '_blank');
        }
      }]
    };

    await this.showBothNotifications(options);
  }

  /**
   * Notify about withdrawal confirmation
   */
  async notifyWithdrawalConfirmed(amount: string, toAddress: string, txHash: string): Promise<void> {
    const options: NotificationOptions = {
      title: '📤 تم تأكيد السحب',
      message: `تم سحب ${amount} TON بنجاح`,
      type: 'success',
      duration: 8000,
      actions: [{
        label: 'عرض المعاملة',
        action: () => {
          window.open(`https://tonscan.org/tx/${txHash}`, '_blank');
        }
      }]
    };

    await this.showBothNotifications(options);
  }

  /**
   * Notify about new wallet creation
   */
  async notifyWalletCreated(walletAddress: string, walletType: string): Promise<void> {
    const options: NotificationOptions = {
      title: '🎉 تم إنشاء محفظة جديدة',
      message: `تم إنشاء محفظة ${walletType} بنجاح`,
      type: 'success',
      duration: 6000,
      actions: [{
        label: 'عرض المحفظة',
        action: () => {
          // Navigate to wallet details
          console.log('Navigate to wallet:', walletAddress);
        }
      }]
    };

    await this.showBothNotifications(options);
  }

  /**
   * Show general notification
   */
  async notify(title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): Promise<void> {
    const options: NotificationOptions = {
      title,
      message,
      type,
      duration: 5000
    };

    await this.showBothNotifications(options);
  }

  /**
   * Check if notifications are supported and enabled
   */
  isNotificationEnabled(): boolean {
    return this.pushNotificationSupported && this.permission === 'granted';
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }
}
