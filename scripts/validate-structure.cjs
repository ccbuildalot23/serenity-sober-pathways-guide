#!/usr/bin/env node

/**
 * Project Structure Validation Script
 * Prevents Vercel deployment failures by validating critical configurations
 * 
 * This script checks:
 * 1. tsconfig.json is correct for React/Vite app
 * 2. No MCP server files in main src/ directory
 * 3. Package.json has correct dependencies
 * 4. Critical files exist and are properly configured
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let hasErrors = false;

// Check 1: Validate tsconfig.json
function validateTsConfig() {
  log('\n📋 Checking tsconfig.json...', 'blue');
  
  const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
  
  if (!fs.existsSync(tsconfigPath)) {
    log('❌ tsconfig.json not found!', 'red');
    hasErrors = true;
    return false;
  }
  
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  
  // Check for React app config (should have references, not includes)
  if (tsconfig.include && tsconfig.include.includes('src/index.ts')) {
    log('❌ tsconfig.json is configured for MCP server, not React app!', 'red');
    log('   Found: include: ["src/index.ts", ...]', 'yellow');
    log('   Expected: references to tsconfig.app.json and tsconfig.node.json', 'yellow');
    hasErrors = true;
    return false;
  }
  
  if (!tsconfig.references) {
    log('❌ tsconfig.json missing references for React app!', 'red');
    hasErrors = true;
    return false;
  }
  
  const hasAppRef = tsconfig.references.some(ref => ref.path === './tsconfig.app.json');
  const hasNodeRef = tsconfig.references.some(ref => ref.path === './tsconfig.node.json');
  
  if (!hasAppRef || !hasNodeRef) {
    log('❌ tsconfig.json missing required references!', 'red');
    hasErrors = true;
    return false;
  }
  
  log('✅ tsconfig.json is correctly configured for React app', 'green');
  return true;
}

// Check 2: No MCP files in main src/
function validateNoMcpInSrc() {
  log('\n📁 Checking for MCP files in src/...', 'blue');
  
  const srcPath = path.join(__dirname, '..', 'src');
  const mcpFiles = ['index.ts', 'crisis-handler.ts', 'types.ts'];
  const foundMcpFiles = [];
  
  mcpFiles.forEach(file => {
    const filePath = path.join(srcPath, file);
    if (fs.existsSync(filePath)) {
      // Check if it's actually an MCP file by looking for MCP imports
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('@modelcontextprotocol/sdk')) {
        foundMcpFiles.push(file);
      }
    }
  });
  
  if (foundMcpFiles.length > 0) {
    log('❌ Found MCP server files in src/ directory!', 'red');
    foundMcpFiles.forEach(file => {
      log(`   - src/${file} (should be in serenity-crisis-mcp/src/)`, 'yellow');
    });
    hasErrors = true;
    return false;
  }
  
  log('✅ No MCP server files found in src/', 'green');
  return true;
}

// Check 3: Validate package.json
function validatePackageJson() {
  log('\n📦 Checking package.json...', 'blue');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check name is correct
  if (packageJson.name === 'serenity-crisis-mcp') {
    log('❌ package.json has MCP server name, not React app!', 'red');
    log('   Found: "name": "serenity-crisis-mcp"', 'yellow');
    log('   Expected: "name": "serenity-sober-pathways-guide"', 'yellow');
    hasErrors = true;
    return false;
  }
  
  // Check for React dependencies
  const requiredDeps = ['react', 'react-dom', 'vite', '@vitejs/plugin-react-swc'];
  const missingDeps = [];
  
  requiredDeps.forEach(dep => {
    if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length > 0) {
    log('❌ Missing required React/Vite dependencies!', 'red');
    missingDeps.forEach(dep => {
      log(`   - ${dep}`, 'yellow');
    });
    hasErrors = true;
    return false;
  }
  
  log('✅ package.json is correctly configured', 'green');
  return true;
}

// Check 4: Validate critical files exist
function validateCriticalFiles() {
  log('\n📄 Checking critical files...', 'blue');
  
  const criticalFiles = [
    'tsconfig.app.json',
    'tsconfig.node.json',
    'vite.config.ts',
    'index.html',
    'src/main.tsx',
    'src/App.tsx'
  ];
  
  const missingFiles = [];
  
  criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    log('❌ Missing critical files!', 'red');
    missingFiles.forEach(file => {
      log(`   - ${file}`, 'yellow');
    });
    hasErrors = true;
    return false;
  }
  
  log('✅ All critical files present', 'green');
  return true;
}

// Check 5: Validate MCP server is in correct location
function validateMcpLocation() {
  log('\n🔧 Checking MCP server location...', 'blue');
  
  const mcpPath = path.join(__dirname, '..', 'serenity-crisis-mcp');
  
  if (!fs.existsSync(mcpPath)) {
    log('⚠️ MCP server directory not found (this is OK if not using MCP)', 'yellow');
    return true;
  }
  
  // Check MCP has its own package.json
  const mcpPackagePath = path.join(mcpPath, 'package.json');
  if (!fs.existsSync(mcpPackagePath)) {
    log('❌ MCP server missing its own package.json!', 'red');
    hasErrors = true;
    return false;
  }
  
  // Check MCP files are in MCP directory
  const mcpSrcPath = path.join(mcpPath, 'src');
  if (!fs.existsSync(mcpSrcPath)) {
    log('❌ MCP server missing src directory!', 'red');
    hasErrors = true;
    return false;
  }
  
  log('✅ MCP server correctly located in serenity-crisis-mcp/', 'green');
  return true;
}

// Main validation
function validate() {
  log('\n🚀 VERCEL DEPLOYMENT STRUCTURE VALIDATION', 'bright');
  log('=' .repeat(50), 'bright');
  
  validateTsConfig();
  validateNoMcpInSrc();
  validatePackageJson();
  validateCriticalFiles();
  validateMcpLocation();
  
  log('\n' + '='.repeat(50), 'bright');
  
  if (hasErrors) {
    log('\n❌ VALIDATION FAILED - Deployment will likely fail!', 'red');
    log('\n💡 Run "npm run fix:deployment" to automatically fix these issues', 'yellow');
    process.exit(1);
  } else {
    log('\n✅ ALL CHECKS PASSED - Ready for deployment!', 'green');
    process.exit(0);
  }
}

// Run validation
validate();