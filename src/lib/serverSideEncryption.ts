
import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side encryption service that keeps all encryption/decryption on the server
 * This is the most secure approach as the encryption key never leaves the server
 */
class ServerSideEncryption {
  private static instance: ServerSideEncryption;

  private constructor() {}

  static getInstance(): ServerSideEncryption {
    if (!ServerSideEncryption.instance) {
      ServerSideEncryption.instance = new ServerSideEncryption();
    }
    return ServerSideEncryption.instance;
  }

  /**
   * Encrypt data on the server-side
   * @param data - Plain text data to encrypt
   * @returns Promise<string> - Encrypted data as base64 string
   */
  async encrypt(data: string): Promise<string> {
    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { data }
      });

      if (error) {
        console.error('Server-side encryption failed:', error);
        throw new Error('Data encryption failed');
      }

      if (!result?.encryptedData) {
        throw new Error('Invalid encryption response');
      }

      return result.encryptedData;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt data on the server-side
   * @param encryptedData - Base64 encrypted data string
   * @returns Promise<string> - Decrypted plain text data
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      const { data: result, error } = await supabase.functions.invoke('decrypt-data', {
        body: { encryptedData }
      });

      if (error) {
        console.error('Server-side decryption failed:', error);
        throw new Error('Data decryption failed');
      }

      if (!result?.decryptedData) {
        throw new Error('Invalid decryption response');
      }

      return result.decryptedData;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Data decryption failed');
    }
  }
}

export const serverSideEncryption = ServerSideEncryption.getInstance();
