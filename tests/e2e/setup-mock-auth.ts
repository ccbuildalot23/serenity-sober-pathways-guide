import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const mockUsers = [
  {
    email: 'test-patient@serenity.com',
    password: 'TestPass123',
    role: 'patient',
    token: 'mock-patient-token'
  },
  {
    email: 'test-provider@serenity.com',
    password: 'TestPass123',
    role: 'provider',
    token: 'mock-provider-token'
  },
  {
    email: 'test-supporter@serenity.com',
    password: 'TestPass123',
    role: 'supporter',
    token: 'mock-supporter-token'
  }
];

setup('authenticate', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:8080');
  
  // Inject mock auth into localStorage
  await page.evaluate((users) => {
    // Mock Supabase auth session
    const mockSession = {
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: users[0].email,
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {
          provider: 'email',
          providers: ['email']
        },
        user_metadata: {
          full_name: 'Test Patient'
        },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
    
    // Store in localStorage like Supabase does
    localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
    localStorage.setItem('sb-tqyiqstpvwztvofrxpuf-auth-token', JSON.stringify(mockSession));
    
    // Store mock users for testing
    localStorage.setItem('mock-users', JSON.stringify(users));
  }, mockUsers);
  
  // Save storage state
  await page.context().storageState({ path: 'tests/mocks/auth-state.json' });
});

export { mockUsers };