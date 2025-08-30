#!/usr/bin/env node

/**
 * Mock Authentication for Local Testing
 * Creates local test users without Supabase dependency
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Mock user database
const mockUsers = [
  {
    id: crypto.randomUUID(),
    email: 'test-patient@serenity.com',
    password: 'TestSerenity2024!@#',
    role: 'patient',
    profile: {
      full_name: 'Test Patient',
      phone_number: '+15551234567',
      bio: 'Test patient account for E2E testing'
    }
  },
  {
    id: crypto.randomUUID(),
    email: 'test-provider@serenity.com',
    password: 'TestSerenity2024!@#',
    role: 'provider',
    profile: {
      full_name: 'Test Provider', 
      phone_number: '+15551234568',
      bio: 'Test provider account for E2E testing'
    }
  },
  {
    id: crypto.randomUUID(),
    email: 'test-supporter@serenity.com',
    password: 'TestSerenity2024!@#',
    role: 'supporter',
    profile: {
      full_name: 'Test Supporter',
      phone_number: '+15551234569',
      bio: 'Test supporter account for E2E testing'
    }
  }
];

// Create mock auth service
class MockAuthService {
  constructor() {
    this.users = mockUsers;
    this.sessions = new Map();
  }

  async signIn(email, password) {
    const user = this.users.find(u => u.email === email && u.password === password);
    if (!user) {
      return { error: 'Invalid credentials' };
    }
    
    const sessionToken = crypto.randomUUID();
    const session = {
      access_token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: {
          full_name: user.profile.full_name
        }
      }
    };
    
    this.sessions.set(sessionToken, session);
    return { data: { user: session.user, session } };
  }

  async signOut(sessionToken) {
    this.sessions.delete(sessionToken);
    return { data: null };
  }

  async getSession(sessionToken) {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      return { data: { session: null } };
    }
    return { data: { session } };
  }

  async getUser(sessionToken) {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      return { data: { user: null } };
    }
    return { data: { user: session.user } };
  }
}

// Export mock service
const mockAuthService = new MockAuthService();

// Save to file for tests to use
const mockAuthPath = path.join(__dirname, '../tests/mocks/mock-auth.json');
fs.mkdirSync(path.dirname(mockAuthPath), { recursive: true });
fs.writeFileSync(mockAuthPath, JSON.stringify({
  users: mockUsers,
  service: 'MockAuthService',
  active: true
}, null, 2));

console.log('🎭 Mock Authentication Service Created');
console.log('=' .repeat(60));
console.log('📦 Mock users created:');
mockUsers.forEach(user => {
  console.log(`  ✅ ${user.email} (${user.role})`);
  console.log(`     Password: ${user.password}`);
});
console.log('=' .repeat(60));
console.log('📄 Mock auth config saved to: tests/mocks/mock-auth.json');
console.log('');
console.log('🧪 To use in tests:');
console.log('  1. Import mock-auth.json');
console.log('  2. Use credentials above for login');
console.log('  3. Tests will bypass Supabase and use local auth');

// Test the mock auth
console.log('\n🧪 Testing mock authentication...');
(async () => {
  for (const user of mockUsers) {
    const result = await mockAuthService.signIn(user.email, user.password);
    if (result.data) {
      console.log(`  ✅ ${user.email}: Login successful`);
    } else {
      console.log(`  ❌ ${user.email}: Login failed - ${result.error}`);
    }
  }
})();

module.exports = { mockAuthService, mockUsers };