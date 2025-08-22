import crypto from 'crypto';
import { config } from '@/config';
import { logger } from '@/utils/logger';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  constructor() {
    this.validateKeys();
  }

  private validateKeys(): void {
    if (!config.encryption.key || config.encryption.key.length !== this.keyLength) {
      throw new Error('Invalid encryption key length. Must be 32 characters.');
    }
    if (!config.encryption.hipaaKey || config.encryption.hipaaKey.length !== this.keyLength) {
      throw new Error('Invalid HIPAA encryption key length. Must be 32 characters.');
    }
  }

  async encryptData(data: string): Promise<string> {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, config.encryption.key);
      cipher.setAAD(Buffer.from('serenity-notifications'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine iv + tag + encrypted data
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
      return combined.toString('base64');

    } catch (error) {
      logger.error('Data encryption failed', { error });
      throw new Error('Encryption failed');
    }
  }

  async decryptData(encryptedData: string): Promise<string> {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      const iv = combined.subarray(0, this.ivLength);
      const tag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.subarray(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipherGCM(this.algorithm, config.encryption.key);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from('serenity-notifications'));

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      logger.error('Data decryption failed', { error });
      throw new Error('Decryption failed');
    }
  }

  async encryptHipaaData(data: string): Promise<string> {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipherGCM(this.algorithm, config.encryption.hipaaKey);
      cipher.setAAD(Buffer.from('hipaa-phi-data'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine iv + tag + encrypted data with HIPAA prefix
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
      const hipaaEncrypted = 'HIPAA:' + combined.toString('base64');

      logger.debug('HIPAA data encrypted', {
        originalLength: data.length,
        encryptedLength: hipaaEncrypted.length
      });

      return hipaaEncrypted;

    } catch (error) {
      logger.error('HIPAA data encryption failed', { error });
      throw new Error('HIPAA encryption failed');
    }
  }

  async decryptHipaaData(encryptedData: string): Promise<string> {
    try {
      if (!encryptedData.startsWith('HIPAA:')) {
        throw new Error('Invalid HIPAA encrypted data format');
      }

      const base64Data = encryptedData.substring(6); // Remove 'HIPAA:' prefix
      const combined = Buffer.from(base64Data, 'base64');
      
      const iv = combined.subarray(0, this.ivLength);
      const tag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.subarray(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipherGCM(this.algorithm, config.encryption.hipaaKey);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from('hipaa-phi-data'));

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('HIPAA data decrypted', {
        encryptedLength: encryptedData.length,
        decryptedLength: decrypted.length
      });

      return decrypted;

    } catch (error) {
      logger.error('HIPAA data decryption failed', { error });
      throw new Error('HIPAA decryption failed');
    }
  }

  generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  async encryptObject(obj: Record<string, any>, isHipaa: boolean = false): Promise<string> {
    const jsonString = JSON.stringify(obj);
    return isHipaa ? this.encryptHipaaData(jsonString) : this.encryptData(jsonString);
  }

  async decryptObject<T = Record<string, any>>(encryptedData: string): Promise<T> {
    const isHipaa = encryptedData.startsWith('HIPAA:');
    const decrypted = isHipaa 
      ? await this.decryptHipaaData(encryptedData)
      : await this.decryptData(encryptedData);
    
    return JSON.parse(decrypted) as T;
  }

  maskSensitiveData(data: string, maskChar: string = '*', visibleChars: number = 4): string {
    if (data.length <= visibleChars) {
      return maskChar.repeat(data.length);
    }
    
    const visibleStart = Math.floor(visibleChars / 2);
    const visibleEnd = visibleChars - visibleStart;
    
    return data.substring(0, visibleStart) + 
           maskChar.repeat(data.length - visibleChars) + 
           data.substring(data.length - visibleEnd);
  }

  // Method to validate data integrity
  verifyDataIntegrity(data: string, expectedHash: string): boolean {
    const actualHash = this.generateHash(data);
    return actualHash === expectedHash;
  }

  // HIPAA-compliant data wiping
  secureWipe(buffer: Buffer): void {
    // Overwrite with random data multiple times for secure deletion
    for (let i = 0; i < 3; i++) {
      crypto.randomFillSync(buffer);
    }
    buffer.fill(0);
  }
}

export const encryptionService = new EncryptionService();