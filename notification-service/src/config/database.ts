import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

let supabaseClient: any = null;

export const initializeSupabase = () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration');
      return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    logger.info('Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    return null;
  }
};

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    return initializeSupabase();
  }
  return supabaseClient;
};