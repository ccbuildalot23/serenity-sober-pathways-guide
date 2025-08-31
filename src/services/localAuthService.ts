/**
 * Local Authentication Service for Development/Testing
 * Connects to local PostgreSQL instead of Supabase
 */

// Remove imports that don't exist in browser
// We'll use simple implementations instead

// Local PostgreSQL connection
const LOCAL_DB_URL = process.env.DATABASE_URL || 'postgresql://serenity_user:serenity_password@localhost:5432/serenity';
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-12345';

// Test user credentials
const TEST_USERS = {
  'test-patient@serenity.com': {
    id: '11111111-1111-1111-1111-111111111111',
    password: 'TestPass123',
    role: 'patient',
    name: 'Test Patient'
  },
  'test-provider@serenity.com': {
    id: '22222222-2222-2222-2222-222222222222',
    password: 'TestPass123',
    role: 'provider',
    name: 'Test Provider'
  },
  'test-supporter@serenity.com': {
    id: '33333333-3333-3333-3333-333333333333',
    password: 'TestPass123',
    role: 'supporter',
    name: 'Test Supporter'
  }
};

export class LocalAuthService {
  private static instance: LocalAuthService;
  
  private constructor() {}
  
  static getInstance(): LocalAuthService {
    if (!LocalAuthService.instance) {
      LocalAuthService.instance = new LocalAuthService();
    }
    return LocalAuthService.instance;
  }
  
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    const testUser = TEST_USERS[email];
    
    if (!testUser || password !== testUser.password) {
      return {
        data: null,
        error: { message: 'Invalid credentials' }
      };
    }
    
    // Create simple token (not real JWT for local dev)
    const token = btoa(JSON.stringify({
      sub: testUser.id,
      email,
      role: testUser.role,
      name: testUser.name,
      exp: Date.now() + 86400000 // 24 hours
    }));
    
    // Create session
    const session = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 86400,
      refresh_token: `refresh_${token}`,
      user: {
        id: testUser.id,
        email,
        user_metadata: {
          full_name: testUser.name,
          userType: testUser.role
        },
        app_metadata: {
          provider: 'email',
          providers: ['email']
        },
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
    
    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      localStorage.setItem('sb-tqyiqstpvwztvofrxpuf-auth-token', JSON.stringify(session));
    }
    
    return {
      data: {
        user: session.user,
        session
      },
      error: null
    };
  }
  
  /**
   * Sign out
   */
  async signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-tqyiqstpvwztvofrxpuf-auth-token');
    }
    
    return { error: null };
  }
  
  /**
   * Get current session
   */
  async getSession() {
    if (typeof window === 'undefined') {
      return { data: { session: null }, error: null };
    }
    
    const storedSession = localStorage.getItem('supabase.auth.token');
    if (!storedSession) {
      return { data: { session: null }, error: null };
    }
    
    try {
      const session = JSON.parse(storedSession);
      
      // Verify token expiry
      const tokenData = JSON.parse(atob(session.access_token));
      if (tokenData.exp < Date.now()) {
        throw new Error('Token expired');
      }
      
      return { data: { session }, error: null };
    } catch (error) {
      // Token expired or invalid
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-tqyiqstpvwztvofrxpuf-auth-token');
      return { data: { session: null }, error: null };
    }
  }
  
  /**
   * Get current user
   */
  async getUser() {
    const { data: { session } } = await this.getSession();
    
    if (!session) {
      return { data: { user: null }, error: null };
    }
    
    return { data: { user: session.user }, error: null };
  }
  
  /**
   * Reset password (mock)
   */
  async resetPasswordForEmail(email: string) {
    // Mock implementation - just log for now
    console.log('Password reset requested for:', email);
    return { data: {}, error: null };
  }
  
  /**
   * Update user (mock)
   */
  async updateUser(attributes: any) {
    const { data: { session } } = await this.getSession();
    
    if (!session) {
      return { data: null, error: { message: 'Not authenticated' } };
    }
    
    // Update session with new attributes
    session.user = {
      ...session.user,
      ...attributes
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      localStorage.setItem('sb-tqyiqstpvwztvofrxpuf-auth-token', JSON.stringify(session));
    }
    
    return { data: { user: session.user }, error: null };
  }
}

// Export singleton instance
export const localAuth = LocalAuthService.getInstance();