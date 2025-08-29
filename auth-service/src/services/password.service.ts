import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { logger, auditLogger } from '../config/logger';
import { database } from '../config/database';
import { redis } from '../config/redis';
import { emailService } from './email.service';
import { User, PasswordResetToken } from '../types/auth';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAge: number; // in days
  preventReuse: number; // number of previous passwords to check
}

export interface PasswordStrength {
  score: number; // 0-4 (very weak to very strong)
  feedback: string[];
  isValid: boolean;
}

export interface PasswordResetResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  message: string;
}

class PasswordService {
  private readonly saltRounds: number;
  private readonly policy: PasswordPolicy;
  private readonly resetTokenTTL: number;
  private readonly maxResetAttempts: number;

  constructor() {
    this.saltRounds = parseInt(process.env.SALT_ROUNDS || '12');
    this.resetTokenTTL = 3600; // 1 hour
    this.maxResetAttempts = 5;
    
    this.policy = {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
      requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true',
      maxAge: parseInt(process.env.PASSWORD_MAX_AGE || '90'),
      preventReuse: 5,
    };
  }

  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      logger.debug('Password hashed successfully');
      return hash;
    } catch (error) {
      logger.error('Failed to hash password', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Password hashing failed');
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(password, hash);
      logger.debug('Password verification completed', { isMatch });
      return isMatch;
    } catch (error) {
      logger.error('Password verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  validatePasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.policy.minLength) {
      feedback.push(`Password must be at least ${this.policy.minLength} characters long`);
    } else {
      score += 1;
    }

    // Character requirements
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else if (this.policy.requireUppercase) {
      score += 1;
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else if (this.policy.requireLowercase) {
      score += 1;
    }

    if (this.policy.requireNumbers && !/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else if (this.policy.requireNumbers) {
      score += 1;
    }

    if (this.policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Password must contain at least one symbol');
    } else if (this.policy.requireSymbols) {
      score += 1;
    }

    // Additional strength checks
    const hasRepeatedChars = /(.)\1{2,}/.test(password);
    if (hasRepeatedChars) {
      feedback.push('Avoid repeated characters');
      score = Math.max(0, score - 1);
    }

    const hasSequential = this.hasSequentialChars(password);
    if (hasSequential) {
      feedback.push('Avoid sequential characters (e.g., 123, abc)');
      score = Math.max(0, score - 1);
    }

    const hasCommonPatterns = this.hasCommonPatterns(password);
    if (hasCommonPatterns) {
      feedback.push('Avoid common password patterns');
      score = Math.max(0, score - 1);
    }

    // Entropy bonus for longer passwords
    if (password.length >= 16) {
      score = Math.min(4, score + 1);
    }

    const isValid = feedback.length === 0;
    
    return {
      score: Math.max(0, Math.min(4, score)),
      feedback,
      isValid,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      // Get current user data
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentValid = await this.verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        auditLogger.userAction('password_change_failed', userId, {
          reason: 'invalid_current_password',
          sessionId,
          ipAddress,
        });
        return false;
      }

      // Validate new password strength
      const strength = this.validatePasswordStrength(newPassword);
      if (!strength.isValid) {
        throw new Error(`Password does not meet policy requirements: ${strength.feedback.join(', ')}`);
      }

      // Check password reuse
      const isReused = await this.isPasswordReused(userId, newPassword);
      if (isReused) {
        throw new Error(`Cannot reuse any of the last ${this.policy.preventReuse} passwords`);
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password in database
      await database.transaction(async (client) => {
        // Store old password for reuse checking
        await client.query(
          `INSERT INTO password_history (user_id, password_hash, created_at)
           VALUES ($1, $2, NOW())`,
          [userId, user.passwordHash]
        );

        // Update user password
        await client.query(
          `UPDATE users 
           SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [newPasswordHash, userId]
        );

        // Clean up old password history
        await client.query(
          `DELETE FROM password_history 
           WHERE user_id = $1 
           AND id NOT IN (
             SELECT id FROM password_history 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2
           )`,
          [userId, this.policy.preventReuse]
        );
      });

      // Clear user's sessions (force re-login for security)
      await redis.deleteUserSessions(userId);

      auditLogger.userAction('password_changed', userId, {
        passwordStrength: strength.score,
        sessionId,
        ipAddress,
        userAgent,
      });

      logger.info('Password changed successfully', {
        userId,
        passwordStrength: strength.score,
        sessionId,
      });

      return true;
    } catch (error) {
      logger.error('Password change failed', {
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      auditLogger.userAction('password_change_failed', userId, {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        ipAddress,
      });

      throw error;
    }
  }

  async initiatePasswordReset(
    email: string,
    clientUrl?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PasswordResetResult> {
    try {
      // Check rate limiting
      const resetAttemptKey = `password_reset_attempts:${email}`;
      const attempts = await redis.incrementRateLimit(resetAttemptKey, 3600, this.maxResetAttempts);
      
      if (attempts.blocked) {
        auditLogger.securityEvent('password_reset_rate_limit', 'medium', {
          email,
          ipAddress,
          attempts: attempts.count,
        });
        
        return {
          success: false,
          message: 'Too many reset attempts. Please try again later.',
        };
      }

      // Get user by email
      const user = await this.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists - return success anyway
        logger.info('Password reset requested for non-existent email', {
          email,
          ipAddress,
        });
        
        return {
          success: true,
          message: 'If the email exists, you will receive reset instructions.',
        };
      }

      // Generate secure reset token
      const resetToken = this.generateResetToken();
      const expiresAt = new Date(Date.now() + this.resetTokenTTL * 1000);

      // Store reset token
      await database.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          crypto.createHash('sha256').update(resetToken).digest('hex'),
          expiresAt,
          ipAddress,
          userAgent,
        ]
      );

      // Send reset email
      const resetUrl = clientUrl 
        ? `${clientUrl}?token=${resetToken}`
        : `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      await emailService.sendPasswordResetEmail(user.email, resetUrl, user.firstName);

      auditLogger.userAction('password_reset_requested', user.id, {
        email: user.email,
        ipAddress,
        userAgent,
        expiresAt: expiresAt.toISOString(),
      });

      logger.info('Password reset initiated', {
        userId: user.id,
        email: user.email,
        ipAddress,
        expiresAt,
      });

      return {
        success: true,
        token: resetToken,
        expiresAt,
        message: 'Reset instructions sent to your email address.',
      };
    } catch (error) {
      logger.error('Password reset initiation failed', {
        email,
        ipAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        message: 'An error occurred while processing your request.',
      };
    }
  }

  async completePasswordReset(
    resetToken: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      // Validate new password
      const strength = this.validatePasswordStrength(newPassword);
      if (!strength.isValid) {
        throw new Error(`Password does not meet policy requirements: ${strength.feedback.join(', ')}`);
      }

      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Get and validate reset token
      const tokenResults = await database.query(
        `SELECT prt.*, u.id as user_id, u.email
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token_hash = $1 
         AND prt.expires_at > NOW() 
         AND prt.used_at IS NULL
         AND u.is_active = true`,
        [tokenHash]
      );

      if (tokenResults.length === 0) {
        auditLogger.securityEvent('invalid_password_reset_token', 'medium', {
          tokenHash: tokenHash.substring(0, 8) + '...',
          ipAddress,
          userAgent,
        });
        return false;
      }

      const tokenData = tokenResults[0];
      const userId = tokenData.user_id;

      // Check if new password is different from current
      const user = await this.getUserById(userId);
      if (user && await this.verifyPassword(newPassword, user.passwordHash)) {
        throw new Error('New password must be different from current password');
      }

      // Check password reuse
      const isReused = await this.isPasswordReused(userId, newPassword);
      if (isReused) {
        throw new Error(`Cannot reuse any of the last ${this.policy.preventReuse} passwords`);
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Complete reset
      await database.transaction(async (client) => {
        // Store old password for reuse checking if user exists
        if (user) {
          await client.query(
            `INSERT INTO password_history (user_id, password_hash, created_at)
             VALUES ($1, $2, NOW())`,
            [userId, user.passwordHash]
          );
        }

        // Update password
        await client.query(
          `UPDATE users 
           SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [newPasswordHash, userId]
        );

        // Mark token as used
        await client.query(
          'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
          [tokenData.id]
        );

        // Clean up old password history
        await client.query(
          `DELETE FROM password_history 
           WHERE user_id = $1 
           AND id NOT IN (
             SELECT id FROM password_history 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2
           )`,
          [userId, this.policy.preventReuse]
        );
      });

      // Clear user's sessions for security
      await redis.deleteUserSessions(userId);

      auditLogger.userAction('password_reset_completed', userId, {
        email: tokenData.email,
        passwordStrength: strength.score,
        ipAddress,
        userAgent,
      });

      logger.info('Password reset completed successfully', {
        userId,
        email: tokenData.email,
        passwordStrength: strength.score,
        ipAddress,
      });

      return true;
    } catch (error) {
      logger.error('Password reset completion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress,
      });
      throw error;
    }
  }

  async checkPasswordAge(userId: string): Promise<{
    daysOld: number;
    isExpired: boolean;
    warningDays?: number;
  }> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const passwordChangedAt = new Date(user.passwordChangedAt);
      const now = new Date();
      const daysOld = Math.floor((now.getTime() - passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = daysOld > this.policy.maxAge;
      
      // Warning period (7 days before expiration)
      const warningDays = this.policy.maxAge - daysOld;
      const showWarning = warningDays <= 7 && warningDays > 0;

      return {
        daysOld,
        isExpired,
        warningDays: showWarning ? warningDays : undefined,
      };
    } catch (error) {
      logger.error('Failed to check password age', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
    try {
      const historyResults = await database.query(
        `SELECT password_hash FROM password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, this.policy.preventReuse]
      );

      // Also check current password
      const userResults = await database.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      const allHashes = [
        ...historyResults.map(row => row.password_hash),
        ...(userResults.length > 0 ? [userResults[0].password_hash] : [])
      ];

      for (const hash of allHashes) {
        if (await this.verifyPassword(newPassword, hash)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check password reuse', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  private hasSequentialChars(password: string): boolean {
    const sequences = [
      '0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiopasdfghjklzxcvbnm'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const seq = sequence.substring(i, i + 3);
        if (password.toLowerCase().includes(seq) || 
            password.toLowerCase().includes(seq.split('').reverse().join(''))) {
          return true;
        }
      }
    }

    return false;
  }

  private hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      /password/i, /123456/, /qwerty/i, /admin/i, /login/i,
      /welcome/i, /password123/i, /admin123/i
    ];

    return commonPatterns.some(pattern => pattern.test(password));
  }

  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async getUserById(userId: string): Promise<any | null> {
    try {
      const results = await database.query(
        'SELECT id, email, first_name, password_hash, password_changed_at FROM users WHERE id = $1',
        [userId]
      );
      return results.length > 0 ? {
        id: results[0].id,
        email: results[0].email,
        firstName: results[0].first_name,
        passwordHash: results[0].password_hash,
        passwordChangedAt: results[0].password_changed_at,
      } : null;
    } catch (error) {
      return null;
    }
  }

  private async getUserByEmail(email: string): Promise<any | null> {
    try {
      const results = await database.query(
        'SELECT id, email, first_name, password_hash, password_changed_at FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );
      return results.length > 0 ? {
        id: results[0].id,
        email: results[0].email,
        firstName: results[0].first_name,
        passwordHash: results[0].password_hash,
        passwordChangedAt: results[0].password_changed_at,
      } : null;
    } catch (error) {
      return null;
    }
  }

  // Cleanup expired tokens
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await database.query(
        'DELETE FROM password_reset_tokens WHERE expires_at < NOW()'
      );

      if (result.rowCount && result.rowCount > 0) {
        logger.info('Expired password reset tokens cleaned up', {
          count: result.rowCount,
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup expired password reset tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  getPasswordPolicy(): PasswordPolicy {
    return { ...this.policy };
  }
}

export const passwordService = new PasswordService();