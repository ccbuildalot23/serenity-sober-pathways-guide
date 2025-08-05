# Supabase Integration Agent

## Overview
This agent specializes in integrating Supabase with React applications, focusing on real-time features, Row-Level Security (RLS), and HIPAA-compliant data management for healthcare applications.

## Authentication Management

### Setup and Configuration
```typescript
// Enhanced Supabase client with error handling
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => {
        // Custom secure storage for healthcare data
        return secureStorage.getItem(key);
      },
      setItem: (key, value) => {
        return secureStorage.setItem(key, value);
      },
      removeItem: (key) => {
        return secureStorage.removeItem(key);
      }
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

### User Authentication Flow
```typescript
// Secure sign-up with role assignment
async function signUpWithRole(email: string, password: string, userType: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        userType, // 'patient', 'support_member', 'provider'
        full_name: fullName,
        recovery_start_date: recoveryDate
      }
    }
  });
  
  if (error) throw error;
  
  // Trigger will automatically assign role based on userType
  return data;
}

// Session management
async function getSecureSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  
  // Verify session is valid and not expired
  if (session?.expires_at && new Date(session.expires_at * 1000) < new Date()) {
    await supabase.auth.signOut();
    return null;
  }
  
  return session;
}
```

## Row-Level Security (RLS)

### Policy Templates
```sql
-- Patient can only see their own data
CREATE POLICY "Users can view own data"
ON public.health_records
FOR SELECT
USING (auth.uid() = user_id);

-- Support members can view data shared with them
CREATE POLICY "Support members can view shared data"
ON public.health_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_relationships
    WHERE support_relationships.patient_id = health_records.user_id
    AND support_relationships.support_member_id = auth.uid()
    AND support_relationships.status = 'active'
  )
);

-- Providers can view patient data with consent
CREATE POLICY "Providers can view consented data"
ON public.health_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.provider_patient_relationships
    WHERE provider_patient_relationships.patient_id = health_records.user_id
    AND provider_patient_relationships.provider_id = auth.uid()
    AND provider_patient_relationships.consent_given = true
  )
);
```

### TypeScript Integration
```typescript
// Type-safe database queries with RLS
interface HealthRecord {
  id: string;
  user_id: string;
  data_encrypted: string;
  created_at: string;
}

async function getMyHealthRecords(): Promise<HealthRecord[]> {
  const { data, error } = await supabase
    .from('health_records')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch health records:', error);
    throw new Error('Unable to retrieve health records');
  }
  
  // RLS automatically filters to only user's records
  return data || [];
}
```

## Real-time Subscriptions

### Enhanced Real-time Service
```typescript
class EnhancedRealtimeService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  
  subscribeToChannel(
    channel: string,
    events: {
      onInsert?: (payload: any) => void;
      onUpdate?: (payload: any) => void;
      onDelete?: (payload: any) => void;
    }
  ) {
    // Prevent duplicate subscriptions
    if (this.subscriptions.has(channel)) {
      console.warn(`Already subscribed to ${channel}`);
      return;
    }
    
    const subscription = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: channel },
        (payload) => events.onInsert?.(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: channel },
        (payload) => events.onUpdate?.(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: channel },
        (payload) => events.onDelete?.(payload.old)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to ${channel}`);
        }
      });
    
    this.subscriptions.set(channel, subscription);
  }
  
  unsubscribe(channel: string) {
    const subscription = this.subscriptions.get(channel);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.subscriptions.delete(channel);
    }
  }
  
  unsubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      supabase.removeChannel(subscription);
    });
    this.subscriptions.clear();
  }
}
```

### Presence and Broadcast
```typescript
// Real-time presence for peer support
function usePeerPresence(roomId: string) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(Object.keys(state));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: supabase.auth.user()?.id,
            online_at: new Date().toISOString()
          });
        }
      });
    
    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [roomId]);
  
  return onlineUsers;
}
```

## Edge Functions

### Secure Edge Function Calls
```typescript
// Call edge functions with proper error handling
async function callEdgeFunction<T>(
  functionName: string,
  payload: any
): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers: {
        'x-request-id': crypto.randomUUID() // Track requests
      }
    });
    
    if (error) {
      console.error(`Edge function ${functionName} error:`, error);
      throw error;
    }
    
    return data as T;
  } catch (error) {
    // Log to audit service
    await auditService.logError({
      function: functionName,
      error: error.message,
      timestamp: new Date()
    });
    throw error;
  }
}

// Example: Send crisis alert
async function sendCrisisAlert(userId: string, severity: string) {
  return callEdgeFunction('crisis-alert-system', {
    userId,
    severity,
    timestamp: new Date().toISOString(),
    location: await getCurrentLocation()
  });
}
```

## Storage Management

### Secure File Upload
```typescript
// Upload encrypted files with validation
async function uploadSecureFile(
  file: File,
  bucket: string,
  path: string
): Promise<string> {
  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  // Encrypt file before upload
  const encryptedFile = await encryptFile(file);
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, encryptedFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });
  
  if (error) {
    console.error('Upload error:', error);
    throw error;
  }
  
  // Get signed URL for secure access
  const { data: urlData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour expiry
  
  return urlData?.signedUrl || '';
}
```

## Database Migrations

### Migration Best Practices
```sql
-- Always use IF NOT EXISTS for idempotent migrations
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value JSONB NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id 
ON public.health_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_at 
ON public.health_metrics(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

-- Add audit trigger
CREATE TRIGGER audit_health_metrics
  AFTER INSERT OR UPDATE OR DELETE ON public.health_metrics
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

## Performance Optimization

### Connection Pooling
```typescript
// Implement connection pooling for better performance
class SupabasePool {
  private pool: Supabase[] = [];
  private currentIndex = 0;
  private maxConnections = 3;
  
  constructor() {
    for (let i = 0; i < this.maxConnections; i++) {
      this.pool.push(createClient(supabaseUrl, supabaseAnonKey));
    }
  }
  
  getClient(): Supabase {
    const client = this.pool[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.maxConnections;
    return client;
  }
}
```

### Query Optimization
```typescript
// Optimize queries with proper selections and limits
async function getOptimizedData() {
  const { data, error } = await supabase
    .from('large_table')
    .select('id, name, status') // Select only needed columns
    .eq('status', 'active')
    .range(0, 99) // Limit results
    .order('created_at', { ascending: false });
  
  return data;
}

// Use RPC for complex queries
async function getComplexAnalytics(userId: string) {
  const { data, error } = await supabase
    .rpc('calculate_user_analytics', {
      user_id: userId,
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    });
  
  return data;
}
```

## Error Handling

### Comprehensive Error Management
```typescript
class SupabaseErrorHandler {
  static handle(error: any, context: string) {
    console.error(`Supabase error in ${context}:`, error);
    
    // Check for specific error types
    if (error.code === 'PGRST301') {
      // JWT expired
      supabase.auth.signOut();
      window.location.href = '/login';
      return;
    }
    
    if (error.code === '23505') {
      // Unique constraint violation
      toast.error('This record already exists');
      return;
    }
    
    if (error.code === '42501') {
      // Insufficient privilege
      toast.error('You do not have permission to perform this action');
      return;
    }
    
    // Generic error
    toast.error('An unexpected error occurred. Please try again.');
  }
}
```