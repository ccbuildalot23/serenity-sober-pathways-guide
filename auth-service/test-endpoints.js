#!/usr/bin/env node

/**
 * Simple test script to verify authentication service endpoints
 * Run with: node test-endpoints.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  email: 'test@serenity.com',
  password: 'TestPass123!',
  fullName: 'Test User',
  phoneNumber: '+1234567890',
  role: 'patient'
};

let accessToken = '';

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`\n${config.method || 'GET'} ${endpoint}`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    return { error };
  }
}

async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  return await makeRequest('/health');
}

async function testRegistration() {
  console.log('\n=== Testing User Registration ===');
  return await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser)
  });
}

async function testLogin() {
  console.log('\n=== Testing User Login ===');
  const result = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });
  
  if (result.data && result.data.accessToken) {
    accessToken = result.data.accessToken;
    console.log('✅ Access token received and stored');
  }
  
  return result;
}

async function testProfile() {
  console.log('\n=== Testing Get Profile (Authenticated) ===');
  if (!accessToken) {
    console.log('❌ No access token available, skipping profile test');
    return;
  }
  
  return await makeRequest('/auth/profile');
}

async function testMFASetup() {
  console.log('\n=== Testing MFA Setup (Authenticated) ===');
  if (!accessToken) {
    console.log('❌ No access token available, skipping MFA test');
    return;
  }
  
  return await makeRequest('/auth/mfa/setup', {
    method: 'POST'
  });
}

async function testPasswordReset() {
  console.log('\n=== Testing Password Reset Request ===');
  return await makeRequest('/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email
    })
  });
}

async function testInvalidEndpoint() {
  console.log('\n=== Testing Invalid Endpoint (404) ===');
  return await makeRequest('/auth/nonexistent', {
    method: 'POST'
  });
}

async function runTests() {
  console.log('🔐 Serenity Auth Service - Endpoint Tests');
  console.log('==========================================');
  
  try {
    // Basic health check
    await testHealthCheck();
    
    // Registration (might fail if user exists)
    await testRegistration();
    
    // Login
    await testLogin();
    
    // Authenticated endpoints
    await testProfile();
    await testMFASetup();
    
    // Public endpoints
    await testPasswordReset();
    
    // Error handling
    await testInvalidEndpoint();
    
    console.log('\n=== Test Summary ===');
    console.log('✅ All tests completed');
    console.log('📋 Check the responses above for any errors');
    console.log('🔍 Review logs/combined.log for detailed logging');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Check if service is running
async function checkService() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ Auth service is running');
      return true;
    } else {
      console.log('❌ Auth service returned error status');
      return false;
    }
  } catch (error) {
    console.log('❌ Auth service is not running');
    console.log('Please start the service with: npm start or npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  const isServiceRunning = await checkService();
  
  if (isServiceRunning) {
    await runTests();
  } else {
    console.log('\n🚀 To start the service:');
    console.log('1. Copy .env.example to .env and configure');
    console.log('2. Run: npm install');
    console.log('3. Run: npm run dev');
    console.log('4. Then run this test again: node test-endpoints.js');
  }
}

main().catch(console.error);