#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Find all TypeScript and JavaScript files
const patterns = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx'
];

let totalFixed = 0;

for (const pattern of patterns) {
  const files = await glob(pattern);
  
  for (const file of files) {
    const filePath = path.resolve(file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace _true with true and _false with false
    // Using word boundaries to avoid replacing parts of other identifiers
    content = content.replace(/\b_true\b/g, 'true');
    content = content.replace(/\b_false\b/g, 'false');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      const trueCount = (originalContent.match(/\b_true\b/g) || []).length;
      const falseCount = (originalContent.match(/\b_false\b/g) || []).length;
      console.log(`Fixed ${file}: ${trueCount} _true and ${falseCount} _false replaced`);
      totalFixed++;
    }
  }
}

console.log(`\n✅ Fixed ${totalFixed} files total`);