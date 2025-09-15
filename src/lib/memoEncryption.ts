// Browser-compatible crypto implementation

export interface EncryptedMemo {
  encryptedData: string;
  salt: string;
  timestamp: number;
  hash: string;
}

// Browser-compatible crypto utilities
class BrowserCrypto {
  static async generateRandomBytes(length: number): Promise<Uint8Array> {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  }

  static arrayToHex(array: Uint8Array): string {
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static hexToArray(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  static async sha256(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = new Uint8Array(hashBuffer);
    return this.arrayToHex(hashArray);
  }

  static async encrypt(data: string, key: string): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate IV
    const iv = await this.generateRandomBytes(16);
    
    // Import key
    const keyBuffer = this.hexToArray(key.slice(0, 64)); // Take first 32 bytes
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    );
    
    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      dataBuffer
    );
    
    const encryptedArray = new Uint8Array(encryptedBuffer);
    return {
      encrypted: this.arrayToHex(encryptedArray),
      iv: this.arrayToHex(iv)
    };
  }

  static async decrypt(encryptedHex: string, key: string, ivHex: string): Promise<string> {
    const encryptedArray = this.hexToArray(encryptedHex);
    const iv = this.hexToArray(ivHex);
    
    // Import key
    const keyBuffer = this.hexToArray(key.slice(0, 64)); // Take first 32 bytes
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      encryptedArray
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
}

export class MemoEncryption {
  private static instance: MemoEncryption;
  private readonly secretKey: string;
  private readonly algorithm = 'aes-256-cbc';

  private constructor() {
    // Generate a unique secret key based on multiple entropy sources
    const entropy = [
      Date.now().toString(),
      Math.random().toString(36),
      Math.random().toString(),
      navigator?.userAgent || 'browser',
      window?.location?.href || 'unknown',
      performance?.now()?.toString() || Math.random().toString()
    ].join('');
    
    // Simple hash for secret key (will be properly hashed later)
    this.secretKey = btoa(entropy).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
  }

  public static getInstance(): MemoEncryption {
    if (!MemoEncryption.instance) {
      MemoEncryption.instance = new MemoEncryption();
    }
    return MemoEncryption.instance;
  }

  /**
   * Encrypt transaction memo with amount and user data
   */
  async encryptTransactionMemo(
    amount: string,
    userAddress: string,
    timestamp: number = Date.now()
  ): Promise<EncryptedMemo> {
    try {
      // Create payload with amount, user address, and timestamp
      const nonce = BrowserCrypto.arrayToHex(await BrowserCrypto.generateRandomBytes(16));
      const checksum = await this.generateChecksum(amount, userAddress, timestamp);
      
      const payload = {
        amount: parseFloat(amount),
        userAddress,
        timestamp,
        nonce,
        checksum
      };

      const payloadString = JSON.stringify(payload);
      
      // Generate random salt
      const saltBytes = await BrowserCrypto.generateRandomBytes(32);
      const salt = BrowserCrypto.arrayToHex(saltBytes);
      
      // Create encryption key from secret + salt
      const encryptionKey = await BrowserCrypto.sha256(this.secretKey + salt + timestamp.toString());

      // Encrypt the payload
      const { encrypted, iv } = await BrowserCrypto.encrypt(payloadString, encryptionKey);
      const encryptedData = iv + encrypted;

      // Create verification hash
      const verificationHash = await BrowserCrypto.sha256(encryptedData + salt + timestamp.toString());

      return {
        encryptedData,
        salt,
        timestamp,
        hash: verificationHash
      };
    } catch (error) {
      throw new Error('Failed to encrypt memo');
    }
  }

  /**
   * Decrypt and verify transaction memo
   */
  async decryptTransactionMemo(encryptedMemo: EncryptedMemo): Promise<{
    amount: number;
    userAddress: string;
    timestamp: number;
    isValid: boolean;
  }> {
    try {
      const { encryptedData, salt, timestamp, hash } = encryptedMemo;

      // Verify hash first
      const expectedHash = await BrowserCrypto.sha256(encryptedData + salt + timestamp.toString());

      if (hash !== expectedHash) {
        throw new Error('Invalid memo hash');
      }

      // Check timestamp (reject if older than 1 hour)
      if (Date.now() - timestamp > 3600000) {
        throw new Error('Memo expired');
      }

      // Recreate encryption key
      const encryptionKey = await BrowserCrypto.sha256(this.secretKey + salt + timestamp.toString());

      // Extract IV from encrypted data
      const iv = encryptedData.slice(0, 32);
      const actualEncryptedData = encryptedData.slice(32);
      
      // Decrypt
      const decrypted = await BrowserCrypto.decrypt(actualEncryptedData, encryptionKey, iv);
      const payload = JSON.parse(decrypted);

      // Verify checksum
      const expectedChecksum = await this.generateChecksum(
        payload.amount.toString(),
        payload.userAddress,
        payload.timestamp
      );

      if (payload.checksum !== expectedChecksum) {
        throw new Error('Invalid payload checksum');
      }

      return {
        amount: payload.amount,
        userAddress: payload.userAddress,
        timestamp: payload.timestamp,
        isValid: true
      };
    } catch (error) {
      return {
        amount: 0,
        userAddress: '',
        timestamp: 0,
        isValid: false
      };
    }
  }

  /**
   * Generate secure memo string for transaction
   */
  async generateSecureMemo(amount: string, userAddress: string): Promise<string> {
    const encryptedMemo = await this.encryptTransactionMemo(amount, userAddress);
    
    // Encode as base64 for transmission
    const memoData = btoa(JSON.stringify(encryptedMemo));
    
    // Add prefix to identify encrypted memos
    return `SECURE_${memoData}`;
  }

  /**
   * Parse and verify secure memo from transaction
   */
  async parseSecureMemo(memo: string): Promise<{
    amount: number;
    userAddress: string;
    isValid: boolean;
  } | null> {
    try {
      if (!memo.startsWith('SECURE_')) {
        return null; // Not an encrypted memo
      }

      const memoData = memo.replace('SECURE_', '');
      const encryptedMemo = JSON.parse(atob(memoData));
      
      return await this.decryptTransactionMemo(encryptedMemo);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate checksum for payload verification
   */
  private async generateChecksum(amount: string, userAddress: string, timestamp: number): Promise<string> {
    const data = `${amount}:${userAddress}:${timestamp}:${this.secretKey}`;
    return (await BrowserCrypto.sha256(data)).slice(0, 32); // Use first 32 chars as checksum
  }

  /**
   * Validate transaction amount against encrypted memo
   */
  async validateTransaction(
    receivedAmount: string,
    memo: string,
    expectedUserAddress: string
  ): Promise<{
    isValid: boolean;
    expectedAmount: number;
    actualAmount: number;
    reason?: string;
  }> {
    const parsedMemo = await this.parseSecureMemo(memo);
    
    if (!parsedMemo) {
      return {
        isValid: false,
        expectedAmount: 0,
        actualAmount: parseFloat(receivedAmount),
        reason: 'Invalid or missing encrypted memo'
      };
    }

    if (!parsedMemo.isValid) {
      return {
        isValid: false,
        expectedAmount: 0,
        actualAmount: parseFloat(receivedAmount),
        reason: 'Corrupted or tampered memo'
      };
    }

    if (parsedMemo.userAddress !== expectedUserAddress) {
      return {
        isValid: false,
        expectedAmount: parsedMemo.amount,
        actualAmount: parseFloat(receivedAmount),
        reason: 'User address mismatch'
      };
    }

    const actualAmount = parseFloat(receivedAmount);
    const expectedAmount = parsedMemo.amount;
    
    // Allow small tolerance for blockchain precision
    const tolerance = 0.001;
    const isAmountValid = Math.abs(actualAmount - expectedAmount) <= tolerance;

    return {
      isValid: isAmountValid,
      expectedAmount,
      actualAmount,
      reason: isAmountValid ? undefined : 'Amount mismatch detected'
    };
  }

  /**
   * Generate obfuscated memo for display (security through obscurity)
   */
  async generateObfuscatedMemo(amount: string, userAddress: string): Promise<string> {
    // Create multiple layers of obfuscation
    const timestamp = Date.now();
    const randomPadding = BrowserCrypto.arrayToHex(await BrowserCrypto.generateRandomBytes(8));
    
    // Mix real data with fake data
    const fakeAmount = (Math.random() * 1000).toFixed(6);
    const fakeBytes = await BrowserCrypto.generateRandomBytes(22);
    const fakeAddress = 'UQ' + btoa(String.fromCharCode(...fakeBytes)).replace(/[+/=]/g, '');
    
    const obfuscatedData = {
      a: parseFloat(amount),
      u: userAddress,
      t: timestamp,
      fa: parseFloat(fakeAmount),
      fu: fakeAddress,
      r: randomPadding,
      x: (await BrowserCrypto.sha256(`${amount}${userAddress}${timestamp}`)).slice(0, 40)
    };

    return btoa(JSON.stringify(obfuscatedData));
  }
}

export default MemoEncryption;
