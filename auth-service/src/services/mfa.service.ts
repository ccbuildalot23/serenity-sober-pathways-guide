import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { logger, auditLogger } from '../config/logger';
import { database } from '../config/database';
import { redis } from '../config/redis';
import { User, MFABackupCode } from '../types/auth';

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  setupToken: string;
}

export interface MFAVerificationResult {
  success: boolean;
  backupCodeUsed?: boolean;
  remainingBackupCodes?: number;
}

class MFAService {
  private readonly issuerName: string;
  private readonly tokenWindow: number;
  private readonly backupCodesCount: number;

  constructor() {
    this.issuerName = process.env.MFA_ISSUER_NAME || 'Serenity Healthcare';
    this.tokenWindow = parseInt(process.env.MFA_TOKEN_WINDOW || '2');
    this.backupCodesCount = parseInt(process.env.MFA_BACKUP_CODES_COUNT || '10');
  }

  async generateMFASecret(userId: string, userEmail: string): Promise<MFASetupResponse> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: this.issuerName,
        length: 32,
      });

      if (!secret.base32) {
        throw new Error('Failed to generate MFA secret');
      }

      // Generate QR code
      const qrCodeUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: userEmail,
        issuer: this.issuerName,
        encoding: 'base32',
      });

      const qrCode = await QRCode.toDataURL(qrCodeUrl);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Create setup token (valid for 10 minutes)
      const setupToken = this.generateSetupToken(userId, secret.base32);
      await redis.set(`mfa_setup:${setupToken}`, {
        userId,
        secret: secret.base32,
        backupCodes,
        createdAt: new Date().toISOString(),
      }, 600); // 10 minutes

      auditLogger.userAction('mfa_setup_initiated', userId, {
        userEmail,
        backupCodesGenerated: backupCodes.length,
      });

      logger.info('MFA setup initiated', { userId, userEmail });

      return {
        secret: secret.base32,
        qrCode,
        backupCodes,
        setupToken,
      };
    } catch (error) {
      logger.error('Failed to generate MFA secret', {
        userId,
        userEmail,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async completeMFASetup(setupToken: string, totpCode: string, userId: string): Promise<boolean> {
    try {
      // Get setup data from Redis
      const setupData = await redis.get(`mfa_setup:${setupToken}`);
      if (!setupData || setupData.userId !== userId) {
        throw new Error('Invalid or expired setup token');
      }

      // Verify TOTP code
      const isValidToken = speakeasy.totp.verify({
        secret: setupData.secret,
        encoding: 'base32',
        token: totpCode,
        window: this.tokenWindow,
      });

      if (!isValidToken) {
        auditLogger.userAction('mfa_setup_failed', userId, {
          reason: 'invalid_totp_code',
        });
        return false;
      }

      // Update user in database
      await database.transaction(async (client) => {
        // Enable MFA and store secret
        await client.query(
          'UPDATE users SET mfa_enabled = true, mfa_secret = $1 WHERE id = $2',
          [setupData.secret, userId]
        );

        // Store backup codes
        const backupCodePromises = setupData.backupCodes.map((code: string) =>
          client.query(
            'INSERT INTO mfa_backup_codes (user_id, code_hash) VALUES ($1, $2)',
            [userId, this.hashBackupCode(code)]
          )
        );
        await Promise.all(backupCodePromises);
      });

      // Clear setup data
      await redis.del(`mfa_setup:${setupToken}`);

      auditLogger.userAction('mfa_enabled', userId, {
        backupCodesStored: setupData.backupCodes.length,
      });

      logger.info('MFA setup completed successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to complete MFA setup', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async verifyTOTP(userId: string, totpCode: string): Promise<MFAVerificationResult> {
    try {
      // Get user's MFA secret
      const userResults = await database.query(
        'SELECT mfa_secret FROM users WHERE id = $1 AND mfa_enabled = true',
        [userId]
      );

      if (userResults.length === 0) {
        throw new Error('MFA not enabled for user');
      }

      const { mfa_secret: secret } = userResults[0];

      // Check for recent TOTP usage to prevent replay attacks
      const recentUsageKey = `totp_used:${userId}:${totpCode}`;
      const wasRecentlyUsed = await redis.get(recentUsageKey);
      
      if (wasRecentlyUsed) {
        auditLogger.securityEvent('totp_replay_attempt', 'medium', {
          userId,
          totpCode: totpCode.substring(0, 2) + '****', // Partial for audit
        });
        return { success: false };
      }

      // Verify TOTP
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: totpCode,
        window: this.tokenWindow,
      });

      if (isValid) {
        // Mark this TOTP as recently used (prevent replay for 90 seconds)
        await redis.set(recentUsageKey, '1', 90);
        
        auditLogger.userAction('mfa_totp_verified', userId, { success: true });
        logger.info('TOTP verification successful', { userId });
        
        return { success: true };
      }

      auditLogger.userAction('mfa_totp_failed', userId, { 
        reason: 'invalid_code',
        totpCode: totpCode.substring(0, 2) + '****',
      });
      
      return { success: false };
    } catch (error) {
      logger.error('TOTP verification failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false };
    }
  }

  async verifyBackupCode(userId: string, backupCode: string): Promise<MFAVerificationResult> {
    try {
      const codeHash = this.hashBackupCode(backupCode);

      // Find and use backup code
      const result = await database.transaction(async (client) => {
        // Find unused backup code
        const codeResults = await client.query(
          'SELECT id FROM mfa_backup_codes WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL',
          [userId, codeHash]
        );

        if (codeResults.length === 0) {
          return null;
        }

        const codeId = codeResults[0].id;

        // Mark code as used
        await client.query(
          'UPDATE mfa_backup_codes SET used_at = NOW() WHERE id = $1',
          [codeId]
        );

        // Get remaining backup codes count
        const remainingResults = await client.query(
          'SELECT COUNT(*) FROM mfa_backup_codes WHERE user_id = $1 AND used_at IS NULL',
          [userId]
        );

        return {
          success: true,
          remainingCount: parseInt(remainingResults[0].count),
        };
      });

      if (!result) {
        auditLogger.userAction('mfa_backup_code_failed', userId, {
          reason: 'invalid_or_used_code',
        });
        return { success: false };
      }

      auditLogger.userAction('mfa_backup_code_used', userId, {
        remainingCodes: result.remainingCount,
      });

      // Warn if running low on backup codes
      if (result.remainingCount <= 2) {
        logger.warn('User running low on backup codes', {
          userId,
          remaining: result.remainingCount,
        });
      }

      return {
        success: true,
        backupCodeUsed: true,
        remainingBackupCodes: result.remainingCount,
      };
    } catch (error) {
      logger.error('Backup code verification failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false };
    }
  }

  async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const newBackupCodes = this.generateBackupCodes();

      await database.transaction(async (client) => {
        // Delete old backup codes
        await client.query(
          'DELETE FROM mfa_backup_codes WHERE user_id = $1',
          [userId]
        );

        // Insert new backup codes
        const insertPromises = newBackupCodes.map(code =>
          client.query(
            'INSERT INTO mfa_backup_codes (user_id, code_hash) VALUES ($1, $2)',
            [userId, this.hashBackupCode(code)]
          )
        );
        await Promise.all(insertPromises);
      });

      auditLogger.userAction('mfa_backup_codes_regenerated', userId, {
        newCodesCount: newBackupCodes.length,
      });

      logger.info('New backup codes generated', { userId, count: newBackupCodes.length });
      return newBackupCodes;
    } catch (error) {
      logger.error('Failed to generate new backup codes', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async disableMFA(userId: string): Promise<void> {
    try {
      await database.transaction(async (client) => {
        // Disable MFA and clear secret
        await client.query(
          'UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1',
          [userId]
        );

        // Delete all backup codes
        await client.query(
          'DELETE FROM mfa_backup_codes WHERE user_id = $1',
          [userId]
        );
      });

      // Clear any MFA-related cache
      const pattern = `totp_used:${userId}:*`;
      const keys = await redis.getClient().keys(pattern);
      if (keys.length > 0) {
        await redis.getClient().del(...keys);
      }

      auditLogger.userAction('mfa_disabled', userId, {});
      logger.info('MFA disabled for user', { userId });
    } catch (error) {
      logger.error('Failed to disable MFA', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    backupCodesRemaining: number;
    lastVerifiedAt?: Date;
  }> {
    try {
      const userResults = await database.query(
        'SELECT mfa_enabled FROM users WHERE id = $1',
        [userId]
      );

      if (userResults.length === 0) {
        throw new Error('User not found');
      }

      const mfaEnabled = userResults[0].mfa_enabled;

      if (!mfaEnabled) {
        return {
          enabled: false,
          backupCodesRemaining: 0,
        };
      }

      // Count remaining backup codes
      const backupResults = await database.query(
        'SELECT COUNT(*) FROM mfa_backup_codes WHERE user_id = $1 AND used_at IS NULL',
        [userId]
      );

      // Get last verification time from audit logs
      const lastVerificationResults = await database.query(
        `SELECT created_at FROM audit_logs 
         WHERE user_id = $1 AND action IN ('mfa_totp_verified', 'mfa_backup_code_used') 
         AND success = true 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId]
      );

      return {
        enabled: true,
        backupCodesRemaining: parseInt(backupResults[0].count),
        lastVerifiedAt: lastVerificationResults.length > 0 
          ? lastVerificationResults[0].created_at 
          : undefined,
      };
    } catch (error) {
      logger.error('Failed to get MFA status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.backupCodesCount; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private generateSetupToken(userId: string, secret: string): string {
    const data = `${userId}:${secret}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  // Administrative functions
  async getMFAStatistics(): Promise<{
    totalUsersWithMFA: number;
    mfaAdoptionRate: number;
    averageBackupCodesRemaining: number;
  }> {
    try {
      const [mfaUsersResult, totalUsersResult, avgBackupCodesResult] = await Promise.all([
        database.query('SELECT COUNT(*) FROM users WHERE mfa_enabled = true'),
        database.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
        database.query(`
          SELECT AVG(backup_count) as avg_backup_codes
          FROM (
            SELECT user_id, COUNT(*) as backup_count
            FROM mfa_backup_codes 
            WHERE used_at IS NULL 
            GROUP BY user_id
          ) as user_backup_counts
        `),
      ]);

      const totalMFAUsers = parseInt(mfaUsersResult[0].count);
      const totalUsers = parseInt(totalUsersResult[0].count);
      const adoptionRate = totalUsers > 0 ? (totalMFAUsers / totalUsers) * 100 : 0;
      const avgBackupCodes = parseFloat(avgBackupCodesResult[0].avg_backup_codes || '0');

      return {
        totalUsersWithMFA: totalMFAUsers,
        mfaAdoptionRate: Math.round(adoptionRate * 100) / 100,
        averageBackupCodesRemaining: Math.round(avgBackupCodes * 100) / 100,
      };
    } catch (error) {
      logger.error('Failed to get MFA statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        totalUsersWithMFA: 0,
        mfaAdoptionRate: 0,
        averageBackupCodesRemaining: 0,
      };
    }
  }

  // Emergency MFA bypass (for administrative purposes)
  async emergencyMFABypass(userId: string, adminId: string, reason: string): Promise<string> {
    try {
      // Generate temporary bypass token (valid for 1 hour)
      const bypassToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

      await redis.set(`mfa_bypass:${bypassToken}`, {
        userId,
        adminId,
        reason,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      }, 3600);

      auditLogger.securityEvent('mfa_emergency_bypass', 'high', {
        userId,
        adminId,
        reason,
        bypassToken: bypassToken.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString(),
      });

      logger.warn('Emergency MFA bypass granted', { userId, adminId, reason });
      return bypassToken;
    } catch (error) {
      logger.error('Failed to create emergency MFA bypass', {
        userId,
        adminId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async validateMFABypass(bypassToken: string): Promise<string | null> {
    try {
      const bypassData = await redis.get(`mfa_bypass:${bypassToken}`);
      if (!bypassData) {
        return null;
      }

      // Check if expired
      if (new Date(bypassData.expiresAt) < new Date()) {
        await redis.del(`mfa_bypass:${bypassToken}`);
        return null;
      }

      // Single use - delete after validation
      await redis.del(`mfa_bypass:${bypassToken}`);

      auditLogger.securityEvent('mfa_bypass_used', 'high', {
        userId: bypassData.userId,
        adminId: bypassData.adminId,
        reason: bypassData.reason,
      });

      return bypassData.userId;
    } catch (error) {
      logger.error('Failed to validate MFA bypass', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

export const mfaService = new MFAService();