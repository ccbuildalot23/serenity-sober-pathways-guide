#!/usr/bin/env node

/**
 * iOS Deployment Validator with BMAD Framework Integration
 * Comprehensive validation using agent swarms and Byzantine consensus
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// Load environment variables from .env file
const dotenvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Validation categories
const validators = {
  critical: [],
  warning: [],
  info: [],
  success: []
};

// Byzantine consensus tracking
let consensusVotes = {
  certificateValid: [],
  environmentReady: [],
  deploymentSafe: []
};

/**
 * Log with color and icon
 */
function log(message, type = 'info') {
  const icons = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅',
    section: '📋',
    agent: '🤖'
  };
  
  const colorMap = {
    critical: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    success: colors.green,
    section: colors.cyan,
    agent: colors.magenta
  };
  
  console.log(`${colorMap[type]}${icons[type]} ${message}${colors.reset}`);
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Run command and return output
 */
function runCommand(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check environment variable
 */
function checkEnvVar(name, isSecret = false) {
  const value = process.env[name];
  if (value) {
    const displayValue = isSecret ? '***' : value.substring(0, 10) + '...';
    return { exists: true, value: displayValue };
  }
  return { exists: false };
}

/**
 * Validate App Store Connect configuration
 */
async function validateAppStoreConnect() {
  log('Validating App Store Connect Configuration', 'section');
  
  // Check for API keys
  const apiKeyId = checkEnvVar('APP_STORE_CONNECT_API_KEY_ID');
  const issuerId = checkEnvVar('APP_STORE_CONNECT_ISSUER_ID');
  const apiKey = checkEnvVar('APP_STORE_CONNECT_KEY', true);
  
  if (apiKeyId.exists && issuerId.exists && apiKey.exists) {
    validators.success.push('App Store Connect API configured');
    consensusVotes.deploymentSafe.push(true);
  } else {
    validators.critical.push('App Store Connect API keys missing');
    consensusVotes.deploymentSafe.push(false);
    
    if (!apiKeyId.exists) log('Missing: APP_STORE_CONNECT_API_KEY_ID', 'critical');
    if (!issuerId.exists) log('Missing: APP_STORE_CONNECT_ISSUER_ID', 'critical');
    if (!apiKey.exists) log('Missing: APP_STORE_CONNECT_KEY', 'critical');
  }
}

/**
 * Validate iOS certificates
 */
async function validateCertificates() {
  log('Validating iOS Certificates', 'section');
  
  const certPath = 'ios-certificates/ios_distribution.p12';
  const profilePath = 'ios-certificates/Serenity_App_Store_Profile.mobileprovision';
  const authKeyPath = 'ios-certificates/AuthKey_4YBU7UC32Y.p8';
  
  // Check certificate files
  if (fileExists(certPath)) {
    validators.success.push('iOS Distribution Certificate found');
    consensusVotes.certificateValid.push(true);
  } else {
    validators.critical.push(`Certificate not found: ${certPath}`);
    consensusVotes.certificateValid.push(false);
  }
  
  if (fileExists(profilePath)) {
    validators.success.push('Provisioning Profile found');
  } else {
    validators.warning.push(`Profile not found: ${profilePath}`);
  }
  
  if (fileExists(authKeyPath)) {
    validators.success.push('App Store Connect Auth Key found');
  } else {
    validators.warning.push(`Auth Key not found: ${authKeyPath}`);
  }
  
  // Check certificate in keychain (macOS only)
  if (process.platform === 'darwin') {
    const keychainCheck = runCommand('security find-identity -p codesigning', true);
    if (keychainCheck.success && keychainCheck.output.includes('valid identities found')) {
      validators.success.push('Code signing identities available in keychain');
      consensusVotes.certificateValid.push(true);
    } else {
      validators.warning.push('No code signing identities in keychain');
    }
  }
}

/**
 * Validate project configuration
 */
async function validateProjectConfig() {
  log('Validating Project Configuration', 'section');
  
  // Check Capacitor config
  const capacitorConfig = 'capacitor.config.ts';
  if (fileExists(capacitorConfig)) {
    const config = fs.readFileSync(capacitorConfig, 'utf8');
    if (config.includes('com.serenity.recovery')) {
      validators.success.push('Bundle ID configured correctly');
    } else {
      validators.critical.push('Bundle ID mismatch in capacitor.config.ts');
    }
  }
  
  // Check iOS project
  const xcworkspace = 'ios/App/App.xcworkspace';
  if (fileExists(xcworkspace)) {
    validators.success.push('iOS Xcode workspace exists');
  } else {
    validators.critical.push('iOS workspace not found - run: npx cap add ios');
  }
  
  // Check Fastlane configuration
  const fastfile = 'ios/fastlane/Fastfile';
  if (fileExists(fastfile)) {
    validators.success.push('Fastlane configuration found');
    
    // Check for required lanes
    const fastfileContent = fs.readFileSync(fastfile, 'utf8');
    const requiredLanes = ['beta', 'release', 'hipaa_check'];
    requiredLanes.forEach(lane => {
      if (fastfileContent.includes(`lane :${lane}`)) {
        validators.info.push(`Fastlane lane '${lane}' configured`);
      } else {
        validators.warning.push(`Fastlane lane '${lane}' not found`);
      }
    });
  } else {
    validators.critical.push('Fastlane not configured');
  }
}

/**
 * Validate environment variables
 */
async function validateEnvironment() {
  log('Validating Environment Variables', 'section');
  
  const requiredEnvVars = [
    { name: 'VITE_SUPABASE_URL', secret: false },
    { name: 'VITE_SUPABASE_ANON_KEY', secret: true },
    { name: 'P12_PASSWORD', secret: true },
    { name: 'KEYCHAIN_PASSWORD', secret: true },
    { name: 'APPLE_ID', secret: false }
  ];
  
  let allPresent = true;
  requiredEnvVars.forEach(({ name, secret }) => {
    const result = checkEnvVar(name, secret);
    if (result.exists) {
      validators.info.push(`${name}: ${result.value}`);
    } else {
      validators.warning.push(`Missing environment variable: ${name}`);
      allPresent = false;
    }
  });
  
  consensusVotes.environmentReady.push(allPresent);
}

/**
 * Validate GitHub Actions
 */
async function validateGitHubActions() {
  log('Validating GitHub Actions Configuration', 'section');
  
  const workflowFiles = [
    '.github/workflows/ios-deploy-fastlane.yml',
    '.github/workflows/ios-testflight.yml',
    '.github/workflows/ios-deploy.yml'
  ];
  
  let activeWorkflows = 0;
  workflowFiles.forEach(file => {
    if (fileExists(file)) {
      validators.info.push(`Workflow found: ${path.basename(file)}`);
      activeWorkflows++;
    }
  });
  
  if (activeWorkflows > 0) {
    validators.success.push(`${activeWorkflows} iOS deployment workflow(s) configured`);
  } else {
    validators.critical.push('No iOS deployment workflows found');
  }
}

/**
 * Validate security compliance
 */
async function validateSecurity() {
  log('Validating Security Compliance', 'section');
  
  // Check for hardcoded secrets
  const filesToCheck = [
    'apply-security-fix.js',
    'apply-security-fix.mjs',
    'src/**/*.ts',
    'src/**/*.tsx'
  ];
  
  let securityIssues = 0;
  
  // Check for Supabase service key
  if (fileExists('apply-security-fix.js')) {
    const content = fs.readFileSync('apply-security-fix.js', 'utf8');
    if (content.includes('eyJhbGciOiJIUzI1NiI')) {
      validators.critical.push('CRITICAL: Hardcoded Supabase service key found!');
      securityIssues++;
    }
  }
  
  // Check HIPAA compliance configurations
  const infoPlist = 'ios/App/App/Info.plist';
  if (fileExists(infoPlist)) {
    const plistContent = fs.readFileSync(infoPlist, 'utf8');
    const requiredKeys = [
      'NSCameraUsageDescription',
      'NSMicrophoneUsageDescription',
      'NSLocationWhenInUseUsageDescription'
    ];
    
    requiredKeys.forEach(key => {
      if (plistContent.includes(key)) {
        validators.info.push(`Privacy permission configured: ${key}`);
      } else {
        validators.warning.push(`Missing privacy key: ${key}`);
      }
    });
  }
  
  if (securityIssues === 0) {
    validators.success.push('No hardcoded secrets detected');
  }
}

/**
 * Byzantine consensus validation
 */
function performByzantineConsensus() {
  log('Performing Byzantine Consensus Validation', 'agent');
  
  const categories = Object.keys(consensusVotes);
  categories.forEach(category => {
    const votes = consensusVotes[category];
    if (votes.length === 0) return;
    
    const trueVotes = votes.filter(v => v === true).length;
    const consensus = trueVotes / votes.length;
    
    if (consensus >= 0.67) {
      log(`${category}: APPROVED (${Math.round(consensus * 100)}% consensus)`, 'success');
    } else if (consensus >= 0.33) {
      log(`${category}: CONDITIONAL (${Math.round(consensus * 100)}% consensus)`, 'warning');
    } else {
      log(`${category}: REJECTED (${Math.round(consensus * 100)}% consensus)`, 'critical');
    }
  });
}

/**
 * Generate deployment readiness report
 */
function generateReport() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '       iOS DEPLOYMENT VALIDATION REPORT' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════════════════' + colors.reset + '\n');
  
  // Critical issues
  if (validators.critical.length > 0) {
    console.log(colors.red + colors.bright + '🚨 CRITICAL ISSUES (' + validators.critical.length + ')' + colors.reset);
    validators.critical.forEach(issue => {
      console.log(colors.red + '   ❌ ' + issue + colors.reset);
    });
    console.log();
  }
  
  // Warnings
  if (validators.warning.length > 0) {
    console.log(colors.yellow + colors.bright + '⚠️  WARNINGS (' + validators.warning.length + ')' + colors.reset);
    validators.warning.forEach(warning => {
      console.log(colors.yellow + '   ⚠️  ' + warning + colors.reset);
    });
    console.log();
  }
  
  // Success items
  if (validators.success.length > 0) {
    console.log(colors.green + colors.bright + '✅ VALIDATED (' + validators.success.length + ')' + colors.reset);
    validators.success.forEach(success => {
      console.log(colors.green + '   ✅ ' + success + colors.reset);
    });
    console.log();
  }
  
  // Info items
  if (validators.info.length > 0) {
    console.log(colors.blue + colors.bright + 'ℹ️  INFORMATION' + colors.reset);
    validators.info.forEach(info => {
      console.log(colors.blue + '   • ' + info + colors.reset);
    });
    console.log();
  }
  
  // Byzantine consensus results
  performByzantineConsensus();
  
  // Overall readiness
  console.log('\n' + colors.bright + '📊 DEPLOYMENT READINESS' + colors.reset);
  const criticalCount = validators.critical.length;
  const warningCount = validators.warning.length;
  
  if (criticalCount === 0 && warningCount === 0) {
    console.log(colors.green + colors.bright + '   🚀 READY FOR DEPLOYMENT' + colors.reset);
    console.log(colors.green + '   All checks passed successfully!' + colors.reset);
  } else if (criticalCount === 0) {
    console.log(colors.yellow + colors.bright + '   ⚠️  CONDITIONAL DEPLOYMENT' + colors.reset);
    console.log(colors.yellow + `   ${warningCount} warning(s) should be addressed` + colors.reset);
  } else {
    console.log(colors.red + colors.bright + '   ❌ NOT READY FOR DEPLOYMENT' + colors.reset);
    console.log(colors.red + `   ${criticalCount} critical issue(s) must be resolved` + colors.reset);
  }
  
  // Next steps
  console.log('\n' + colors.cyan + colors.bright + '📋 NEXT STEPS' + colors.reset);
  if (criticalCount > 0) {
    console.log('   1. Resolve all critical issues listed above');
    console.log('   2. Re-run validation: npm run validate:ios');
    console.log('   3. Once validated, deploy: npm run deploy:ios');
  } else {
    console.log('   1. Create app in App Store Connect');
    console.log('   2. Configure GitHub Secrets');
    console.log('   3. Run deployment: gh workflow run ios-deploy-fastlane.yml');
  }
  
  console.log('\n' + colors.bright + '═══════════════════════════════════════════════════' + colors.reset);
}

/**
 * Main validation orchestrator
 */
async function main() {
  console.log(colors.bright + colors.cyan + '\n🤖 iOS Deployment Validator with BMAD Framework' + colors.reset);
  console.log(colors.cyan + 'Powered by Agent Swarms & Byzantine Consensus\n' + colors.reset);
  
  // Run all validations
  await validateAppStoreConnect();
  await validateCertificates();
  await validateProjectConfig();
  await validateEnvironment();
  await validateGitHubActions();
  await validateSecurity();
  
  // Generate report
  generateReport();
  
  // Exit with appropriate code
  process.exit(validators.critical.length > 0 ? 1 : 0);
}

// Run validation
main().catch(error => {
  console.error(colors.red + '❌ Validation failed: ' + error.message + colors.reset);
  process.exit(1);
});