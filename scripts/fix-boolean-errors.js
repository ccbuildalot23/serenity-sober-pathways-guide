#!/usr/bin/env node

/**
 * Fix incorrect boolean replacements made by the automated script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Find all TypeScript/React files
function findTSFiles(dir, files = []) {
  try {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(entry)) {
          findTSFiles(fullPath, files);
        }
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

// Fix boolean and null replacements
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix incorrect boolean/null replacements
    content = content.replace(/_true/g, 'true');
    content = content.replace(/_false/g, 'false');
    content = content.replace(/_null/g, 'null');
    
    // Fix other common issues
    content = content.replace(/import\.meta\._env/g, 'import.meta.env');
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing file ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing boolean and null replacement errors...\n');
  
  const srcDir = path.join(projectRoot, 'src');
  const files = findTSFiles(srcDir);
  
  let fixedFiles = 0;
  
  for (const file of files) {
    if (fixFile(file)) {
      console.log(`✅ Fixed: ${path.relative(projectRoot, file)}`);
      fixedFiles++;
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedFiles} files with boolean/null replacement errors`);
  
  if (fixedFiles > 0) {
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run build (to verify fixes)');
    console.log('2. Run: npm run typecheck (to check types)');
    console.log('3. Run: npx eslint . (to see remaining warnings)');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;