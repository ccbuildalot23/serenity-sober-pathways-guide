import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger, auditLogger } from '../config/logger';
import { redis } from '../config/redis';
import { database } from '../config/database';
import { User, RefreshToken, Session } from '../types/auth';

export interface JWTPayload {
  userId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
}

class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || this.generateSecretKey();
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || this.generateSecretKey();
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    this.issuer = process.env.JWT_ISSUER || 'serenity-auth-service';
    this.audience = process.env.JWT_AUDIENCE || 'serenity-platform';

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      logger.warn('JWT secrets not provided in environment variables, using generated secrets');
    }
  }

  private generateSecretKey(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const [, value, unit] = match;
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(value) * multipliers[unit as keyof typeof multipliers];
  }

  async generateTokenPair(
    user: User,
    sessionId: string,
    deviceInfo?: any
  ): Promise<TokenPair> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const accessTokenExpiresIn = this.parseExpiry(this.accessTokenExpiry);
      const refreshTokenExpiresIn = this.parseExpiry(this.refreshTokenExpiry);

      // Get user roles and permissions
      const roles = await this.getUserRoles(user.id);
      const permissions = await this.getUserPermissions(roles);

      const accessPayload: JWTPayload = {
        userId: user.id,
        sessionId,
        roles,
        permissions,
        type: 'access',
        iat: now,
        exp: now + accessTokenExpiresIn,
        iss: this.issuer,
        aud: this.audience,
      };

      const refreshPayload: JWTPayload = {
        userId: user.id,
        sessionId,
        roles,
        permissions,
        type: 'refresh',
        iat: now,
        exp: now + refreshTokenExpiresIn,
        iss: this.issuer,
        aud: this.audience,
      };

      const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
        algorithm: 'HS256',
      });

      const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
        algorithm: 'HS256',
      });

      // Store refresh token in database with token family for security
      const tokenFamily = crypto.randomUUID();
      await this.storeRefreshToken(
        refreshToken,
        user.id,
        sessionId,
        new Date((now + refreshTokenExpiresIn) * 1000),
        tokenFamily
      );

      // Cache access token for quick validation
      await redis.set(
        `access_token:${sessionId}`,
        { userId: user.id, roles, permissions },
        accessTokenExpiresIn
      );

      auditLogger.userAction('token_generated', user.id, {
        sessionId,
        tokenType: 'access_refresh_pair',
        expiresIn: accessTokenExpiresIn,
        deviceInfo,
      });

      logger.info('Token pair generated successfully', {
        userId: user.id,
        sessionId,
        accessExpiresIn: accessTokenExpiresIn,
        refreshExpiresIn: refreshTokenExpiresIn,
      });

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: accessTokenExpiresIn,
        refreshExpiresIn: refreshTokenExpiresIn,
      };
    } catch (error) {
      logger.error('Failed to generate token pair', {
        userId: user.id,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async validateAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Check if session is still valid in Redis
      const cachedSession = await redis.get(`access_token:${payload.sessionId}`);
      if (!cachedSession) {
        // Check in database if Redis is down
        const session = await this.getSessionFromDatabase(payload.sessionId);
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
          return null;
        }
      }

      return payload;
    } catch (error) {
      logger.debug('Access token validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async validateRefreshToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as JWTPayload;
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists and is not revoked in database
      const storedToken = await this.getRefreshTokenFromDatabase(token, payload.userId);
      if (!storedToken || storedToken.revokedAt) {
        // Potential token reuse attack - revoke all tokens in family
        if (storedToken) {
          await this.revokeTokenFamily(storedToken.family, 'token_reuse_detected');
          auditLogger.securityEvent('refresh_token_reuse_detected', 'high', {
            userId: payload.userId,
            sessionId: payload.sessionId,
            tokenFamily: storedToken.family,
          });
        }
        return null;
      }

      return payload;
    } catch (error) {
      logger.debug('Refresh token validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      const payload = await this.validateRefreshToken(refreshToken);
      if (!payload) {
        return null;
      }

      // Get current refresh token record
      const storedToken = await this.getRefreshTokenFromDatabase(refreshToken, payload.userId);
      if (!storedToken) {
        return null;
      }

      // Revoke old refresh token
      await this.revokeRefreshToken(refreshToken, payload.userId, 'token_refresh');

      // Get user data
      const user = await this.getUserFromDatabase(payload.userId);
      if (!user || !user.isActive) {
        return null;
      }

      // Generate new token pair
      const newTokenPair = await this.generateTokenPair(user, payload.sessionId);

      auditLogger.userAction('token_refreshed', payload.userId, {
        sessionId: payload.sessionId,
        oldTokenFamily: storedToken.family,
      });

      return newTokenPair;
    } catch (error) {
      logger.error('Failed to refresh access token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async revokeToken(token: string, userId: string, reason: string): Promise<void> {
    try {
      const payload = await this.validateRefreshToken(token);
      if (payload) {
        await this.revokeRefreshToken(token, userId, reason);
      }

      // Also clear from Redis cache
      if (payload) {
        await redis.del(`access_token:${payload.sessionId}`);
      }

      auditLogger.userAction('token_revoked', userId, { reason });
    } catch (error) {
      logger.error('Failed to revoke token', {
        userId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async revokeAllUserTokens(userId: string, reason: string): Promise<void> {
    try {
      // Revoke all refresh tokens for user
      await database.query(
        `UPDATE refresh_tokens 
         SET revoked_at = NOW(), revoked_by = $1, revoked_reason = $2 
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId, reason]
      );

      // Clear all user sessions from Redis
      await redis.deleteUserSessions(userId);

      // Revoke all active sessions in database
      await database.query(
        `UPDATE sessions 
         SET revoked_at = NOW(), revoked_by = $1, revoked_reason = $2 
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId, reason]
      );

      auditLogger.userAction('all_tokens_revoked', userId, { reason });
      
      logger.info('All user tokens revoked', { userId, reason });
    } catch (error) {
      logger.error('Failed to revoke all user tokens', {
        userId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async revokeTokenFamily(family: string, reason: string): Promise<void> {
    try {
      await database.query(
        `UPDATE refresh_tokens 
         SET revoked_at = NOW(), revoked_reason = $1 
         WHERE family = $2 AND revoked_at IS NULL`,
        [reason, family]
      );

      auditLogger.securityEvent('token_family_revoked', 'high', {
        tokenFamily: family,
        reason,
      });

      logger.warn('Token family revoked', { family, reason });
    } catch (error) {
      logger.error('Failed to revoke token family', {
        family,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async storeRefreshToken(
    token: string,
    userId: string,
    sessionId: string,
    expiresAt: Date,
    family: string
  ): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await database.query(
      `INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at, family)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, sessionId, tokenHash, expiresAt, family]
    );
  }

  private async getRefreshTokenFromDatabase(
    token: string,
    userId: string
  ): Promise<RefreshToken | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const results = await database.query(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = $1 AND user_id = $2 AND expires_at > NOW()`,
      [tokenHash, userId]
    );

    return results[0] || null;
  }

  private async revokeRefreshToken(
    token: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await database.query(
      `UPDATE refresh_tokens 
       SET revoked_at = NOW(), revoked_reason = $1 
       WHERE token_hash = $2 AND user_id = $3`,
      [reason, tokenHash, userId]
    );
  }

  private async getSessionFromDatabase(sessionId: string): Promise<Session | null> {
    const results = await database.query(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
    );
    return results[0] || null;
  }

  private async getUserFromDatabase(userId: string): Promise<User | null> {
    const results = await database.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );
    return results[0] || null;
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const results = await database.query(
      `SELECT r.name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = $1 AND ur.is_active = true 
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
      [userId]
    );
    return results.map(row => row.name);
  }

  private async getUserPermissions(roles: string[]): Promise<string[]> {
    if (roles.length === 0) {
      return [];
    }

    const placeholders = roles.map((_, i) => `$${i + 1}`).join(',');
    const results = await database.query(
      `SELECT DISTINCT jsonb_array_elements_text(permissions) as permission 
       FROM roles 
       WHERE name IN (${placeholders})`,
      roles
    );

    return results.map(row => row.permission);
  }

  // Cleanup expired tokens (run periodically)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      // Delete expired refresh tokens
      const result = await database.query(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
      );

      logger.info('Expired tokens cleaned up', {
        deletedCount: result.length,
      });
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get token statistics for monitoring
  async getTokenStatistics(): Promise<{
    activeTokens: number;
    expiredTokens: number;
    revokedTokens: number;
  }> {
    try {
      const [activeResult, expiredResult, revokedResult] = await Promise.all([
        database.query('SELECT COUNT(*) FROM refresh_tokens WHERE expires_at > NOW() AND revoked_at IS NULL'),
        database.query('SELECT COUNT(*) FROM refresh_tokens WHERE expires_at <= NOW()'),
        database.query('SELECT COUNT(*) FROM refresh_tokens WHERE revoked_at IS NOT NULL'),
      ]);

      return {
        activeTokens: parseInt(activeResult[0].count),
        expiredTokens: parseInt(expiredResult[0].count),
        revokedTokens: parseInt(revokedResult[0].count),
      };
    } catch (error) {
      logger.error('Failed to get token statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { activeTokens: 0, expiredTokens: 0, revokedTokens: 0 };
    }
  }
}

export const jwtService = new JWTService();