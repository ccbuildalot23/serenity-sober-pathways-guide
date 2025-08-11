import { supabase } from '../integrations/supabase/client';

interface EmailResult {
  success: boolean;
  message: string;
  retryAfter?: number;
}

class EmailService {
  private static instance: EmailService;
  private resetAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly MAX_ATTEMPTS_PER_HOUR = 3;
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private isRateLimited(email: string): boolean {
    const emailKey = email.toLowerCase().trim();
    const attempt = this.resetAttempts.get(emailKey);
    
    if (!attempt) return false;
    
    const now = Date.now();
    const timeSinceLastAttempt = now - attempt.lastAttempt;
    
    // Reset counter if more than 1 hour has passed
    if (timeSinceLastAttempt > this.RATE_LIMIT_WINDOW) {
      this.resetAttempts.delete(emailKey);
      return false;
    }
    
    return attempt.count >= this.MAX_ATTEMPTS_PER_HOUR;
  }

  private recordAttempt(email: string): void {
    const emailKey = email.toLowerCase().trim();
    const now = Date.now();
    const attempt = this.resetAttempts.get(emailKey);
    
    if (attempt) {
      attempt.count++;
      attempt.lastAttempt = now;
    } else {
      this.resetAttempts.set(emailKey, { count: 1, lastAttempt: now });
    }
  }

  private getRetryAfter(email: string): number {
    const emailKey = email.toLowerCase().trim();
    const attempt = this.resetAttempts.get(emailKey);
    
    if (!attempt) return 0;
    
    const now = Date.now();
    const timeSinceLastAttempt = now - attempt.lastAttempt;
    const remainingTime = this.RATE_LIMIT_WINDOW - timeSinceLastAttempt;
    
    return Math.ceil(remainingTime / (60 * 1000)); // Return minutes
  }

  async sendPasswordResetEmail(email: string): Promise<EmailResult> {
    const sanitizedEmail = email.toLowerCase().trim();
    
    // Check rate limiting
    if (this.isRateLimited(sanitizedEmail)) {
      const retryAfter = this.getRetryAfter(sanitizedEmail);
      return {
        success: false,
        message: `Too many password reset attempts. Please wait ${retryAfter} minutes before trying again.`,
        retryAfter
      };
    }

    try {
      // Use the correct production URL
      const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://serenity-sober-pathways-guide.vercel.app';
      
      console.log('Sending password reset email to:', sanitizedEmail);
      console.log('Redirect URL:', `${baseUrl}/reset-password`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${baseUrl}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        
        // Record the attempt even if it failed
        this.recordAttempt(sanitizedEmail);
        
        if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
          return {
            success: false,
            message: 'Email service is temporarily unavailable due to high volume. Please try again in 1 hour.',
            retryAfter: 60
          };
        } else if (error.message?.includes('User not found')) {
          return {
            success: false,
            message: 'No account found with this email address. Please check your email or sign up for a new account.'
          };
        } else {
          return {
            success: false,
            message: 'Failed to send reset email. Please try again later.'
          };
        }
      }

      // Record successful attempt
      this.recordAttempt(sanitizedEmail);
      
      return {
        success: true,
        message: 'Password reset email sent successfully!'
      };
      
    } catch (err) {
      console.error('Unexpected error sending password reset email:', err);
      this.recordAttempt(sanitizedEmail);
      
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again later.'
      };
    }
  }

  // Method to check if an email can request a reset
  canRequestReset(email: string): { allowed: boolean; retryAfter?: number } {
    const sanitizedEmail = email.toLowerCase().trim();
    
    if (this.isRateLimited(sanitizedEmail)) {
      return {
        allowed: false,
        retryAfter: this.getRetryAfter(sanitizedEmail)
      };
    }
    
    return { allowed: true };
  }

  // Method to clear rate limit for testing
  clearRateLimit(email: string): void {
    const emailKey = email.toLowerCase().trim();
    this.resetAttempts.delete(emailKey);
  }
}

export const emailService = EmailService.getInstance();
