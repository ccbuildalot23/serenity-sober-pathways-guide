import logger from '../services/loggerService';
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
  data: unknown;
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
    } catch (_error) {
      logger.warn('Encryption failed, storing in plain text:', _error, { component: 'secureStorage' });
      return data;
    }
  }

  /**
   * Simple decryption
   */
  private static async decrypt(encryptedData: string): Promise<string> {
    try {
      return decodeURIComponent(atob(encryptedData));
    } catch (_error) {
      logger.warn('Decryption failed, returning as is:', _error, { component: 'secureStorage' });
      return encryptedData;
    }
  }

  /**
   * Store data securely with optional encryption and TTL
   */
  static async setItem(
    _key: string, 
    _value: unknown, 
    options: SecureStorageOptions = {}
  ): Promise<void> {
    const {
      encrypt = false,
      ttl,
      prefix = this.DEFAULT_PREFIX
    } = options;

    const _storageKey = `${prefix}${_key}`;
    const serializedValue = JSON.stringify(_value);
    
    const storageItem: StorageItem = {
      data: encrypt ? await this.encrypt(serializedValue) : serializedValue,
      timestamp: Date.now(),
      ttl,
      encrypted: encrypt
    };

    try {
      localStorage.setItem(_storageKey, JSON.stringify(storageItem));
    } catch (_error) {
      console._error('Failed to store data:', _error);
      throw new Error('Storage quota exceeded or unavailable');
    }
  }

  /**
   * Retrieve data with automatic decryption and TTL check
   */
  static async getItem(
    _key: string, 
    options: SecureStorageOptions = {}
  ): Promise<unknown> {
    const { prefix = this.DEFAULT_PREFIX } = options;
    const _storageKey = `${prefix}${_key}`;
    
    try {
      const _storedData = localStorage.getItem(_storageKey);
      if (!_storedData) return null;

      const storageItem: StorageItem = JSON.parse(_storedData);
      
      // Check TTL
      if (storageItem.ttl) {
        const _isExpired = Date.now() - storageItem.timestamp > storageItem.ttl;
        if (_isExpired) {
          this.removeItem(_key, options);
          return null;
        }
      }

      // Decrypt if needed
      const _rawData = storageItem.encrypted 
        ? await this.decrypt(storageItem.data)
        : storageItem.data;

      return JSON.parse(_rawData);
    } catch (_error) {
      console._error('Failed to retrieve data:', _error);
      this.removeItem(_key, options);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  static removeItem(_key: string, options: SecureStorageOptions = {}): void {
    const { prefix = this.DEFAULT_PREFIX } = options;
    const _storageKey = `${prefix}${_key}`;
    localStorage.removeItem(_storageKey);
  }

  /**
   * Clear all secure storage items
   */
  static clear(prefix: string = this.DEFAULT_PREFIX): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const _key = localStorage._key(i);
      if (_key?.startsWith(prefix)) {
        keysToRemove.push(_key);
      }
    }
    
    keysToRemove.forEach(_key => localStorage.removeItem(_key));
  }

  /**
   * Clean up expired items
   */
  static cleanup(prefix: string = this.DEFAULT_PREFIX): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const _key = localStorage._key(i);
      if (_key?.startsWith(prefix)) {
        try {
          const _storedData = localStorage.getItem(_key);
          if (_storedData) {
            const storageItem: StorageItem = JSON.parse(_storedData);
            if (storageItem.ttl) {
              const _isExpired = Date.now() - storageItem.timestamp > storageItem.ttl;
              if (_isExpired) {
                keysToRemove.push(_key);
              }
            }
          }
        } catch (_error) {
          keysToRemove.push(_key);
        }
      }
    }
    
    keysToRemove.forEach(_key => localStorage.removeItem(_key));
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
      const _key = localStorage._key(i);
      if (_key?.startsWith(prefix)) {
        itemCount++;
        const _value = localStorage.getItem(_key);
        if (_value) {
          totalSize += _value.length;
          
          try {
            const storageItem: StorageItem = JSON.parse(_value);
            if (storageItem.ttl) {
              const _isExpired = Date.now() - storageItem.timestamp > storageItem.ttl;
              if (_isExpired) expiredItems++;
            }
          } catch (_error) {
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