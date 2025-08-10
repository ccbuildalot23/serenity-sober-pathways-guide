import { supabase } from '@/integrations/supabase/client';
import { hipaaAuditService } from './hipaaAuditService';
import DOMPurify from 'dompurify';

interface EmailResult {
  success: boolean;
  message: string;
  retryAfter?: number;
}

interface TokenInfo {
  token: string;
  expiresAt: number;
  attemptCount: number;
}

class EnhancedEmailService {
  private static instance: EnhancedEmailService;
  private resetAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private activeTokens: Map<string, TokenInfo> = new Map();
  private readonly MAX_ATTEMPTS_PER_HOUR = 3;
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
  private readonly TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes for security
  private readonly MAX_TOKEN_ATTEMPTS = 3;

  static getInstance(): EnhancedEmailService {
    if (!EnhancedEmailService.instance) {
      EnhancedEmailService.instance = new EnhancedEmailService();
    }
    return EnhancedEmailService.instance;
  }

  private constructor() {
    // Clean up expired tokens every 5 minutes
    setInterval(() => this.cleanupExpiredTokens(), 5 * 60 * 1000);
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [email, tokenInfo] of this.activeTokens.entries()) {
      if (tokenInfo.expiresAt < now) {
        this.activeTokens.delete(email);
      }
    }
  }

  private isRateLimited(email: string): boolean {
    const emailKey = this.sanitizeEmail(email);
    const attempt = this.resetAttempts.get(emailKey);
    
    if (!attempt) return false;
    
    const now = Date.now();
    const timeSinceLastAttempt = now - attempt.lastAttempt;
    
    if (timeSinceLastAttempt > this.RATE_LIMIT_WINDOW) {
      this.resetAttempts.delete(emailKey);
      return false;
    }
    
    return attempt.count >= this.MAX_ATTEMPTS_PER_HOUR;
  }

  private recordAttempt(email: string): void {
    const emailKey = this.sanitizeEmail(email);
    const now = Date.now();
    const attempt = this.resetAttempts.get(emailKey);
    
    if (attempt) {
      const timeSinceLastAttempt = now - attempt.lastAttempt;
      if (timeSinceLastAttempt > this.RATE_LIMIT_WINDOW) {
        // Reset if window has passed
        this.resetAttempts.set(emailKey, { count: 1, lastAttempt: now });
      } else {
        attempt.count++;
        attempt.lastAttempt = now;
      }
    } else {
      this.resetAttempts.set(emailKey, { count: 1, lastAttempt: now });
    }
  }

  private getRetryAfter(email: string): number {
    const emailKey = this.sanitizeEmail(email);
    const attempt = this.resetAttempts.get(emailKey);
    
    if (!attempt) return 0;
    
    const now = Date.now();
    const timeSinceLastAttempt = now - attempt.lastAttempt;
    const remainingTime = this.RATE_LIMIT_WINDOW - timeSinceLastAttempt;
    
    return Math.ceil(remainingTime / (60 * 1000));
  }

  private sanitizeEmail(email: string): string {
    // Sanitize and normalize email
    return DOMPurify.sanitize(email.toLowerCase().trim());
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async sendPasswordResetEmail(email: string): Promise<EmailResult> {
    const sanitizedEmail = this.sanitizeEmail(email);
    
    // Validate email format
    if (!this.validateEmail(sanitizedEmail)) {
      await hipaaAuditService.logPasswordResetFailed(sanitizedEmail, 'Invalid email format');
      return {
        success: false,
        message: 'Please enter a valid email address.'
      };
    }

    // Check rate limiting
    if (this.isRateLimited(sanitizedEmail)) {
      const retryAfter = this.getRetryAfter(sanitizedEmail);
      await hipaaAuditService.logRateLimitExceeded(sanitizedEmail);
      return {
        success: false,
        message: `Too many password reset attempts. Please wait ${retryAfter} minutes before trying again. If you need immediate help, please contact support or use our crisis resources.`,
        retryAfter
      };
    }

    try {
      // Record the attempt
      this.recordAttempt(sanitizedEmail);
      
      // Log the request for HIPAA compliance
      await hipaaAuditService.logPasswordResetRequest(sanitizedEmail, true);

      // Generate secure token and store it
      const token = this.generateSecureToken();
      this.activeTokens.set(sanitizedEmail, {
        token,
        expiresAt: Date.now() + this.TOKEN_EXPIRY,
        attemptCount: 0
      });

      // Use the correct production URL
      const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://serenity-sober-pathways-guide.vercel.app';
      
      // Send password reset email with enhanced template
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${baseUrl}/reset-password`,
        data: {
          // Include supportive message in the email
          message: 'Your recovery journey continues. We\'re here to help you regain access to your support resources.',
          expiryMinutes: 15,
          supportLine: 'If you need immediate support, call 988 for the Suicide & Crisis Lifeline'
        }
      });

      if (error) {
        console.error('Password reset error:', error);
        await hipaaAuditService.logPasswordResetFailed(sanitizedEmail, error.message);
        
        if (error.message?.includes('rate limit')) {
          return {
            success: false,
            message: 'Our email service is temporarily busy. Please try again in a few minutes. Your recovery is important to us.',
            retryAfter: 5
          };
        } else if (error.message?.includes('User not found')) {
          // Don't reveal if user exists for security
          return {
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link shortly. Please check your inbox and spam folder.'
          };
        } else {
          return {
            success: false,
            message: 'We encountered an issue sending your reset email. Please try again or contact support for assistance.'
          };
        }
      }

      return {
        success: true,
        message: 'Password reset email sent! Please check your inbox. The link will expire in 15 minutes for your security.'
      };
      
    } catch (err) {
      console.error('Unexpected error sending password reset email:', err);
      await hipaaAuditService.logPasswordResetFailed(sanitizedEmail, 'Unexpected error');
      
      return {
        success: false,
        message: 'We encountered an unexpected issue. Please try again or contact support. Remember, help is always available.'
      };
    }
  }

  async validateResetToken(email: string, token: string): Promise<boolean> {
    const sanitizedEmail = this.sanitizeEmail(email);
    const tokenInfo = this.activeTokens.get(sanitizedEmail);
    
    if (!tokenInfo) {
      await hipaaAuditService.logPasswordResetFailed(sanitizedEmail, 'Invalid or expired token');
      return false;
    }

    // Check if token is expired
    if (tokenInfo.expiresAt < Date.now()) {
      this.activeTokens.delete(sanitizedEmail);
      await hipaaAuditService.logPasswordResetFailed(sanitizedEmail, 'Token expired');
      return false;
    }

    // Check attempt count
    if (tokenInfo.attemptCount >= this.MAX_TOKEN_ATTEMPTS) {
      this.activeTokens.delete(sanitizedEmail);
      await hipaaAuditService.logPasswordResetFailed(sanitizedEmail, 'Too many token attempts');
      return false;
    }

    // Increment attempt count
    tokenInfo.attemptCount++;

    // Validate token
    if (tokenInfo.token !== token) {
      if (tokenInfo.attemptCount >= this.MAX_TOKEN_ATTEMPTS) {
        this.activeTokens.delete(sanitizedEmail);
      }
      await hipaaAuditService.logPasswordResetFailed(sanitizedEmail, 'Invalid token');
      return false;
    }

    // Token is valid - remove it so it can't be reused
    this.activeTokens.delete(sanitizedEmail);
    return true;
  }

  canRequestReset(email: string): { allowed: boolean; retryAfter?: number } {
    const sanitizedEmail = this.sanitizeEmail(email);
    
    if (this.isRateLimited(sanitizedEmail)) {
      return {
        allowed: false,
        retryAfter: this.getRetryAfter(sanitizedEmail)
      };
    }
    
    return { allowed: true };
  }

  clearRateLimit(email: string): void {
    const emailKey = this.sanitizeEmail(email);
    this.resetAttempts.delete(emailKey);
    this.activeTokens.delete(emailKey);
  }

  // Get encouraging message for the reset page
  getEncouragingMessage(): string {
    const messages = [
      "Every step forward counts, including this one.",
      "Your recovery journey continues. We're here to help.",
      "Taking care of yourself includes maintaining your access to support.",
      "You're not alone. Let's get you back to your support network.",
      "Recovery is a journey, not a destination. Keep going.",
      "Your commitment to recovery brought you here. We're proud of you."
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

export const enhancedEmailService = EnhancedEmailService.getInstance();