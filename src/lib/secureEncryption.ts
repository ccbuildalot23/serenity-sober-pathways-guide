
import { supabase } from '@/integrations/supabase/client';

// Secure encryption utility with proper key management
class SecureEncryption {
  private static instance: SecureEncryption;
  private encryptionKey: string | null = null;
  private keyInitialized = false;

  private constructor() {}

  static getInstance(): SecureEncryption {
    if (!SecureEncryption.instance) {
      SecureEncryption.instance = new SecureEncryption();
    }
    return SecureEncryption.instance;
  }

  private async initializeKey(): Promise<void> {
    if (this.keyInitialized) return;

    try {
      // Try to get encryption key from Supabase secrets
      const { data, error } = await supabase.functions.invoke('get-encryption-key');
      
      if (!error && data?.key) {
        this.encryptionKey = data.key;
      } else {
        // Check environment variable but validate it's not a default value
        const envKey = import.meta.env.VITE_ENCRYPTION_KEY;
        
        // Reject default/weak keys for security
        const forbiddenKeys = [
          'serenity-secret-key',
          'your-secret-key',
          'default-key',
          'test-key',
          'dev-key'
        ];
        
        if (!envKey || forbiddenKeys.includes(envKey) || envKey.length < 32) {
          console.error('SECURITY ERROR: Secure encryption key not configured or using default/weak key');
          throw new Error('Secure encryption key required - please configure a strong encryption key');
        }
        
        this.encryptionKey = envKey;
      }
      
      this.keyInitialized = true;
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      throw new Error('Encryption system initialization failed - secure key required');
    }
  }

  private async getKey(): Promise<CryptoKey> {
    await this.initializeKey();
    
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(this.encryptionKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Generate a random salt for each key derivation
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(text: string): Promise<string> {
    try {
      const enc = new TextEncoder();
      const key = await this.getKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      const cipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(text)
      );

      // Combine salt, IV, and cipher for storage
      const combined = new Uint8Array(salt.byteLength + iv.byteLength + cipher.byteLength);
      combined.set(salt);
      combined.set(iv, salt.byteLength);
      combined.set(new Uint8Array(cipher), salt.byteLength + iv.byteLength);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  async decrypt(cipherText: string): Promise<string> {
    try {
      const data = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
      
      // Extract salt, IV, and cipher
      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const cipher = data.slice(28);

      // Recreate key with the same salt
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(this.encryptionKey!),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipher
      );

      const dec = new TextDecoder();
      return dec.decode(plain);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }
}

export const secureEncryption = SecureEncryption.getInstance();
