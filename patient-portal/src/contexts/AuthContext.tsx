import React, {createContext, useContext, useReducer, useEffect, ReactNode} from 'react';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient, SupabaseClient, User, Session} from '@supabase/supabase-js';

import {BiometricService} from '@services/biometric';
import {SecurityService} from '@services/security';
import {OfflineService} from '@services/offline';
import {AuditLogger} from '@services/audit';

// Environment variables (replace with your Supabase credentials)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber?: string;
  emergencyContacts: EmergencyContact[];
  preferences: UserPreferences;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  priority: number;
  isActive: boolean;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notificationsEnabled: boolean;
  biometricsEnabled: boolean;
  voiceCommandsEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  accessibilityFeatures: {
    largeText: boolean;
    highContrast: boolean;
    screenReader: boolean;
    voiceOver: boolean;
  };
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstTime: boolean;
  biometricEnabled: boolean;
  sessionTimeout: number | null;
  lastActivity: number;
}

type AuthAction =
  | {type: 'SET_LOADING'; payload: boolean}
  | {type: 'SET_USER'; payload: {user: User | null; profile: UserProfile | null; session: Session | null}}
  | {type: 'SET_BIOMETRIC'; payload: boolean}
  | {type: 'SET_FIRST_TIME'; payload: boolean}
  | {type: 'UPDATE_PROFILE'; payload: UserProfile}
  | {type: 'SET_SESSION_TIMEOUT'; payload: number | null}
  | {type: 'UPDATE_ACTIVITY'; payload: number}
  | {type: 'LOGOUT'};

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  isFirstTime: false,
  biometricEnabled: false,
  sessionTimeout: null,
  lastActivity: Date.now(),
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {...state, isLoading: action.payload};
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        profile: action.payload.profile,
        session: action.payload.session,
        isAuthenticated: !!action.payload.user,
        isLoading: false,
        lastActivity: Date.now(),
      };
    case 'SET_BIOMETRIC':
      return {...state, biometricEnabled: action.payload};
    case 'SET_FIRST_TIME':
      return {...state, isFirstTime: action.payload};
    case 'UPDATE_PROFILE':
      return {...state, profile: action.payload};
    case 'SET_SESSION_TIMEOUT':
      return {...state, sessionTimeout: action.payload};
    case 'UPDATE_ACTIVITY':
      return {...state, lastActivity: action.payload};
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    default:
      return state;
  }
};

interface AuthContextType {
  ...AuthState;
  supabase: SupabaseClient;
  signIn: (email: string, password: string) => Promise<{success: boolean; error?: string}>;
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{success: boolean; error?: string}>;
  signOut: () => Promise<void>;
  enableBiometrics: () => Promise<{success: boolean; error?: string}>;
  authenticateWithBiometrics: () => Promise<{success: boolean; error?: string}>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{success: boolean; error?: string}>;
  resetPassword: (email: string) => Promise<{success: boolean; error?: string}>;
  updatePassword: (newPassword: string) => Promise<{success: boolean; error?: string}>;
  refreshSession: () => Promise<void>;
  checkSessionTimeout: () => boolean;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    initializeAuth();
    
    // Set up auth state listener
    const {data: {subscription}} = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await handleAuthStateChange(session.user, session);
        AuditLogger.logUserAction('login', {userId: session.user.id, method: 'password'});
      } else if (event === 'SIGNED_OUT') {
        dispatch({type: 'LOGOUT'});
        await AsyncStorage.multiRemove(['user_profile', 'biometric_enabled']);
        AuditLogger.logUserAction('logout', {userId: state.user?.id});
      } else if (event === 'TOKEN_REFRESHED' && session) {
        dispatch({type: 'SET_USER', payload: {user: session.user, profile: state.profile, session}});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Check session timeout every minute
    const interval = setInterval(() => {
      if (state.isAuthenticated && checkSessionTimeout()) {
        Alert.alert(
          'Session Expired',
          'Your session has expired for security reasons. Please sign in again.',
          [{text: 'OK', onPress: signOut}]
        );
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.lastActivity]);

  const initializeAuth = async () => {
    try {
      dispatch({type: 'SET_LOADING', payload: true});
      
      // Check for existing session
      const {data: {session}} = await supabase.auth.getSession();
      
      if (session?.user) {
        await handleAuthStateChange(session.user, session);
      } else {
        // Check if first time user
        const firstTime = await AsyncStorage.getItem('first_time');
        dispatch({type: 'SET_FIRST_TIME', payload: !firstTime});
      }
      
      // Check biometric setting
      const biometricEnabled = await AsyncStorage.getItem('biometric_enabled');
      dispatch({type: 'SET_BIOMETRIC', payload: biometricEnabled === 'true'});
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      AuditLogger.logError('auth_init_error', error);
    } finally {
      dispatch({type: 'SET_LOADING', payload: false});
    }
  };

  const handleAuthStateChange = async (user: User, session: Session) => {
    try {
      // Fetch user profile
      const {data: profile, error} = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        // Create default profile if doesn't exist
        await createDefaultProfile(user);
        return;
      }

      dispatch({type: 'SET_USER', payload: {user, profile, session}});
      
      // Cache profile offline
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      await OfflineService.cacheUserData(user.id, profile);
      
      // Set session timeout (15 minutes for PHI access)
      const timeout = Date.now() + (15 * 60 * 1000);
      dispatch({type: 'SET_SESSION_TIMEOUT', payload: timeout});
      
    } catch (error) {
      console.error('Auth state change error:', error);
      AuditLogger.logError('auth_state_change_error', error);
    }
  };

  const createDefaultProfile = async (user: User) => {
    try {
      const defaultProfile: Partial<UserProfile> = {
        id: user.id,
        email: user.email!,
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        emergencyContacts: [],
        preferences: {
          theme: 'system',
          language: 'en',
          notificationsEnabled: true,
          biometricsEnabled: false,
          voiceCommandsEnabled: false,
          hapticFeedbackEnabled: true,
          accessibilityFeatures: {
            largeText: false,
            highContrast: false,
            screenReader: false,
            voiceOver: false,
          },
        },
        roles: ['patient'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const {data, error} = await supabase
        .from('profiles')
        .insert([defaultProfile])
        .select()
        .single();

      if (error) throw error;
      
      dispatch({type: 'SET_USER', payload: {user, profile: data, session: state.session}});
    } catch (error) {
      console.error('Create profile error:', error);
      AuditLogger.logError('create_profile_error', error);
    }
  };

  const signIn = async (email: string, password: string): Promise<{success: boolean; error?: string}> => {
    try {
      dispatch({type: 'SET_LOADING', payload: true});

      const {data, error} = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        AuditLogger.logSecurityEvent('failed_login', {email, error: error.message});
        return {success: false, error: error.message};
      }

      // Mark not first time
      await AsyncStorage.setItem('first_time', 'false');
      dispatch({type: 'SET_FIRST_TIME', payload: false});

      return {success: true};
    } catch (error: any) {
      AuditLogger.logError('signin_error', error);
      return {success: false, error: error.message || 'Sign in failed'};
    } finally {
      dispatch({type: 'SET_LOADING', payload: false});
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>): Promise<{success: boolean; error?: string}> => {
    try {
      dispatch({type: 'SET_LOADING', payload: true});

      // Validate password strength
      if (!SecurityService.validatePasswordStrength(password)) {
        return {success: false, error: 'Password does not meet security requirements'};
      }

      const {data, error} = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        AuditLogger.logSecurityEvent('failed_signup', {email, error: error.message});
        return {success: false, error: error.message};
      }

      if (data.user && !data.session) {
        // Email confirmation required
        return {
          success: true,
          error: 'Please check your email for confirmation link',
        };
      }

      return {success: true};
    } catch (error: any) {
      AuditLogger.logError('signup_error', error);
      return {success: false, error: error.message || 'Sign up failed'};
    } finally {
      dispatch({type: 'SET_LOADING', payload: false});
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      dispatch({type: 'SET_LOADING', payload: true});
      
      // Clear sensitive data
      await AsyncStorage.multiRemove(['user_profile', 'session_data']);
      await SecurityService.clearSensitiveData();
      await OfflineService.clearUserData();
      
      const {error} = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }

      dispatch({type: 'LOGOUT'});
    } catch (error) {
      console.error('Sign out error:', error);
      AuditLogger.logError('signout_error', error);
    } finally {
      dispatch({type: 'SET_LOADING', payload: false});
    }
  };

  const enableBiometrics = async (): Promise<{success: boolean; error?: string}> => {
    try {
      const result = await BiometricService.enableBiometrics(state.user?.id!);
      if (result.success) {
        dispatch({type: 'SET_BIOMETRIC', payload: true});
        await AsyncStorage.setItem('biometric_enabled', 'true');
        AuditLogger.logUserAction('enable_biometrics', {userId: state.user?.id});
      }
      return result;
    } catch (error: any) {
      AuditLogger.logError('enable_biometrics_error', error);
      return {success: false, error: error.message};
    }
  };

  const authenticateWithBiometrics = async (): Promise<{success: boolean; error?: string}> => {
    try {
      const result = await BiometricService.authenticate();
      if (result.success && state.user) {
        // Refresh session
        await refreshSession();
        AuditLogger.logUserAction('biometric_login', {userId: state.user.id});
        extendSession();
      }
      return result;
    } catch (error: any) {
      AuditLogger.logSecurityEvent('biometric_auth_failed', {userId: state.user?.id, error: error.message});
      return {success: false, error: error.message};
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{success: boolean; error?: string}> => {
    try {
      if (!state.user) return {success: false, error: 'Not authenticated'};

      const {data, error} = await supabase
        .from('profiles')
        .update({...updates, updatedAt: new Date().toISOString()})
        .eq('id', state.user.id)
        .select()
        .single();

      if (error) {
        return {success: false, error: error.message};
      }

      dispatch({type: 'UPDATE_PROFILE', payload: data});
      await AsyncStorage.setItem('user_profile', JSON.stringify(data));
      AuditLogger.logUserAction('update_profile', {userId: state.user.id});

      return {success: true};
    } catch (error: any) {
      AuditLogger.logError('update_profile_error', error);
      return {success: false, error: error.message};
    }
  };

  const resetPassword = async (email: string): Promise<{success: boolean; error?: string}> => {
    try {
      const {error} = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim());
      
      if (error) {
        return {success: false, error: error.message};
      }

      AuditLogger.logSecurityEvent('password_reset_requested', {email});
      return {success: true};
    } catch (error: any) {
      AuditLogger.logError('reset_password_error', error);
      return {success: false, error: error.message};
    }
  };

  const updatePassword = async (newPassword: string): Promise<{success: boolean; error?: string}> => {
    try {
      if (!SecurityService.validatePasswordStrength(newPassword)) {
        return {success: false, error: 'Password does not meet security requirements'};
      }

      const {error} = await supabase.auth.updateUser({password: newPassword});
      
      if (error) {
        return {success: false, error: error.message};
      }

      AuditLogger.logSecurityEvent('password_changed', {userId: state.user?.id});
      return {success: true};
    } catch (error: any) {
      AuditLogger.logError('update_password_error', error);
      return {success: false, error: error.message};
    }
  };

  const refreshSession = async (): Promise<void> => {
    try {
      const {data: {session}} = await supabase.auth.refreshSession();
      if (session) {
        dispatch({type: 'SET_USER', payload: {user: session.user, profile: state.profile, session}});
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      AuditLogger.logError('session_refresh_error', error);
    }
  };

  const checkSessionTimeout = (): boolean => {
    if (!state.sessionTimeout) return false;
    return Date.now() > state.sessionTimeout;
  };

  const extendSession = (): void => {
    const newTimeout = Date.now() + (15 * 60 * 1000); // 15 minutes
    dispatch({type: 'SET_SESSION_TIMEOUT', payload: newTimeout});
    dispatch({type: 'UPDATE_ACTIVITY', payload: Date.now()});
  };

  const contextValue: AuthContextType = {
    ...state,
    supabase,
    signIn,
    signUp,
    signOut,
    enableBiometrics,
    authenticateWithBiometrics,
    updateProfile,
    resetPassword,
    updatePassword,
    refreshSession,
    checkSessionTimeout,
    extendSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};