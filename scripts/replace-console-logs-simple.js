#!/usr/bin/env node

/**
 * Simple script to replace console.log statements with centralized logger
 * Uses only Node.js built-in modules
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Helper function to walk directory recursively
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, dist, build, and test directories
      if (!['node_modules', 'dist', 'build', 'tests', '__tests__'].includes(file)) {
        walkDir(filePath, callback);
      }
    } else if (stat.isFile()) {
      // Process TypeScript and JavaScript files
      if (/\.(ts|tsx|js|jsx)$/.test(file) && 
          !file.includes('.test.') && 
          !file.includes('.spec.') &&
          file !== 'vite-env.d.ts') {
        callback(filePath);
      }
    }
  });
}

function hasLoggerImport(content) {
  return content.includes("import logger from") || 
         content.includes("import { logger }") ||
         content.includes("from '../services/loggerService'") ||
         content.includes("from './services/loggerService'") ||
         content.includes("from '../../services/loggerService'") ||
         content.includes("from '../../../services/loggerService'");
}

function addLoggerImport(content, filePath) {
  // Calculate relative path to logger service
  const srcDir = path.resolve(SRC_DIR);
  const fileDir = path.dirname(path.resolve(filePath));
  const serviceDir = path.join(srcDir, 'services');
  
  let relativePath = path.relative(fileDir, serviceDir);
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  relativePath = relativePath.replace(/\\/g, '/');
  
  const loggerImport = `import logger from '${relativePath}/loggerService';`;
  
  // Find the best place to add the import
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Look for existing imports
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ')) {
      insertIndex = i + 1;
    } else if (line === '' && insertIndex > 0) {
      // Found end of import section
      break;
    } else if (!line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && line !== '') {
      // Found first non-comment, non-empty line
      break;
    }
  }
  
  lines.splice(insertIndex, 0, loggerImport);
  return lines.join('\n');
}

function replaceConsoleStatements(content, filePath) {
  let modified = content;
  let hasReplacements = false;
  
  // Get component name from file path for context
  const fileName = path.basename(filePath, path.extname(filePath));
  const componentName = fileName;
  
  // Replace console.log statements
  modified = modified.replace(/console\.log\((.*?)\);?/g, (match, args) => {
    hasReplacements = true;
    // Try to extract meaningful message from args
    const cleanArgs = args.trim();
    if (cleanArgs.startsWith('"') || cleanArgs.startsWith("'") || cleanArgs.startsWith('`')) {
      // Simple string literal
      return `logger.debug(${args}, { component: '${componentName}' });`;
    } else {
      // Complex expression - wrap in template literal
      return `logger.debug('Debug info', { component: '${componentName}', data: ${args} });`;
    }
  });
  
  // Replace console.debug statements
  modified = modified.replace(/console\.debug\((.*?)\);?/g, (match, args) => {
    hasReplacements = true;
    return `logger.debug(${args}, { component: '${componentName}' });`;
  });
  
  // Replace console.info statements
  modified = modified.replace(/console\.info\((.*?)\);?/g, (match, args) => {
    hasReplacements = true;
    return `logger.info(${args}, { component: '${componentName}' });`;
  });
  
  // Replace console.warn statements
  modified = modified.replace(/console\.warn\((.*?)\);?/g, (match, args) => {
    hasReplacements = true;
    return `logger.warn(${args}, { component: '${componentName}' });`;
  });
  
  return { content: modified, hasReplacements };
}

function shouldSkipFile(filePath, content) {
  // Skip files that explicitly need console for debugging
  if (content.includes('// @keep-console') || content.includes('/* @keep-console */')) {
    return true;
  }
  
  // Skip service worker files that might need console for debugging
  if (filePath.includes('serviceWorker') || filePath.includes('sw.')) {
    return true;
  }
  
  // Skip the logger service itself
  if (filePath.includes('loggerService.ts')) {
    return true;
  }
  
  return false;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (shouldSkipFile(filePath, content)) {
      return { skipped: true, reason: 'Explicitly skipped' };
    }
    
    // Check if file has console statements
    const hasConsoleStatements = /console\.(log|debug|info|warn)\s*\(/.test(content);
    
    if (!hasConsoleStatements) {
      return { skipped: true, reason: 'No console statements found' };
    }
    
    // Replace console statements
    const { content: modifiedContent, hasReplacements } = replaceConsoleStatements(content, filePath);
    
    if (!hasReplacements) {
      return { skipped: true, reason: 'No replacements made' };
    }
    
    // Add logger import if not already present
    let finalContent = modifiedContent;
    if (!hasLoggerImport(modifiedContent)) {
      finalContent = addLoggerImport(modifiedContent, filePath);
    }
    
    // Write the modified content back to the file
    fs.writeFileSync(filePath, finalContent, 'utf8');
    
    return { 
      success: true, 
      replacements: hasReplacements,
      addedImport: !hasLoggerImport(modifiedContent)
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

function main() {
  console.log('🔍 Finding files to process...');
  const files = [];
  
  walkDir(SRC_DIR, (filePath) => {
    files.push(filePath);
  });
  
  console.log(`📁 Found ${files.length} files to check`);
  console.log('🔄 Processing files...\n');
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  files.forEach(filePath => {
    const result = processFile(filePath);
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (result.success) {
      processed++;
      console.log(`✅ ${relativePath} - Processed successfully`);
    } else if (result.skipped) {
      skipped++;
      if (result.reason !== 'No console statements found') {
        console.log(`⏭️  ${relativePath} - Skipped (${result.reason})`);
      }
    } else if (result.error) {
      errors++;
      console.log(`❌ ${relativePath} - Error: ${result.error}`);
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📁 Total files: ${files.length}`);
  
  if (processed > 0) {
    console.log('\n🎉 Console.log replacement completed!');
    console.log('📝 Next steps:');
    console.log('   1. Review the changes made to ensure they look correct');
    console.log('   2. Run your tests to make sure everything still works');
    console.log('   3. Consider adding VITE_ENABLE_CONSOLE_LOGGING=false to your .env.production');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, replaceConsoleStatements };