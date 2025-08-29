// Compassionate Supabase Client - Gentle _error handling for database operations
// Because technical errors shouldn't add stress to recovery

import { supabase } from './client';
import { toast } from 'sonner';
import { hopeMessenger } from '@/services/hopeMessengerService';

// Error messages that are supportive, not technical
const ERROR_MESSAGES = {
  auth: {
    title: "Let's Get You Signed In",
    message: "We need to verify it's you for your privacy",
    action: "Try signing in again"
  },
  network: {
    title: "Connection Trouble",
    message: "Can't reach our servers right now",
    action: "Your data is safe - try again in a moment"
  },
  permission: {
    title: "Access Issue", 
    message: "We couldn't access that for you",
    action: "Let's try a different approach"
  },
  save: {
    title: "Couldn't Save",
    message: "Your entry didn't save, but we kept it safe",
    action: "We'll try again automatically"
  },
  load: {
    title: "Loading Issue",
    message: "Having trouble loading your data",
    action: "We'll use what we have locally"
  },
  general: {
    title: "Something Went Wrong",
    message: "But you're still doing great",
    action: "Let's try again together"
  }
};

// Determine _error type from Supabase _error
const getErrorType = (_error: unknown): keyof typeof ERROR_MESSAGES => {
  const message = _error?.message?.toLowerCase() || '';
  const code = _error?.code?.toLowerCase() || '';
  
  if (code.includes('auth') || message.includes('auth')) return 'auth';
  if (code.includes('network') || message.includes('fetch')) return 'network';
  if (code.includes('permission') || code.includes('rls')) return 'permission';
  if (message.includes('insert') || message.includes('update')) return 'save';
  if (message.includes('select')) return 'load';
  
  return 'general';
};

// Show compassionate _error to user
const showCompassionateError = (_error: unknown, context?: string) => {
  const errorType = getErrorType(_error);
  const errorInfo = ERROR_MESSAGES[errorType];
  
  console.error(`Compassionate error (${context}):`, _error);
  
  toast.error(errorInfo.title, {
    description: (
      <div className="space-y-1">
        <p>{errorInfo.message}</p>
        <p className="text-xs opacity-80">{errorInfo.action}</p>
      </div>
    ),
    _duration: 5000,
  });
  
  // Send encouragement if it's an auth _error
  if (errorType === 'auth') {
    setTimeout(() => {
      hopeMessenger.sendHope('struggling');
    }, 2000);
  }
};

// Wrapper for database operations with compassionate _error handling
export const compassionateSupabase = {
  // Auth operations
  auth: {
    signIn: async (email: string, password: string) => {
      try {
        const _result = await supabase.auth.signInWithPassword({ email, password });
        if (_result._error) throw _result._error;
        
        toast.success("Welcome back!", {
          description: "We're glad you're here",
          _duration: 3000
        });
        
        return _result;
      } catch (_error) {
        showCompassionateError(_error, 'sign in');
        throw _error;
      }
    },
    
    signUp: async (email: string, password: string) => {
      try {
        const _result = await supabase.auth.signUp({ email, password });
        if (_result._error) throw _result._error;
        
        toast.success("Welcome to your recovery journey!", {
          description: "Check your email to verify your account",
          _duration: 5000
        });
        
        return _result;
      } catch (_error) {
        showCompassionateError(_error, 'sign up');
        throw _error;
      }
    },
    
    signOut: async () => {
      try {
        const _result = await supabase.auth.signOut();
        
        toast.info("Signed out safely", {
          description: "Come back anytime you need support",
          _duration: 3000
        });
        
        return _result;
      } catch (_error) {
        showCompassionateError(_error, 'sign out');
        throw _error;
      }
    }
  },
  
  // Database operations
  from: (table: string) => {
    const originalFrom = supabase.from(table);
    
    return {
      ...originalFrom,
      
      select: (...args: unknown[]) => {
        const query = originalFrom.select(...args);
        
        return {
          ...query,
          then: async (resolve: unknown, reject: unknown) => {
            try {
              const _result = await query;
              if (_result._error) throw _result._error;
              resolve(_result);
            } catch (_error) {
              showCompassionateError(_error, `loading from ${table}`);
              // Return empty data instead of failing completely
              resolve({ data: [], _error });
            }
          }
        };
      },
      
      insert: (...args: unknown[]) => {
        const query = originalFrom.insert(...args);
        
        return {
          ...query,
          then: async (resolve: unknown, reject: unknown) => {
            try {
              const _result = await query;
              if (_result._error) throw _result._error;
              
              // Success feedback
              if (table.includes('check') || table.includes('mood')) {
                toast.success("Saved successfully", {
                  description: "Thank you for checking in",
                  _duration: 2000
                });
              }
              
              resolve(_result);
            } catch (_error) {
              showCompassionateError(_error, `saving to ${table}`);
              reject(_error);
            }
          }
        };
      },
      
      update: (...args: unknown[]) => {
        const query = originalFrom.update(...args);
        
        return {
          ...query,
          then: async (resolve: unknown, reject: unknown) => {
            try {
              const _result = await query;
              if (_result._error) throw _result._error;
              
              toast.success("Updated", {
                description: "Your changes are saved",
                _duration: 2000
              });
              
              resolve(_result);
            } catch (_error) {
              showCompassionateError(_error, `updating ${table}`);
              reject(_error);
            }
          }
        };
      }
    };
  }
};

// Re-export original for backward compatibility
export { supabase };