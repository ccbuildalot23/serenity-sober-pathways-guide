import { supabase } from './client';

// Enhanced auth client with retry logic and better error handling
export class AuthClient {
  private maxRetries = 3;
  private retryDelay = 1000;

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Simple health check - just try to get auth session
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          success: false,
          message: `Auth service error: ${error.message}`
        };
      }

      return {
        success: true,
        message: 'Successfully connected to auth service'
      };
    } catch (error: unknown) {
      // Check for network errors
      if (error.message?.includes('fetch')) {
        return {
          success: false,
          message: 'Network error: Unable to connect to authentication service. Please check your internet connection.'
        };
      }
      
      return {
        success: false,
        message: `Connection error: ${error.message || 'Unknown error'}`
      };
    }
  }

  async signUp(email: string, password: string, _userType: string): Promise<{ 
    success: boolean; 
    message: string; 
    data?: unknown;
  }> {
    // Validate inputs
    if (!email || !password) {
      return {
        success: false,
        message: 'Email and password are required'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Please enter a valid email address'
      };
    }

    // Test connection first
    const connectionTest = await this.testConnection();
    if (!connectionTest.success) {
      return connectionTest;
    }

    let lastError: unknown = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Signup attempt ${attempt} for ${email}...`);
        
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              _userType: _userType || 'recovery'
            },
            emailRedirectTo: `${window.location.origin}/auth`
          }
        });

        if (error) {
          lastError = error;
          
          // Check for specific error types
          if (error.message?.includes('User already registered')) {
            return {
              success: false,
              message: 'An account with this email already exists. Please sign in instead.'
            };
          }
          
          if (error.message?.includes('fetch')) {
            // Network error - retry
            if (attempt < this.maxRetries) {
              await this.delay(this.retryDelay * attempt);
              continue;
            }
            return {
              success: false,
              message: 'Network error: Unable to connect to authentication service. Please try again.'
            };
          }
          
          // Other errors - don't retry
          return {
            success: false,
            message: error.message || 'Signup failed. Please try again.'
          };
        }

        // Success!
        return {
          success: true,
          message: 'Account created successfully! Please check your email to verify your account.',
          data: {
            user: data.user,
            session: data.session
          }
        };
      } catch (error: unknown) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
          continue;
        }
      }
    }

    // All retries failed
    return {
      success: false,
      message: lastError?.message || 'Unable to create account. Please check your connection and try again.'
    };
  }

  async signIn(email: string, password: string): Promise<{ 
    success: boolean; 
    message: string; 
    data?: unknown;
  }> {
    // Validate inputs
    if (!email || !password) {
      return {
        success: false,
        message: 'Email and password are required'
      };
    }

    // Test connection first
    const connectionTest = await this.testConnection();
    if (!connectionTest.success) {
      return connectionTest;
    }

    let lastError: unknown = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Signin attempt ${attempt} for ${email}...`);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });

        if (error) {
          lastError = error;
          
          // Check for specific error types
          if (error.message?.includes('Invalid login credentials')) {
            return {
              success: false,
              message: 'Invalid email or password. Please check your credentials and try again.'
            };
          }
          
          if (error.message?.includes('Email not confirmed')) {
            return {
              success: false,
              message: 'Please verify your email before signing in. Check your inbox for the verification link.'
            };
          }
          
          if (error.message?.includes('fetch')) {
            // Network error - retry
            if (attempt < this.maxRetries) {
              await this.delay(this.retryDelay * attempt);
              continue;
            }
            return {
              success: false,
              message: 'Network error: Unable to connect to authentication service. Please try again.'
            };
          }
          
          // Other errors - don't retry
          return {
            success: false,
            message: error.message || 'Sign in failed. Please try again.'
          };
        }

        // Success!
        return {
          success: true,
          message: 'Successfully signed in!',
          data: {
            user: data.user,
            session: data.session
          }
        };
      } catch (error: unknown) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
          continue;
        }
      }
    }

    // All retries failed
    return {
      success: false,
      message: lastError?.message || 'Unable to sign in. Please check your connection and try again.'
    };
  }

  async signOut(): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return {
          success: false,
          message: error.message || 'Sign out failed'
        };
      }

      return {
        success: true,
        message: 'Successfully signed out'
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: error.message || 'Sign out error'
      };
    }
  }

  private delay(_ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, _ms));
  }

  async resetPassword(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    // Test connection first
    const connectionTest = await this.testConnection();
    if (!connectionTest.success) {
      return connectionTest;
    }

    let lastError: unknown = null;

    // Retry logic for reset password
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Password reset attempt ${attempt}/${this.maxRetries}...`);
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          // Check if it's a network error
          if (error.message?.toLowerCase().includes('fetch') || 
              error.message?.toLowerCase().includes('network')) {
            lastError = error;
            
            if (attempt < this.maxRetries) {
              console.log(`Network error, retrying in ${this.retryDelay}_ms...`);
              await this.delay(this.retryDelay);
              continue;
            }
          }
          
          // Other errors - don't retry
          return {
            success: false,
            message: error.message || 'Failed to send reset email. Please try again.'
          };
        }

        // Success!
        return {
          success: true,
          message: 'Password reset email sent successfully!'
        };
      } catch (error: unknown) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          console.log(`Error on attempt ${attempt}, retrying...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    // All retries failed
    return {
      success: false,
      message: lastError?.message || 'Network error: Unable to send reset email. Please check your connection and try again.'
    };
  }

  async updatePassword(newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return {
          success: false,
          message: error.message || 'Failed to update password. Please try again.'
        };
      }

      return {
        success: true,
        message: 'Password updated successfully!'
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: error.message || 'An unexpected error occurred. Please try again.'
      };
    }
  }
}

// Export singleton instance
export const authClient = new AuthClient();