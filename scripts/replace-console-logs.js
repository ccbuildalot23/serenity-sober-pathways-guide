#!/usr/bin/env node

/**
 * Script to replace console.log statements with centralized logger
 * 
 * Usage: node scripts/replace-console-logs.js
 * 
 * This script:
 * 1. Finds all console.log, console.debug, console.info, console.warn statements
 * 2. Replaces them with appropriate logger calls
 * 3. Adds logger import statements
 * 4. Preserves important error logging for production monitoring
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SRC_DIR = path.join(__dirname, '../src');

// Pattern to match console statements
const CONSOLE_PATTERNS = [
  {
    regex: /console\.log\((.*?)\);?/g,
    replacement: 'logger.debug($1);',
    loggerMethod: 'debug'
  },
  {
    regex: /console\.debug\((.*?)\);?/g,
    replacement: 'logger.debug($1);',
    loggerMethod: 'debug'
  },
  {
    regex: /console\.info\((.*?)\);?/g,
    replacement: 'logger.info($1);',
    loggerMethod: 'info'
  },
  {
    regex: /console\.warn\((.*?)\);?/g,
    replacement: 'logger.warn($1);',
    loggerMethod: 'warn'
  }
];

// Files to process (TypeScript and JSX files in src directory)
const FILE_PATTERNS = [
  path.join(SRC_DIR, '**/*.ts'),
  path.join(SRC_DIR, '**/*.tsx'),
  path.join(SRC_DIR, '**/*.js'),
  path.join(SRC_DIR, '**/*.jsx')
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/vite-env.d.ts'
];

function getAllFiles() {
  const allFiles = [];
  
  FILE_PATTERNS.forEach(pattern => {
    const files = glob.sync(pattern, {
      ignore: EXCLUDE_PATTERNS
    });
    allFiles.push(...files);
  });
  
  return [...new Set(allFiles)]; // Remove duplicates
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
  const relativePath = path.relative(path.dirname(filePath), path.join(SRC_DIR, 'services'));
  const importPath = relativePath.replace(/\\/g, '/');
  const loggerImport = `import logger from '${importPath}/loggerService';\n`;
  
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
    } else if (!line.startsWith('//') && !line.startsWith('/*') && line !== '') {
      // Found first non-comment, non-empty line
      break;
    }
  }
  
  lines.splice(insertIndex, 0, loggerImport);
  return lines.join('\n');
}

function replaceConsoleStatements(content) {
  let modified = content;
  let hasReplacements = false;
  
  CONSOLE_PATTERNS.forEach(({ regex, replacement }) => {
    const matches = [...modified.matchAll(regex)];
    if (matches.length > 0) {
      modified = modified.replace(regex, replacement);
      hasReplacements = true;
    }
  });
  
  return { content: modified, hasReplacements };
}

function shouldSkipFile(filePath, content) {
  // Skip files that might be test files or have special console usage
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return true;
  }
  
  // Skip files that explicitly need console for debugging (marked with comment)
  if (content.includes('// @keep-console') || content.includes('/* @keep-console */')) {
    return true;
  }
  
  // Skip service worker files that might need console for debugging
  if (filePath.includes('serviceWorker') || filePath.includes('sw.')) {
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
    const hasConsoleStatements = CONSOLE_PATTERNS.some(({ regex }) => {
      regex.lastIndex = 0; // Reset regex state
      return regex.test(content);
    });
    
    if (!hasConsoleStatements) {
      return { skipped: true, reason: 'No console statements found' };
    }
    
    // Replace console statements
    const { content: modifiedContent, hasReplacements } = replaceConsoleStatements(content);
    
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
  const files = getAllFiles();
  
  console.log(`📁 Found ${files.length} files to check`);
  console.log('🔄 Processing files...\n');
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let totalReplacements = 0;
  
  const results = [];
  
  files.forEach(filePath => {
    const result = processFile(filePath);
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (result.success) {
      processed++;
      console.log(`✅ ${relativePath} - Processed successfully`);
      results.push({ file: relativePath, status: 'processed' });
    } else if (result.skipped) {
      skipped++;
      console.log(`⏭️  ${relativePath} - Skipped (${result.reason})`);
    } else if (result.error) {
      errors++;
      console.log(`❌ ${relativePath} - Error: ${result.error}`);
      results.push({ file: relativePath, status: 'error', error: result.error });
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
    console.log('   3. Update any remaining console.error statements that should remain as errors');
    console.log('   4. Consider adding VITE_ENABLE_CONSOLE_LOGGING=false to your production environment');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, replaceConsoleStatements };