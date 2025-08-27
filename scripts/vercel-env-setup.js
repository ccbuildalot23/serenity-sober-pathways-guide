#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * Ensures all required environment variables are configured for production deployment
 */

const fs = require('fs');
const path = require('path');

const requiredEnvVars = {
  // Core Supabase Configuration (REQUIRED)
  VITE_SUPABASE_URL: {
    description: 'Supabase project URL',
    example: 'https://tqyiqstpvwztvofrxpuf.supabase.co',
    required: true
  },
  VITE_SUPABASE_ANON_KEY: {
    description: 'Supabase anonymous/public key',
    example: 'eyJhbGc...',
    required: true
  },
  
  // Security Configuration
  VITE_ENCRYPTION_MASTER_KEY: {
    description: 'Master encryption key for PHI data',
    example: '64-character hex string',
    required: true
  },
  
  // Production Settings
  VITE_ENABLE_CONSOLE_LOGGING: {
    description: 'Enable console logging in production',
    example: 'false',
    required: false,
    default: 'false'
  },
  VITE_LOG_LEVEL: {
    description: 'Logging level for production',
    example: 'error',
    required: false,
    default: 'error'
  },
  VITE_ENABLE_PERFORMANCE_LOGGING: {
    description: 'Enable performance metrics logging',
    example: 'false',
    required: false,
    default: 'false'
  },
  
  // Optional Integrations
  VITE_OPENAI_API_KEY: {
    description: 'OpenAI API key for AI features',
    example: 'sk-proj-...',
    required: false
  },
  VITE_DAILY_API_KEY: {
    description: 'Daily.co API key for video calls',
    example: '22187ca0...',
    required: false
  },
  VITE_DAILY_DOMAIN: {
    description: 'Daily.co domain for video rooms',
    example: 'serenityandrecovery.daily.co',
    required: false
  }
};

console.log('🔍 Vercel Environment Variables Configuration Check\n');
console.log('=' .repeat(60));

// Check for .env file
const envPath = path.join(__dirname, '..', '.env');
const envProductionPath = path.join(__dirname, '..', '.env.production');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
}

console.log('\n📋 Required Environment Variables for Vercel:\n');

const missingRequired = [];
const missingOptional = [];

Object.entries(requiredEnvVars).forEach(([key, config]) => {
  const value = process.env[key] || envVars[key];
  const status = value ? '✅' : (config.required ? '❌' : '⚠️');
  
  console.log(`${status} ${key}`);
  console.log(`   ${config.description}`);
  
  if (!value) {
    if (config.required) {
      missingRequired.push(key);
      console.log(`   ➜ Example: ${config.example}`);
    } else {
      missingOptional.push(key);
      if (config.default) {
        console.log(`   ➜ Default: ${config.default}`);
      }
    }
  } else {
    console.log(`   ✓ Configured`);
  }
  console.log();
});

console.log('=' .repeat(60));

if (missingRequired.length > 0) {
  console.log('\n❌ Missing REQUIRED environment variables:');
  missingRequired.forEach(key => {
    console.log(`   - ${key}`);
  });
  console.log('\n📝 To fix this, add these variables in your Vercel dashboard:');
  console.log('   1. Go to https://vercel.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to Settings → Environment Variables');
  console.log('   4. Add each missing variable');
} else {
  console.log('\n✅ All required environment variables are configured!');
}

if (missingOptional.length > 0) {
  console.log('\n⚠️ Optional environment variables not configured:');
  missingOptional.forEach(key => {
    console.log(`   - ${key}`);
  });
}

// Generate .env.vercel template
console.log('\n📄 Generating .env.vercel template...');
const vercelEnvTemplate = Object.entries(requiredEnvVars)
  .filter(([_, config]) => config.required)
  .map(([key, config]) => {
    const value = envVars[key] || `# ${config.example}`;
    return `${key}=${value}`;
  })
  .join('\n');

const templatePath = path.join(__dirname, '..', '.env.vercel');
fs.writeFileSync(templatePath, vercelEnvTemplate);
console.log(`   ✓ Template saved to ${templatePath}`);

console.log('\n🚀 Next Steps:');
console.log('1. Review the missing environment variables above');
console.log('2. Add them to your Vercel project settings');
console.log('3. Trigger a new deployment to apply the changes');
console.log('\nNote: The .env.vercel file contains a template you can reference');

process.exit(missingRequired.length > 0 ? 1 : 0);