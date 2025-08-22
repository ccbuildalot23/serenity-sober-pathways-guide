import crypto from 'crypto';
import { config, securityConfig } from '@/config/config';
import logger from './logger';

export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm = securityConfig.encryption.algorithm;
  private readonly keyLength = securityConfig.encryption.key_length;
  private readonly ivLength = securityConfig.encryption.iv_length;
  private readonly encryptionKey: Buffer;

  private constructor() {
    // Ensure the encryption key is the correct length
    if (config.security.encryptionKey.length !== this.keyLength) {
      throw new Error(`Encryption key must be exactly ${this.keyLength} characters long`);
    }
    
    this.encryptionKey = Buffer.from(config.security.encryptionKey, 'utf8');
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Encrypt sensitive data for storage in audit logs
   */
  public encrypt(data: string): { encrypted: Buffer; iv: Buffer; tag: Buffer } {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('serenity-audit-data', 'utf8'));

      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const tag = cipher.getAuthTag();

      logger.debug('Data encrypted successfully', {
        algorithm: this.algorithm,
        data_length: data.length,
        encrypted_length: encrypted.length,
      });

      return { encrypted, iv, tag };
    } catch (error) {
      logger.error('Encryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        algorithm: this.algorithm,
      });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data from audit logs
   */
  public decrypt(encryptedData: Buffer, iv: Buffer, tag: Buffer): string {
    try {
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('serenity-audit-data', 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const result = decrypted.toString('utf8');

      logger.debug('Data decrypted successfully', {
        encrypted_length: encryptedData.length,
        decrypted_length: result.length,
      });

      return result;
    } catch (error) {
      logger.error('Decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        algorithm: this.algorithm,
      });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt JSON data for database storage
   */
  public encryptJSON(data: any): Buffer {
    try {
      const jsonString = JSON.stringify(data);
      const { encrypted, iv, tag } = this.encrypt(jsonString);
      
      // Combine iv, tag, and encrypted data into a single buffer
      const combined = Buffer.concat([
        Buffer.from([iv.length]), // 1 byte for IV length
        iv,
        Buffer.from([tag.length]), // 1 byte for tag length  
        tag,
        encrypted
      ]);

      return combined;
    } catch (error) {
      logger.error('JSON encryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data_type: typeof data,
      });
      throw new Error('Failed to encrypt JSON data');
    }
  }

  /**
   * Decrypt JSON data from database
   */
  public decryptJSON(encryptedBuffer: Buffer): any {
    try {
      let offset = 0;
      
      // Extract IV
      const ivLength = encryptedBuffer.readUInt8(offset);
      offset += 1;
      const iv = encryptedBuffer.subarray(offset, offset + ivLength);
      offset += ivLength;
      
      // Extract tag
      const tagLength = encryptedBuffer.readUInt8(offset);
      offset += 1;
      const tag = encryptedBuffer.subarray(offset, offset + tagLength);
      offset += tagLength;
      
      // Extract encrypted data
      const encrypted = encryptedBuffer.subarray(offset);
      
      const decryptedString = this.decrypt(encrypted, iv, tag);
      return JSON.parse(decryptedString);
    } catch (error) {
      logger.error('JSON decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        buffer_length: encryptedBuffer.length,
      });
      throw new Error('Failed to decrypt JSON data');
    }
  }

  /**
   * Hash sensitive data for indexing (one-way)
   */
  public hash(data: string, salt?: string): string {
    try {
      const saltToUse = salt || crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(data, saltToUse, 10000, 64, 'sha512');
      return `${saltToUse}:${hash.toString('hex')}`;
    } catch (error) {
      logger.error('Hashing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Verify hashed data
   */
  public verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const testHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
      return hash === testHash.toString('hex');
    } catch (error) {
      logger.error('Hash verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Generate a secure random token
   */
  public generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key
   */
  public generateApiKey(): { key: string; hash: string } {
    const key = this.generateToken(securityConfig.authentication.api_key_length);
    const hash = this.hash(key);
    return { key, hash };
  }

  /**
   * Verify API key
   */
  public verifyApiKey(key: string, hash: string): boolean {
    return this.verifyHash(key, hash);
  }

  /**
   * Encrypt PHI data with additional safeguards
   */
  public encryptPHI(data: any, patientId: string): Buffer {
    try {
      // Add patient ID to AAD for additional security
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from(`serenity-phi-${patientId}`, 'utf8'));

      const jsonString = JSON.stringify({
        data,
        patient_id: patientId,
        encrypted_at: new Date().toISOString(),
      });

      let encrypted = cipher.update(jsonString, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const tag = cipher.getAuthTag();

      // Combine components
      const combined = Buffer.concat([
        Buffer.from([iv.length]),
        iv,
        Buffer.from([tag.length]),
        tag,
        encrypted
      ]);

      logger.info('PHI data encrypted', {
        patient_id: patientId,
        data_size: jsonString.length,
        encrypted_size: combined.length,
        audit: true,
        hipaa_category: 'PHI_ENCRYPTION',
      });

      return combined;
    } catch (error) {
      logger.error('PHI encryption failed', {
        patient_id: patientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        audit: true,
        hipaa_category: 'PHI_ENCRYPTION_ERROR',
      });
      throw new Error('Failed to encrypt PHI data');
    }
  }

  /**
   * Decrypt PHI data with additional verification
   */
  public decryptPHI(encryptedBuffer: Buffer, expectedPatientId: string): any {
    try {
      let offset = 0;
      
      // Extract components
      const ivLength = encryptedBuffer.readUInt8(offset);
      offset += 1;
      const iv = encryptedBuffer.subarray(offset, offset + ivLength);
      offset += ivLength;
      
      const tagLength = encryptedBuffer.readUInt8(offset);
      offset += 1;
      const tag = encryptedBuffer.subarray(offset, offset + tagLength);
      offset += tagLength;
      
      const encrypted = encryptedBuffer.subarray(offset);

      // Decrypt
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from(`serenity-phi-${expectedPatientId}`, 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const result = JSON.parse(decrypted.toString('utf8'));

      // Verify patient ID matches
      if (result.patient_id !== expectedPatientId) {
        throw new Error('Patient ID mismatch in decrypted PHI data');
      }

      logger.info('PHI data decrypted', {
        patient_id: expectedPatientId,
        audit: true,
        hipaa_category: 'PHI_DECRYPTION',
      });

      return result.data;
    } catch (error) {
      logger.error('PHI decryption failed', {
        patient_id: expectedPatientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        audit: true,
        hipaa_category: 'PHI_DECRYPTION_ERROR',
      });
      throw new Error('Failed to decrypt PHI data');
    }
  }

  /**
   * Secure data deletion (overwrite memory)
   */
  public secureDelete(buffer: Buffer): void {
    crypto.randomFillSync(buffer);
  }

  /**
   * Get encryption metrics for monitoring
   */
  public getMetrics(): {
    algorithm: string;
    key_length: number;
    iv_length: number;
    encryption_enabled: boolean;
  } {
    return {
      algorithm: this.algorithm,
      key_length: this.keyLength,
      iv_length: this.ivLength,
      encryption_enabled: config.hipaa.enableAuditEncryption,
    };
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();