#!/usr/bin/env node

/**
 * CSS Build Validation Script
 * Ensures CSS is properly linked in production builds
 * Prevents blank screen issues in TestFlight
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateCSS() {
  log('\n🔍 CSS Build Validation', 'blue');
  log('====================================', 'blue');
  
  let hasErrors = false;
  
  // 1. Check if dist directory exists
  const distPath = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) {
    log('❌ ERROR: dist directory not found. Run "npm run build" first.', 'red');
    return false;
  }
  
  // 2. Check if index.html exists
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    log('❌ ERROR: dist/index.html not found', 'red');
    return false;
  }
  
  // 3. Read index.html content
  const htmlContent = fs.readFileSync(indexPath, 'utf8');
  
  // 4. Check for CSS link tag
  const hasStylesheetLink = htmlContent.includes('<link') && htmlContent.includes('stylesheet');
  const hasCSSImport = htmlContent.includes('.css');
  
  if (!hasStylesheetLink && !hasCSSImport) {
    log('❌ ERROR: No CSS link found in index.html', 'red');
    log('   The HTML file is missing stylesheet references', 'yellow');
    hasErrors = true;
    
    // Try to fix it
    log('\n🔧 Attempting to fix...', 'yellow');
    
    // Find CSS files in assets
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      const cssFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith('.css'));
      
      if (cssFiles.length > 0) {
        const mainCSS = cssFiles.find(f => f.includes('main')) || cssFiles[0];
        const cssLink = `<link rel="stylesheet" crossorigin href="/assets/${mainCSS}">`;
        
        // Inject CSS link before </head>
        const fixedHTML = htmlContent.replace('</head>', `  ${cssLink}\n  </head>`);
        fs.writeFileSync(indexPath, fixedHTML);
        
        log(`✅ Fixed: Added CSS link for ${mainCSS}`, 'green');
        hasErrors = false;
      } else {
        log('❌ No CSS files found in dist/assets/', 'red');
      }
    }
  } else {
    log('✅ CSS is properly linked in index.html', 'green');
  }
  
  // 5. Check CSS file exists and has content
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const cssFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith('.css'));
    
    if (cssFiles.length === 0) {
      log('❌ ERROR: No CSS files in dist/assets/', 'red');
      hasErrors = true;
    } else {
      cssFiles.forEach(cssFile => {
        const cssPath = path.join(assetsPath, cssFile);
        const cssSize = fs.statSync(cssPath).size;
        
        if (cssSize === 0) {
          log(`❌ ERROR: ${cssFile} is empty (0 bytes)`, 'red');
          hasErrors = true;
        } else {
          const sizeKB = (cssSize / 1024).toFixed(2);
          log(`✅ ${cssFile}: ${sizeKB} KB`, 'green');
        }
      });
    }
  }
  
  // 6. Check iOS build if exists
  const iosPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'public');
  if (fs.existsSync(iosPath)) {
    log('\n📱 Checking iOS build...', 'blue');
    
    const iosIndexPath = path.join(iosPath, 'index.html');
    if (fs.existsSync(iosIndexPath)) {
      const iosHTML = fs.readFileSync(iosIndexPath, 'utf8');
      const hasIOSStylesheet = iosHTML.includes('<link') && iosHTML.includes('stylesheet');
      
      if (!hasIOSStylesheet) {
        log('⚠️  WARNING: iOS index.html missing CSS link', 'yellow');
        log('   Run "npx cap copy ios" after fixing', 'yellow');
      } else {
        log('✅ iOS build has CSS linked', 'green');
      }
    }
  }
  
  // Final report
  log('\n====================================', 'blue');
  if (!hasErrors) {
    log('✅ CSS VALIDATION PASSED', 'green');
    log('   Your build is ready for deployment', 'green');
    return true;
  } else {
    log('❌ CSS VALIDATION FAILED', 'red');
    log('   Fix the issues above before deploying', 'red');
    return false;
  }
}

// Run validation
const isValid = validateCSS();

// Exit with appropriate code
process.exit(isValid ? 0 : 1);