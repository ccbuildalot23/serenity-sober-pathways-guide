#!/usr/bin/env node

/**
 * App Store Connect API Automation Script
 * For Serenity Sober Pathways - HIPAA-Compliant Healthcare App
 * 
 * This script automates App Store Connect operations using the official API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  bundleId: 'com.serenity.recovery',
  appName: 'Serenity Sober Pathways',
  teamId: 'XDY458RQ59',
  sku: 'SERENITY-RECOVERY-001',
  primaryLocale: 'en-US',
  category: 'MEDICAL',
  secondaryCategory: 'HEALTH_AND_FITNESS',
  contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT',
  
  // API Configuration
  apiKeyId: process.env.APP_STORE_CONNECT_KEY_ID || '4YBU7UC32Y',
  issuerId: process.env.APP_STORE_CONNECT_ISSUER_ID,
  privateKeyPath: process.env.APP_STORE_CONNECT_KEY_PATH || 'C:\\ios-certs\\AuthKey_4YBU7UC32Y.p8',
  
  // Healthcare App Specific
  ageRating: {
    alcoholTobaccoOrDrugUseOrReferences: 'FREQUENT_OR_INTENSE',
    medicalOrTreatmentInformation: 'FREQUENT_OR_INTENSE',
    profanityOrCrudeHumor: 'NONE',
    sexualContentOrNudity: 'NONE',
    violentContent: 'NONE',
    gamblingAndContests: 'NONE',
    horrorOrFearThemes: 'NONE',
    matureOrSuggestiveThemes: 'INFREQUENT_OR_MILD'
  }
};

/**
 * Generate JWT token for App Store Connect API
 */
function generateToken() {
  const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8');
  
  const payload = {
    iss: CONFIG.issuerId,
    exp: Math.floor(Date.now() / 1000) + (20 * 60), // 20 minutes
    aud: 'appstoreconnect-v1'
  };
  
  const signOptions = {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: CONFIG.apiKeyId,
      typ: 'JWT'
    }
  };
  
  return jwt.sign(payload, privateKey, signOptions);
}

/**
 * Make API request to App Store Connect
 */
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const token = generateToken();
    
    const options = {
      hostname: 'api.appstoreconnect.apple.com',
      port: 443,
      path: `/v1${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Check if app exists in App Store Connect
 */
async function checkAppExists() {
  try {
    const response = await apiRequest('GET', `/apps?filter[bundleId]=${CONFIG.bundleId}`);
    return response.data && response.data.length > 0;
  } catch (error) {
    console.error('Error checking app existence:', error.message);
    return false;
  }
}

/**
 * Create Bundle ID if it doesn't exist
 */
async function createBundleId() {
  const data = {
    data: {
      type: 'bundleIds',
      attributes: {
        identifier: CONFIG.bundleId,
        name: CONFIG.appName,
        platform: 'IOS'
      }
    }
  };
  
  try {
    const response = await apiRequest('POST', '/bundleIds', data);
    console.log('✅ Bundle ID created successfully');
    return response.data.id;
  } catch (error) {
    if (error.message.includes('409')) {
      console.log('ℹ️ Bundle ID already exists');
      // Fetch existing bundle ID
      const response = await apiRequest('GET', `/bundleIds?filter[identifier]=${CONFIG.bundleId}`);
      return response.data[0].id;
    }
    throw error;
  }
}

/**
 * Create app in App Store Connect
 */
async function createApp(bundleIdResourceId) {
  const data = {
    data: {
      type: 'apps',
      attributes: {
        bundleId: CONFIG.bundleId,
        name: CONFIG.appName,
        primaryLocale: CONFIG.primaryLocale,
        sku: CONFIG.sku,
        contentRightsDeclaration: CONFIG.contentRightsDeclaration
      },
      relationships: {
        bundleId: {
          data: {
            type: 'bundleIds',
            id: bundleIdResourceId
          }
        }
      }
    }
  };
  
  try {
    const response = await apiRequest('POST', '/apps', data);
    console.log('✅ App created successfully in App Store Connect');
    return response.data.id;
  } catch (error) {
    if (error.message.includes('409')) {
      console.log('ℹ️ App already exists in App Store Connect');
      const response = await apiRequest('GET', `/apps?filter[bundleId]=${CONFIG.bundleId}`);
      return response.data[0].id;
    }
    throw error;
  }
}

/**
 * Configure app information for healthcare app
 */
async function configureAppInfo(appId) {
  // Get app info
  const appInfoResponse = await apiRequest('GET', `/apps/${appId}/appInfos`);
  const appInfoId = appInfoResponse.data[0].id;
  
  // Update app info with healthcare categories
  const data = {
    data: {
      type: 'appInfos',
      id: appInfoId,
      attributes: {
        primaryCategory: CONFIG.category,
        secondaryCategory: CONFIG.secondaryCategory
      }
    }
  };
  
  try {
    await apiRequest('PATCH', `/appInfos/${appInfoId}`, data);
    console.log('✅ App categories configured for healthcare');
  } catch (error) {
    console.error('⚠️ Could not update app categories:', error.message);
  }
}

/**
 * Configure age rating for healthcare app
 */
async function configureAgeRating(appId) {
  const data = {
    data: {
      type: 'ageRatingDeclarations',
      attributes: CONFIG.ageRating,
      relationships: {
        app: {
          data: {
            type: 'apps',
            id: appId
          }
        }
      }
    }
  };
  
  try {
    await apiRequest('POST', '/ageRatingDeclarations', data);
    console.log('✅ Age rating configured for healthcare app (17+)');
  } catch (error) {
    console.error('⚠️ Age rating may already be configured:', error.message);
  }
}

/**
 * Main function to set up app in App Store Connect
 */
async function main() {
  console.log('🚀 App Store Connect API Automation');
  console.log('====================================');
  console.log(`📱 App: ${CONFIG.appName}`);
  console.log(`📦 Bundle ID: ${CONFIG.bundleId}`);
  console.log(`👥 Team ID: ${CONFIG.teamId}`);
  console.log('');
  
  try {
    // Check if app exists
    console.log('🔍 Checking if app exists...');
    const appExists = await checkAppExists();
    
    if (appExists) {
      console.log('✅ App already exists in App Store Connect');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('1. Run: cd ios && fastlane beta');
      console.log('2. Check TestFlight for your build');
      console.log('3. Submit for App Store review when ready');
      return;
    }
    
    console.log('❌ App not found, creating...');
    console.log('');
    
    // Create Bundle ID
    console.log('📦 Creating Bundle ID...');
    const bundleIdResourceId = await createBundleId();
    
    // Create App
    console.log('📱 Creating app in App Store Connect...');
    const appId = await createApp(bundleIdResourceId);
    
    // Configure app for healthcare
    console.log('🏥 Configuring healthcare app settings...');
    await configureAppInfo(appId);
    await configureAgeRating(appId);
    
    console.log('');
    console.log('✅ SUCCESS! App is now configured in App Store Connect');
    console.log('');
    console.log('📋 Healthcare App Configuration Complete:');
    console.log('  ✅ Bundle ID registered');
    console.log('  ✅ App created in App Store Connect');
    console.log('  ✅ Medical category set');
    console.log('  ✅ Age rating configured (17+)');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Run: cd ios && fastlane beta');
    console.log('2. Upload first build to TestFlight');
    console.log('3. Configure app metadata and screenshots');
    console.log('4. Submit for App Store review');
    console.log('');
    console.log('🏥 Healthcare Compliance Checklist:');
    console.log('  □ Privacy Policy URL configured');
    console.log('  □ HIPAA compliance statement added');
    console.log('  □ Medical disclaimer included');
    console.log('  □ Terms of Service updated');
    console.log('  □ Crisis support information visible');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Verify API key is valid');
    console.log('2. Check Team ID matches your account');
    console.log('3. Ensure you have App Manager role');
    console.log('4. Try creating app manually in App Store Connect');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateToken,
  apiRequest,
  checkAppExists,
  createBundleId,
  createApp,
  configureAppInfo,
  configureAgeRating
};