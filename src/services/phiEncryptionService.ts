/**
 * PHI (Protected Health Information) Encryption Service
 * Implements field-level encryption for HIPAA compliance
 * Uses AES-256-GCM encryption with key rotation support
 */

import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';

interface EncryptedField {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: number;
  algorithm: string;
}

interface EncryptionKey {
  version: number;
  key: any; // CryptoKey type from Web Crypto API
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'rotating' | 'expired';
}

class PHIEncryptionService {
  private currentKey: EncryptionKey | null = null;
  private keyCache: Map<number, EncryptionKey> = new Map();
  private algorithm = 'AES-GCM';
  private keyLength = 256;
  private saltLength = 32;
  
  // PHI field patterns that require encryption
  private phiPatterns = [
    /ssn/i,
    /social.*security/i,
    /date.*birth/i,
    /dob/i,
    /medical.*record/i,
    /diagnosis/i,
    /medication/i,
    /prescription/i,
    /treatment/i,
    /insurance/i,
    /policy.*number/i,
    /medical.*history/i,
    /health.*condition/i,
    /mental.*health/i,
    /substance.*use/i,
    /therapy.*notes/i,
    /clinical.*notes/i,
  ];

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadCurrentKey();
      logger.info('PHI Encryption Service initialized');
    } catch (error) {
      logger.error('Failed to initialize PHI Encryption Service', error);
    }
  }

  /**
   * Load or generate the current encryption key
   */
  private async loadCurrentKey(): Promise<void> {
    try {
      // In production, this should fetch from a secure key management service
      // For now, we'll generate a key from environment variable
      const masterKey = process.env.VITE_PHI_MASTER_KEY || await this.generateMasterKey();
      
      this.currentKey = await this.deriveEncryptionKey(masterKey, 1);
      this.keyCache.set(1, this.currentKey);
    } catch (error) {
      logger.error('Failed to load encryption key', error);
      throw error;
    }
  }

  /**
   * Generate a master key (should be stored securely)
   */
  private async generateMasterKey(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derive an encryption key from master key
   */
  private async deriveEncryptionKey(
    masterKey: string,
    version: number
  ): Promise<EncryptionKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(masterKey),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = encoder.encode(`serenity-phi-v${version}`);
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );

    return {
      version,
      key,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      status: 'active',
    };
  }

  /**
   * Encrypt a PHI field
   */
  public async encryptField(
    fieldName: string,
    value: unknown,
    context?: { userId?: string; recordId?: string }
  ): Promise<EncryptedField | any> {
    try {
      // Check if field needs encryption
      if (!this.isPhiField(fieldName) && !this.containsPhiData(value)) {
        return value; // Return unencrypted if not PHI
      }

      if (!this.currentKey) {
        throw new Error('Encryption key not available');
      }

      // Convert value to string
      const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
      
      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt
      const encoder = new TextEncoder();
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv,
        },
        this.currentKey.key,
        encoder.encode(plaintext)
      );

      // Extract ciphertext and auth tag
      const cipherArray = new Uint8Array(encrypted);
      const ciphertext = cipherArray.slice(0, -16);
      const tag = cipherArray.slice(-16);

      const encryptedField: EncryptedField = {
        ciphertext: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv),
        tag: this.arrayBufferToBase64(tag),
        keyVersion: this.currentKey.version,
        algorithm: this.algorithm,
      };

      // Log encryption event for audit
      await this.logEncryption(fieldName, context);

      return encryptedField;
    } catch (error) {
      logger.error('Failed to encrypt PHI field', error, { fieldName });
      throw error;
    }
  }

  /**
   * Decrypt a PHI field
   */
  public async decryptField(
    fieldName: string,
    encryptedData: string | EncryptedField,
    context?: { userId?: string; recordId?: string }
  ): Promise<unknown> {
    try {
      // If not encrypted, return as is
      if (typeof encryptedData === 'string') {
        return encryptedData;
      }

      // Get the appropriate key version
      const key = await this.getKeyByVersion(encryptedData.keyVersion);
      if (!key) {
        throw new Error(`Encryption key version ${encryptedData.keyVersion} not found`);
      }

      // Reconstruct encrypted data with auth tag
      const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
      const tag = this.base64ToArrayBuffer(encryptedData.tag);
      const encryptedWithTag = new Uint8Array(ciphertext.byteLength + tag.byteLength);
      encryptedWithTag.set(new Uint8Array(ciphertext), 0);
      encryptedWithTag.set(new Uint8Array(tag), ciphertext.byteLength);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: this.base64ToArrayBuffer(encryptedData.iv),
        },
        key.key,
        encryptedWithTag
      );

      // Convert back to string
      const decoder = new TextDecoder();
      const plaintext = decoder.decode(decrypted);

      // Try to parse as JSON if possible
      try {
        return JSON.parse(plaintext);
      } catch {
        return plaintext;
      }
    } catch (error) {
      logger.error('Failed to decrypt PHI field', error, { fieldName });
      
      // Log decryption failure for security audit
      await this.logDecryptionFailure(fieldName, context);
      
      throw error;
    } finally {
      // Always log decryption attempt for audit
      await this.logDecryption(fieldName, context);
    }
  }

  /**
   * Encrypt an entire object's PHI fields
   */
  public async encryptObject<T extends Record<string, any>>(
    obj: T,
    context?: { userId?: string; recordId?: string }
  ): Promise<T> {
    const encrypted = { ...obj };
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.isPhiField(key) || this.containsPhiData(value)) {
        encrypted[key] = await this.encryptField(key, value, context);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively encrypt nested objects
        encrypted[key] = await this.encryptObject(value, context);
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt an entire object's PHI fields
   */
  public async decryptObject<T extends Record<string, any>>(
    obj: T,
    context?: { userId?: string; recordId?: string }
  ): Promise<T> {
    const decrypted = { ...obj };
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.isEncryptedField(value)) {
        decrypted[key] = await this.decryptField(key, value, context);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively decrypt nested objects
        decrypted[key] = await this.decryptObject(value, context);
      }
    }
    
    return decrypted;
  }

  /**
   * Check if a field name indicates PHI
   */
  private isPhiField(fieldName: string): boolean {
    return this.phiPatterns.some(pattern => pattern.test(fieldName));
  }

  /**
   * Check if value contains PHI data patterns
   */
  private containsPhiData(value: any): boolean {
    if (typeof value !== 'string') return false;
    
    // Check for SSN pattern
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
    if (ssnPattern.test(value)) return true;
    
    // Check for date of birth pattern
    const dobPattern = /\b(0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/;
    if (dobPattern.test(value)) return true;
    
    // Check for medical record number pattern
    const mrnPattern = /\bMRN[:\s]?\d{6,}\b/i;
    if (mrnPattern.test(value)) return true;
    
    return false;
  }

  /**
   * Check if a value is an encrypted field
   */
  private isEncryptedField(value: any): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      'ciphertext' in value &&
      'iv' in value &&
      'tag' in value &&
      'keyVersion' in value
    );
  }

  /**
   * Get encryption key by version
   */
  private async getKeyByVersion(version: number): Promise<EncryptionKey | null> {
    // Check cache first
    if (this.keyCache.has(version)) {
      return this.keyCache.get(version)!;
    }

    // In production, fetch from key management service
    // For now, return current key if version matches
    if (this.currentKey && this.currentKey.version === version) {
      return this.currentKey;
    }

    return null;
  }

  /**
   * Rotate encryption keys
   */
  public async rotateKeys(): Promise<void> {
    try {
      logger.info('Starting encryption key rotation');
      
      // Generate new key
      const newVersion = (this.currentKey?.version || 0) + 1;
      const masterKey = await this.generateMasterKey();
      const newKey = await this.deriveEncryptionKey(masterKey, newVersion);
      
      // Mark current key as rotating
      if (this.currentKey) {
        this.currentKey.status = 'rotating';
      }
      
      // Set new key as current
      this.currentKey = newKey;
      this.keyCache.set(newVersion, newKey);
      
      // TODO: Re-encrypt all PHI data with new key (batch job)
      
      logger.security('Encryption key rotation completed', {
        oldVersion: newVersion - 1,
        newVersion,
      });
    } catch (error) {
      logger.error('Failed to rotate encryption keys', error);
      throw error;
    }
  }

  /**
   * Log encryption event for audit
   */
  private async logEncryption(
    fieldName: string,
    context?: { userId?: string; recordId?: string }
  ): Promise<void> {
    try {
      await supabase.from('phi_encryption_audit').insert({
        action: 'encrypt',
        field_name: fieldName,
        user_id: context?.userId,
        record_id: context?.recordId,
        key_version: this.currentKey?.version,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to log encryption audit', error);
    }
  }

  /**
   * Log decryption event for audit
   */
  private async logDecryption(
    fieldName: string,
    context?: { userId?: string; recordId?: string }
  ): Promise<void> {
    try {
      await supabase.from('phi_encryption_audit').insert({
        action: 'decrypt',
        field_name: fieldName,
        user_id: context?.userId,
        record_id: context?.recordId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to log decryption audit', error);
    }
  }

  /**
   * Log decryption failure for security monitoring
   */
  private async logDecryptionFailure(
    fieldName: string,
    context?: { userId?: string; recordId?: string }
  ): Promise<void> {
    try {
      await supabase.from('security_incidents').insert({
        type: 'decryption_failure',
        severity: 'high',
        field_name: fieldName,
        user_id: context?.userId,
        record_id: context?.recordId,
        timestamp: new Date().toISOString(),
      });
      
      logger.security('PHI decryption failure detected', {
        fieldName,
        ...context,
      });
    } catch (error) {
      logger.error('Failed to log decryption failure', error);
    }
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton instance
export const phiEncryptionService = new PHIEncryptionService();

// Export for testing
export { PHIEncryptionService };