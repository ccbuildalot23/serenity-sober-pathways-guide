/**
 * Encryption Handler Worker
 * Manages data encryption and decryption
 */

import { Context } from 'aws-lambda';
import * as crypto from 'crypto';

interface EncryptionRequest {
  action: 'encrypt' | 'decrypt';
  data: string;
  keyId?: string;
}

interface EncryptionResult {
  success: boolean;
  data?: string;
  error?: string;
}

export const handler = async (event: EncryptionRequest, context: Context): Promise<EncryptionResult> => {
  console.log('Encryption handler worker invoked');

  try {
    // Use environment variable for encryption key (in production, use AWS KMS)
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf8').slice(0, 32);
    const iv = crypto.randomBytes(16);

    if (event.action === 'encrypt') {
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(event.data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data
      const result = iv.toString('hex') + ':' + encrypted;
      
      return {
        success: true,
        data: result
      };
    } else if (event.action === 'decrypt') {
      // Split IV and encrypted data
      const parts = event.data.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return {
        success: true,
        data: decrypted
      };
    } else {
      return {
        success: false,
        error: 'Invalid action'
      };
    }
  } catch (error) {
    console.error('Encryption error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Encryption failed'
    };
  }
};