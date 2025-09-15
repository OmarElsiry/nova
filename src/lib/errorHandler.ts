import { toast } from 'sonner';
import { NotificationService } from './notificationService';

export interface ErrorContext {
  operation: string;
  userId?: number;
  walletAddress?: string;
  amount?: string;
  details?: any;
}

export interface ErrorResponse {
  code: string;
  message: string;
  userMessage: string;
  shouldRetry: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle wallet connection errors
   */
  handleWalletConnectionError(error: any, context: ErrorContext): ErrorResponse {
    console.error('Wallet connection error:', error, context);

    const errorResponse: ErrorResponse = {
      code: 'WALLET_CONNECTION_FAILED',
      message: error.message || 'Wallet connection failed',
      userMessage: 'فشل في الاتصال بالمحفظة. يرجى التأكد من تثبيت محفظة TON والمحاولة مرة أخرى.',
      shouldRetry: true,
      severity: 'medium'
    };

    toast.error(errorResponse.userMessage);
    return errorResponse;
  }

  /**
   * Handle deposit errors
   */
  handleDepositError(error: any, context: ErrorContext): ErrorResponse {
    console.error('Deposit error:', error, context);

    let errorResponse: ErrorResponse;

    if (error.message?.includes('insufficient')) {
      errorResponse = {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance for deposit',
        userMessage: 'رصيد غير كافي لإتمام الإيداع. يرجى التحقق من رصيد محفظتك.',
        shouldRetry: false,
        severity: 'medium'
      };
    } else if (error.message?.includes('network')) {
      errorResponse = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        userMessage: 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        shouldRetry: true,
        severity: 'medium'
      };
    } else if (error.message?.includes('invalid address')) {
      errorResponse = {
        code: 'INVALID_ADDRESS',
        message: 'Invalid wallet address format',
        userMessage: 'عنوان المحفظة غير صحيح. يرجى التحقق من العنوان والمحاولة مرة أخرى.',
        shouldRetry: false,
        severity: 'high'
      };
    } else {
      errorResponse = {
        code: 'DEPOSIT_FAILED',
        message: error.message || 'Deposit operation failed',
        userMessage: 'فشل في معالجة الإيداع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.',
        shouldRetry: true,
        severity: 'high'
      };
    }

    toast.error(errorResponse.userMessage);
    this.logError(errorResponse, context);
    return errorResponse;
  }

  /**
   * Handle withdrawal errors
   */
  handleWithdrawalError(error: any, context: ErrorContext): ErrorResponse {
    console.error('Withdrawal error:', error, context);

    let errorResponse: ErrorResponse;

    if (error.message?.includes('insufficient')) {
      errorResponse = {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance for withdrawal',
        userMessage: `رصيد غير كافي للسحب. الرصيد المطلوب: ${context.amount} TON`,
        shouldRetry: false,
        severity: 'medium'
      };
    } else if (error.message?.includes('limit')) {
      errorResponse = {
        code: 'WITHDRAWAL_LIMIT_EXCEEDED',
        message: 'Withdrawal limit exceeded',
        userMessage: 'تم تجاوز حد السحب المسموح. يرجى تقليل المبلغ والمحاولة مرة أخرى.',
        shouldRetry: false,
        severity: 'medium'
      };
    } else if (error.message?.includes('pending')) {
      errorResponse = {
        code: 'WITHDRAWAL_PENDING',
        message: 'Previous withdrawal still pending',
        userMessage: 'يوجد طلب سحب معلق. يرجى انتظار معالجة الطلب السابق قبل إرسال طلب جديد.',
        shouldRetry: false,
        severity: 'low'
      };
    } else {
      errorResponse = {
        code: 'WITHDRAWAL_FAILED',
        message: error.message || 'Withdrawal operation failed',
        userMessage: 'فشل في معالجة طلب السحب. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.',
        shouldRetry: true,
        severity: 'high'
      };
    }

    toast.error(errorResponse.userMessage);
    this.logError(errorResponse, context);
    return errorResponse;
  }

  /**
   * Handle blockchain transaction errors
   */
  handleTransactionError(error: any, context: ErrorContext): ErrorResponse {
    console.error('Transaction error:', error, context);

    let errorResponse: ErrorResponse;

    if (error.message?.includes('timeout')) {
      errorResponse = {
        code: 'TRANSACTION_TIMEOUT',
        message: 'Transaction timed out',
        userMessage: 'انتهت مهلة المعاملة. قد تكون المعاملة قيد المعالجة. يرجى التحقق من حالة المعاملة.',
        shouldRetry: true,
        severity: 'medium'
      };
    } else if (error.message?.includes('rejected')) {
      errorResponse = {
        code: 'TRANSACTION_REJECTED',
        message: 'Transaction rejected by user',
        userMessage: 'تم رفض المعاملة من قبل المستخدم.',
        shouldRetry: false,
        severity: 'low'
      };
    } else if (error.message?.includes('gas')) {
      errorResponse = {
        code: 'INSUFFICIENT_GAS',
        message: 'Insufficient gas for transaction',
        userMessage: 'رسوم الشبكة غير كافية لإتمام المعاملة. يرجى زيادة رسوم الغاز.',
        shouldRetry: true,
        severity: 'medium'
      };
    } else {
      errorResponse = {
        code: 'TRANSACTION_FAILED',
        message: error.message || 'Transaction failed',
        userMessage: 'فشلت المعاملة. يرجى المحاولة مرة أخرى.',
        shouldRetry: true,
        severity: 'high'
      };
    }

    toast.error(errorResponse.userMessage);
    this.logError(errorResponse, context);
    return errorResponse;
  }

  /**
   * Handle API errors
   */
  handleApiError(error: any, context: ErrorContext): ErrorResponse {
    console.error('API error:', error, context);

    let errorResponse: ErrorResponse;

    if (error.status === 401) {
      errorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access',
        userMessage: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
        shouldRetry: false,
        severity: 'medium'
      };
    } else if (error.status === 403) {
      errorResponse = {
        code: 'FORBIDDEN',
        message: 'Access forbidden',
        userMessage: 'ليس لديك صلاحية للوصول إلى هذه الخدمة.',
        shouldRetry: false,
        severity: 'high'
      };
    } else if (error.status === 429) {
      errorResponse = {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded',
        userMessage: 'تم تجاوز حد الطلبات المسموح. يرجى الانتظار قبل المحاولة مرة أخرى.',
        shouldRetry: true,
        severity: 'medium'
      };
    } else if (error.status >= 500) {
      errorResponse = {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
        userMessage: 'خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.',
        shouldRetry: true,
        severity: 'high'
      };
    } else {
      errorResponse = {
        code: 'API_ERROR',
        message: error.message || 'API request failed',
        userMessage: 'خطأ في الاتصال بالخدمة. يرجى المحاولة مرة أخرى.',
        shouldRetry: true,
        severity: 'medium'
      };
    }

    toast.error(errorResponse.userMessage);
    this.logError(errorResponse, context);
    return errorResponse;
  }

  /**
   * Handle validation errors
   */
  handleValidationError(field: string, value: any, rule: string): ErrorResponse {
    console.error('Validation error:', { field, value, rule });

    let userMessage = '';
    
    switch (field) {
      case 'amount':
        if (rule === 'required') {
          userMessage = 'يرجى إدخال المبلغ';
        } else if (rule === 'min') {
          userMessage = 'المبلغ أقل من الحد المسموح';
        } else if (rule === 'max') {
          userMessage = 'المبلغ أكبر من الحد المسموح';
        } else if (rule === 'format') {
          userMessage = 'تنسيق المبلغ غير صحيح';
        }
        break;
      case 'address':
        if (rule === 'required') {
          userMessage = 'يرجى إدخال عنوان المحفظة';
        } else if (rule === 'format') {
          userMessage = 'تنسيق عنوان المحفظة غير صحيح';
        }
        break;
      default:
        userMessage = `خطأ في التحقق من صحة ${field}`;
    }

    const errorResponse: ErrorResponse = {
      code: 'VALIDATION_ERROR',
      message: `Validation failed for ${field}: ${rule}`,
      userMessage,
      shouldRetry: false,
      severity: 'low'
    };

    toast.error(errorResponse.userMessage);
    return errorResponse;
  }

  /**
   * Handle general errors with automatic categorization
   */
  handleError(error: any, context: ErrorContext): ErrorResponse {
    if (error.name === 'ValidationError') {
      return this.handleValidationError(error.field, error.value, error.rule);
    }

    if (context.operation === 'deposit') {
      return this.handleDepositError(error, context);
    }

    if (context.operation === 'withdrawal') {
      return this.handleWithdrawalError(error, context);
    }

    if (context.operation === 'wallet_connection') {
      return this.handleWalletConnectionError(error, context);
    }

    if (context.operation === 'transaction') {
      return this.handleTransactionError(error, context);
    }

    if (error.status) {
      return this.handleApiError(error, context);
    }

    // Generic error handling
    const errorResponse: ErrorResponse = {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      userMessage: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.',
      shouldRetry: true,
      severity: 'medium'
    };

    toast.error(errorResponse.userMessage);
    this.logError(errorResponse, context);
    return errorResponse;
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(errorResponse: ErrorResponse, context: ErrorContext): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      code: errorResponse.code,
      message: errorResponse.message,
      severity: errorResponse.severity,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console for development
    console.error('Error logged:', errorLog);

    // In production, send to error tracking service
    // Example: Sentry, LogRocket, etc.
    
    // Send critical errors as notifications
    if (errorResponse.severity === 'critical') {
      this.notificationService.notify(
        '🚨 خطأ حرج',
        'حدث خطأ حرج في النظام. تم إبلاغ فريق الدعم الفني.',
        'error'
      );
    }
  }

  /**
   * Create retry mechanism for recoverable errors
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorResponse = this.handleError(error, context);

        if (!errorResponse.shouldRetry || attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const retryDelay = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        toast.info(`محاولة ${attempt + 1} من ${maxRetries}...`);
      }
    }

    throw lastError;
  }

  /**
   * Validate input with comprehensive checks
   */
  validateInput(field: string, value: any, rules: any): boolean {
    try {
      if (rules.required && (!value || value === '')) {
        throw { name: 'ValidationError', field, value, rule: 'required' };
      }

      if (field === 'amount') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw { name: 'ValidationError', field, value, rule: 'format' };
        }
        if (rules.min && numValue < rules.min) {
          throw { name: 'ValidationError', field, value, rule: 'min' };
        }
        if (rules.max && numValue > rules.max) {
          throw { name: 'ValidationError', field, value, rule: 'max' };
        }
      }

      if (field === 'address') {
        if (rules.format && !value.match(rules.format)) {
          throw { name: 'ValidationError', field, value, rule: 'format' };
        }
      }

      return true;
    } catch (error) {
      this.handleError(error, { operation: 'validation' });
      return false;
    }
  }
}
