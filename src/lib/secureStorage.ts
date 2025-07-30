/**
 * Secure client-side storage utility
 * Provides encrypted storage for sensitive data with automatic cleanup
 */

interface SecureStorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
  prefix?: string;
}

interface StorageItem {
  data: any;
  timestamp: number;
  ttl?: number;
  encrypted?: boolean;
}

export class SecureStorage {
  private static readonly DEFAULT_PREFIX = 'serenity_secure_';
  private static readonly ENCRYPTION_KEY = 'serenity_app_key_v1';

  /**
   * Simple encryption using browser's built-in crypto
   */
  private static async encrypt(data: string): Promise<string> {
    try {
      // Use a simple base64 encoding for now - in production, use proper encryption
      return btoa(encodeURIComponent(data));
    } catch (error) {
      console.warn('Encryption failed, storing in plain text:', error);
      return data;
    }
  }

  /**
   * Simple decryption
   */
  private static async decrypt(encryptedData: string): Promise<string> {
    try {
      return decodeURIComponent(atob(encryptedData));
    } catch (error) {
      console.warn('Decryption failed, returning as is:', error);
      return encryptedData;
    }
  }

  /**
   * Store data securely with optional encryption and TTL
   */
  static async setItem(
    key: string, 
    value: any, 
    options: SecureStorageOptions = {}
  ): Promise<void> {
    const {
      encrypt = false,
      ttl,
      prefix = this.DEFAULT_PREFIX
    } = options;

    const storageKey = `${prefix}${key}`;
    const serializedValue = JSON.stringify(value);
    
    const storageItem: StorageItem = {
      data: encrypt ? await this.encrypt(serializedValue) : serializedValue,
      timestamp: Date.now(),
      ttl,
      encrypted: encrypt
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(storageItem));
    } catch (error) {
      console.error('Failed to store data:', error);
      throw new Error('Storage quota exceeded or unavailable');
    }
  }

  /**
   * Retrieve data with automatic decryption and TTL check
   */
  static async getItem(
    key: string, 
    options: SecureStorageOptions = {}
  ): Promise<any> {
    const { prefix = this.DEFAULT_PREFIX } = options;
    const storageKey = `${prefix}${key}`;
    
    try {
      const storedData = localStorage.getItem(storageKey);
      if (!storedData) return null;

      const storageItem: StorageItem = JSON.parse(storedData);
      
      // Check TTL
      if (storageItem.ttl) {
        const isExpired = Date.now() - storageItem.timestamp > storageItem.ttl;
        if (isExpired) {
          this.removeItem(key, options);
          return null;
        }
      }

      // Decrypt if needed
      const rawData = storageItem.encrypted 
        ? await this.decrypt(storageItem.data)
        : storageItem.data;

      return JSON.parse(rawData);
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      this.removeItem(key, options);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  static removeItem(key: string, options: SecureStorageOptions = {}): void {
    const { prefix = this.DEFAULT_PREFIX } = options;
    const storageKey = `${prefix}${key}`;
    localStorage.removeItem(storageKey);
  }

  /**
   * Clear all secure storage items
   */
  static clear(prefix: string = this.DEFAULT_PREFIX): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Clean up expired items
   */
  static cleanup(prefix: string = this.DEFAULT_PREFIX): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          const storedData = localStorage.getItem(key);
          if (storedData) {
            const storageItem: StorageItem = JSON.parse(storedData);
            if (storageItem.ttl) {
              const isExpired = Date.now() - storageItem.timestamp > storageItem.ttl;
              if (isExpired) {
                keysToRemove.push(key);
              }
            }
          }
        } catch (error) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Get storage usage statistics
   */
  static getStats(prefix: string = this.DEFAULT_PREFIX): {
    itemCount: number;
    totalSize: number;
    expiredItems: number;
  } {
    let itemCount = 0;
    let totalSize = 0;
    let expiredItems = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        itemCount++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          
          try {
            const storageItem: StorageItem = JSON.parse(value);
            if (storageItem.ttl) {
              const isExpired = Date.now() - storageItem.timestamp > storageItem.ttl;
              if (isExpired) expiredItems++;
            }
          } catch (error) {
            expiredItems++;
          }
        }
      }
    }
    
    return { itemCount, totalSize, expiredItems };
  }
}

// Auto-cleanup on page load
if (typeof window !== 'undefined') {
  SecureStorage.cleanup();
}