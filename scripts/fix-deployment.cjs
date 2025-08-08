#!/usr/bin/env node

/**
 * Emergency Deployment Fix Script
 * Automatically fixes common Vercel deployment issues
 * 
 * This script:
 * 1. Restores correct tsconfig.json for React app
 * 2. Moves MCP files to correct location
 * 3. Fixes package.json if needed
 * 4. Installs missing dependencies
 * 5. Validates the fix worked
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let fixesApplied = 0;

// Fix 1: Restore correct tsconfig.json
function fixTsConfig() {
  log('\n🔧 Fixing tsconfig.json...', 'blue');
  
  const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
  const correctTsConfig = {
    files: [],
    references: [
      { path: './tsconfig.app.json' },
      { path: './tsconfig.node.json' }
    ]
  };
  
  try {
    const current = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    // Check if it needs fixing
    if (current.include || !current.references) {
      log('  Restoring correct React app tsconfig.json...', 'yellow');
      fs.writeFileSync(tsconfigPath, JSON.stringify(correctTsConfig, null, 2));
      log('  ✅ Fixed tsconfig.json', 'green');
      fixesApplied++;
    } else {
      log('  ✓ tsconfig.json already correct', 'green');
    }
  } catch (error) {
    log('  Creating new tsconfig.json...', 'yellow');
    fs.writeFileSync(tsconfigPath, JSON.stringify(correctTsConfig, null, 2));
    log('  ✅ Created tsconfig.json', 'green');
    fixesApplied++;
  }
}

// Fix 2: Move MCP files to correct location
function moveMcpFiles() {
  log('\n📁 Moving MCP files to correct location...', 'blue');
  
  const srcPath = path.join(__dirname, '..', 'src');
  const mcpSrcPath = path.join(__dirname, '..', 'serenity-crisis-mcp', 'src');
  const mcpFiles = ['index.ts', 'crisis-handler.ts', 'types.ts'];
  
  // Ensure MCP src directory exists
  if (!fs.existsSync(mcpSrcPath)) {
    fs.mkdirSync(mcpSrcPath, { recursive: true });
  }
  
  let filesMoved = 0;
  
  mcpFiles.forEach(file => {
    const srcFile = path.join(srcPath, file);
    const destFile = path.join(mcpSrcPath, file);
    
    if (fs.existsSync(srcFile)) {
      // Check if it's actually an MCP file
      const content = fs.readFileSync(srcFile, 'utf8');
      if (content.includes('@modelcontextprotocol/sdk')) {
        log(`  Moving ${file} to serenity-crisis-mcp/src/...`, 'yellow');
        
        // Backup existing file if it exists
        if (fs.existsSync(destFile)) {
          fs.writeFileSync(destFile + '.backup', fs.readFileSync(destFile));
        }
        
        // Move the file
        fs.renameSync(srcFile, destFile);
        filesMoved++;
        log(`  ✅ Moved ${file}`, 'green');
      }
    }
  });
  
  if (filesMoved > 0) {
    log(`  ✅ Moved ${filesMoved} MCP files`, 'green');
    fixesApplied++;
  } else {
    log('  ✓ No MCP files to move', 'green');
  }
}

// Fix 3: Fix package.json if needed
function fixPackageJson() {
  log('\n📦 Fixing package.json...', 'blue');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  let needsSave = false;
  
  // Fix name if wrong
  if (packageJson.name === 'serenity-crisis-mcp') {
    log('  Fixing package name...', 'yellow');
    packageJson.name = 'serenity-sober-pathways-guide';
    packageJson.description = 'HIPAA-compliant mental health and substance abuse recovery platform';
    needsSave = true;
  }
  
  // Ensure build script is correct
  if (packageJson.scripts.build !== 'tsc && vite build') {
    log('  Fixing build script...', 'yellow');
    packageJson.scripts.build = 'tsc && vite build';
    needsSave = true;
  }
  
  // Add validation scripts if missing
  if (!packageJson.scripts['validate:structure']) {
    log('  Adding validation scripts...', 'yellow');
    packageJson.scripts['validate:structure'] = 'node scripts/validate-structure.js';
    packageJson.scripts['fix:deployment'] = 'node scripts/fix-deployment.js';
    packageJson.scripts['prebuild'] = 'npm run validate:structure';
    needsSave = true;
  }
  
  if (needsSave) {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    log('  ✅ Fixed package.json', 'green');
    fixesApplied++;
  } else {
    log('  ✓ package.json already correct', 'green');
  }
}

// Fix 4: Install missing dependencies
function fixDependencies() {
  log('\n📚 Checking dependencies...', 'blue');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredDeps = {
    'next-themes': '^0.4.6',
    '@hello-pangea/dnd': '^18.0.1',
    'dompurify': '^3.2.6'
  };
  
  const requiredDevDeps = {
    'terser': '^5.43.1',
    '@types/dompurify': '^3.0.5'
  };
  
  const missingDeps = [];
  const missingDevDeps = [];
  
  Object.keys(requiredDeps).forEach(dep => {
    if (!packageJson.dependencies?.[dep]) {
      missingDeps.push(dep);
    }
  });
  
  Object.keys(requiredDevDeps).forEach(dep => {
    if (!packageJson.devDependencies?.[dep]) {
      missingDevDeps.push(dep);
    }
  });
  
  if (missingDeps.length > 0 || missingDevDeps.length > 0) {
    log('  Installing missing dependencies...', 'yellow');
    
    if (missingDeps.length > 0) {
      const depsToInstall = missingDeps.join(' ');
      log(`  Installing: ${depsToInstall}`, 'magenta');
      execSync(`npm install ${depsToInstall} --legacy-peer-deps`, { stdio: 'inherit' });
    }
    
    if (missingDevDeps.length > 0) {
      const devDepsToInstall = missingDevDeps.join(' ');
      log(`  Installing dev deps: ${devDepsToInstall}`, 'magenta');
      execSync(`npm install ${devDepsToInstall} --save-dev --legacy-peer-deps`, { stdio: 'inherit' });
    }
    
    log('  ✅ Installed missing dependencies', 'green');
    fixesApplied++;
  } else {
    log('  ✓ All dependencies present', 'green');
  }
}

// Fix 5: Create/update critical files
function ensureCriticalFiles() {
  log('\n📄 Ensuring critical files exist...', 'blue');
  
  // Ensure tsconfig.app.json exists
  const tsconfigAppPath = path.join(__dirname, '..', 'tsconfig.app.json');
  if (!fs.existsSync(tsconfigAppPath)) {
    log('  Creating tsconfig.app.json...', 'yellow');
    const tsconfigApp = {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: 'force',
        noEmit: true,
        jsx: 'react-jsx',
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noImplicitAny: false,
        noFallthroughCasesInSwitch: false,
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*']
        }
      },
      include: ['src']
    };
    fs.writeFileSync(tsconfigAppPath, JSON.stringify(tsconfigApp, null, 2));
    log('  ✅ Created tsconfig.app.json', 'green');
    fixesApplied++;
  }
  
  // Ensure tsconfig.node.json exists
  const tsconfigNodePath = path.join(__dirname, '..', 'tsconfig.node.json');
  if (!fs.existsSync(tsconfigNodePath)) {
    log('  Creating tsconfig.node.json...', 'yellow');
    const tsconfigNode = {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2023'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: 'force',
        noEmit: true,
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true
      },
      include: ['vite.config.ts']
    };
    fs.writeFileSync(tsconfigNodePath, JSON.stringify(tsconfigNode, null, 2));
    log('  ✅ Created tsconfig.node.json', 'green');
    fixesApplied++;
  }
}

// Validate the fix worked
function validateFix() {
  log('\n✨ Running validation...', 'blue');
  
  try {
    execSync('node scripts/validate-structure.js', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Main fix function
function fix() {
  log('\n🚨 EMERGENCY DEPLOYMENT FIX', 'bright');
  log('=' .repeat(50), 'bright');
  log('Automatically fixing Vercel deployment issues...', 'yellow');
  
  fixTsConfig();
  moveMcpFiles();
  fixPackageJson();
  ensureCriticalFiles();
  fixDependencies();
  
  log('\n' + '='.repeat(50), 'bright');
  
  if (fixesApplied > 0) {
    log(`\n✅ Applied ${fixesApplied} fixes!`, 'green');
    
    // Run validation
    if (validateFix()) {
      log('\n🎉 SUCCESS - Deployment issues fixed!', 'green');
      log('\n📝 Next steps:', 'blue');
      log('  1. Run "npm run build" to test locally', 'yellow');
      log('  2. Commit the fixes: git add -A && git commit -m "fix: Emergency deployment fix"', 'yellow');
      log('  3. Push to trigger deployment: git push', 'yellow');
    } else {
      log('\n⚠️ Fixes applied but validation still failing', 'yellow');
      log('Run "npm run validate:structure" to see remaining issues', 'yellow');
    }
  } else {
    log('\n✅ No fixes needed - everything looks good!', 'green');
  }
}

// Run the fix
fix();