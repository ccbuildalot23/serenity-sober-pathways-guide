import { createClient } from '@supabase/supabase-js';

// Get the environment variables or use defaults
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://tqyiqstpvwztvofrxpuf.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8";

console.log('🔧 Supabase Configuration:');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuth() {
  console.log('\n📡 Checking Supabase connection...');
  
  // Test database connection
  try {
    const { data, error } = await supabase.from('user_roles').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Database connection successful');
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
  }

  // Check current session
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log('\n🔐 Current session:', session ? `Active (${session.user.email})` : 'None');
  } catch (error: any) {
    console.error('❌ Session check failed:', error.message);
  }

  // Try to sign in with test user
  console.log('\n🧪 Testing sign in with test-recovery@example.com...');
  try {
    const testPassword = 'TestSecure#2024!Recovery';
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test-recovery@example.com',
      password: testPassword
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
      
      // If user doesn't exist, try to create it
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n📝 User not found. Creating test user...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'test-recovery@example.com',
          password: testPassword,
          options: {
            data: {
              userType: 'recovery'
            }
          }
        });
        
        if (signUpError) {
          console.error('❌ Sign up failed:', signUpError.message);
        } else {
          console.log('✅ Test user created successfully');
          console.log('📧 Note: Email confirmation may be required');
        }
      }
    } else {
      console.log('✅ Sign in successful!');
      console.log('User:', data.user?.email);
      console.log('Session:', !!data.session);
      
      // Sign out
      await supabase.auth.signOut();
      console.log('✅ Signed out successfully');
    }
  } catch (error: any) {
    console.error('❌ Authentication test failed:', error.message);
  }
}

checkAuth().then(() => {
  console.log('\n✨ Auth check completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Auth check failed:', error);
  process.exit(1);
});