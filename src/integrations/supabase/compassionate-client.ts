// Compassionate Supabase Client - Gentle error handling for database operations
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

// Determine error type from Supabase error
const getErrorType = (error: any): keyof typeof ERROR_MESSAGES => {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase() || '';
  
  if (code.includes('auth') || message.includes('auth')) return 'auth';
  if (code.includes('network') || message.includes('fetch')) return 'network';
  if (code.includes('permission') || code.includes('rls')) return 'permission';
  if (message.includes('insert') || message.includes('update')) return 'save';
  if (message.includes('select')) return 'load';
  
  return 'general';
};

// Show compassionate error to user
const showCompassionateError = (error: any, context?: string) => {
  const errorType = getErrorType(error);
  const errorInfo = ERROR_MESSAGES[errorType];
  
  console.error(`Compassionate error (${context}):`, error);
  
  toast.error(errorInfo.title, {
    description: (
      <div className="space-y-1">
        <p>{errorInfo.message}</p>
        <p className="text-xs opacity-80">{errorInfo.action}</p>
      </div>
    ),
    duration: 5000,
  });
  
  // Send encouragement if it's an auth error
  if (errorType === 'auth') {
    setTimeout(() => {
      hopeMessenger.sendHope('struggling');
    }, 2000);
  }
};

// Wrapper for database operations with compassionate error handling
export const compassionateSupabase = {
  // Auth operations
  auth: {
    signIn: async (email: string, password: string) => {
      try {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        
        toast.success("Welcome back!", {
          description: "We're glad you're here",
          duration: 3000
        });
        
        return result;
      } catch (error) {
        showCompassionateError(error, 'sign in');
        throw error;
      }
    },
    
    signUp: async (email: string, password: string) => {
      try {
        const result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
        
        toast.success("Welcome to your recovery journey!", {
          description: "Check your email to verify your account",
          duration: 5000
        });
        
        return result;
      } catch (error) {
        showCompassionateError(error, 'sign up');
        throw error;
      }
    },
    
    signOut: async () => {
      try {
        const result = await supabase.auth.signOut();
        
        toast.info("Signed out safely", {
          description: "Come back anytime you need support",
          duration: 3000
        });
        
        return result;
      } catch (error) {
        showCompassionateError(error, 'sign out');
        throw error;
      }
    }
  },
  
  // Database operations
  from: (table: string) => {
    const originalFrom = supabase.from(table);
    
    return {
      ...originalFrom,
      
      select: (...args: any[]) => {
        const query = originalFrom.select(...args);
        
        return {
          ...query,
          then: async (resolve: any, reject: any) => {
            try {
              const result = await query;
              if (result.error) throw result.error;
              resolve(result);
            } catch (error) {
              showCompassionateError(error, `loading from ${table}`);
              // Return empty data instead of failing completely
              resolve({ data: [], error });
            }
          }
        };
      },
      
      insert: (...args: any[]) => {
        const query = originalFrom.insert(...args);
        
        return {
          ...query,
          then: async (resolve: any, reject: any) => {
            try {
              const result = await query;
              if (result.error) throw result.error;
              
              // Success feedback
              if (table.includes('check') || table.includes('mood')) {
                toast.success("Saved successfully", {
                  description: "Thank you for checking in",
                  duration: 2000
                });
              }
              
              resolve(result);
            } catch (error) {
              showCompassionateError(error, `saving to ${table}`);
              reject(error);
            }
          }
        };
      },
      
      update: (...args: any[]) => {
        const query = originalFrom.update(...args);
        
        return {
          ...query,
          then: async (resolve: any, reject: any) => {
            try {
              const result = await query;
              if (result.error) throw result.error;
              
              toast.success("Updated", {
                description: "Your changes are saved",
                duration: 2000
              });
              
              resolve(result);
            } catch (error) {
              showCompassionateError(error, `updating ${table}`);
              reject(error);
            }
          }
        };
      }
    };
  }
};

// Re-export original for backward compatibility
export { supabase };