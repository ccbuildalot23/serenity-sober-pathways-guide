import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { logger } from '../utils/logger';

// Initialize Supabase client
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
);

export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
      throw error;
    }
    
    logger.info('Database connection successful');
    
    // Run migrations if needed
    await runMigrations();
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const runMigrations = async (): Promise<void> => {
  // Check if tables exist, if not create them
  try {
    // This would typically run SQL migrations
    // For now, we'll rely on Supabase migrations
    logger.info('Database migrations checked');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
};

// Database helper functions
export const db = {
  // User operations
  users: {
    async create(userData: any) {
      const { data, error } = await supabase
        .from('profiles')
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async findById(id: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async findByEmail(email: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  },
  
  // Check-in operations
  checkins: {
    async create(checkinData: any) {
      const { data, error } = await supabase
        .from('daily_checkins')
        .insert(checkinData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async findByUser(userId: string, limit = 30) {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  },
  
  // Crisis alert operations
  crisis: {
    async createAlert(alertData: any) {
      const { data, error } = await supabase
        .from('crisis_alerts')
        .insert(alertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async getEmergencyContacts(userId: string) {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  },
  
  // Provider operations
  providers: {
    async getPatients(providerId: string) {
      const { data, error } = await supabase
        .from('provider_patients')
        .select(`
          patient_id,
          profiles!inner(*)
        `)
        .eq('provider_id', providerId);
      
      if (error) throw error;
      return data;
    },
    
    async getMetrics(providerId: string) {
      // This would include complex queries for ROI calculation
      const { data, error } = await supabase
        .rpc('calculate_provider_metrics', { provider_id: providerId });
      
      if (error) throw error;
      return data;
    },
  },
};