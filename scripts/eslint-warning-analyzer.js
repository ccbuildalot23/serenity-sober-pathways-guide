#!/usr/bin/env node

/**
 * ESLint Warning Analyzer and Automated Fix Script
 * 
 * This script analyzes TypeScript/React files and automatically fixes
 * common ESLint warnings without requiring ESLint to run first.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Configuration for what to fix
const fixConfig = {
  replaceAnyWithUnknown: true,
  prefixUnusedVars: true,
  removeDeadImports: true,
  fixConsoleStatements: false, // Keep console statements for now
  addMissingDependencies: false // Don't auto-add deps, flag for manual review
};

// Patterns to detect common ESLint warning issues
const patterns = {
  // @typescript-eslint/no-explicit-any
  anyType: /:\s*any(?!\w)/g,
  anyGeneric: /<any>/g,
  anyArray: /any\[\]/g,
  anyFunction: /\(.*?\):\s*any/g,
  
  // @typescript-eslint/no-unused-vars
  unusedImport: /import\s*{\s*([^}]+)\s*}\s*from\s*['"][^'"]+['"]/g,
  unusedVar: /(?:const|let|var)\s+(\w+)/g,
  unusedParam: /\(\s*(\w+)(?:\s*:\s*[^,)]+)?\s*[,)]/g,
  
  // React hooks exhaustive deps
  useEffectHook: /useEffect\s*\(\s*\(\s*\)\s*=>\s*{[^}]*},\s*\[\s*([^\]]*)\s*\]\s*\)/g,
  
  // Other common patterns
  consoleLog: /console\.(log|warn|error|debug|info)/g,
  deadCode: /\/\*\s*eslint-disable-next-line\s*@typescript-eslint\/no-unused-vars\s*\*\/\s*const\s+\w+/g
};

// Statistics tracking
let stats = {
  filesScanned: 0,
  filesModified: 0,
  anyReplacements: 0,
  unusedVarFixes: 0,
  importsRemoved: 0,
  issuesFound: [],
  unfixableIssues: []
};

/**
 * Recursively find all TypeScript/React files
 */
function findTSFiles(dir, files = []) {
  try {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other build directories
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

/**
 * Analyze a single file for potential issues
 */
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    
    const issues = [];
    
    // Count 'any' types
    const anyMatches = content.match(patterns.anyType);
    if (anyMatches) {
      issues.push({
        type: '@typescript-eslint/no-explicit-any',
        count: anyMatches.length,
        fixable: true,
        examples: anyMatches.slice(0, 3)
      });
    }
    
    // Check for unused imports (simplified detection)
    const lines = content.split('\n');
    const importLines = lines.filter(line => line.trim().startsWith('import'));
    const unusedImports = [];
    
    importLines.forEach((line, index) => {
      const importMatch = line.match(/import\s*{\s*([^}]+)\s*}/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(i => i.trim());
        const unusedInThisLine = imports.filter(imp => {
          const cleanImp = imp.replace(/\s+as\s+\w+/, '');
          return !content.includes(cleanImp) || content.indexOf(cleanImp) === content.indexOf(line);
        });
        if (unusedInThisLine.length > 0) {
          unusedImports.push({
            line: index + 1,
            imports: unusedInThisLine
          });
        }
      }
    });
    
    if (unusedImports.length > 0) {
      issues.push({
        type: '@typescript-eslint/no-unused-vars (imports)',
        count: unusedImports.length,
        fixable: true,
        details: unusedImports
      });
    }
    
    // Check for console statements
    const consoleMatches = content.match(patterns.consoleLog);
    if (consoleMatches) {
      issues.push({
        type: 'no-console',
        count: consoleMatches.length,
        fixable: false, // Don't auto-remove console statements
        examples: consoleMatches.slice(0, 3)
      });
    }
    
    // Check for potential hook dependency issues
    const hookMatches = content.match(/use(Effect|Callback|Memo)\s*\(/g);
    if (hookMatches) {
      issues.push({
        type: 'react-hooks/exhaustive-deps',
        count: hookMatches.length,
        fixable: false, // Requires manual review
        note: 'Manual review required for dependency arrays'
      });
    }
    
    if (issues.length > 0) {
      return {
        file: relativePath,
        issues: issues,
        content: content
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Apply automated fixes to a file
 */
function applyFixes(fileAnalysis) {
  if (!fileAnalysis) return false;
  
  let content = fileAnalysis.content;
  let modified = false;
  
  // Fix 1: Replace 'any' with 'unknown' in safe contexts
  if (fixConfig.replaceAnyWithUnknown) {
    const safeAnyReplacements = [
      { pattern: /:\s*any(?=\s*[=,;)\]])/g, replacement: ': unknown' },
      { pattern: /<any>/g, replacement: '<unknown>' },
      { pattern: /any\[\]/g, replacement: 'unknown[]' },
    ];
    
    safeAnyReplacements.forEach(({ pattern, replacement }) => {
      const before = content;
      content = content.replace(pattern, replacement);
      if (content !== before) {
        const matches = before.match(pattern);
        if (matches) {
          stats.anyReplacements += matches.length;
          modified = true;
        }
      }
    });
  }
  
  // Fix 2: Prefix unused parameters with underscore
  if (fixConfig.prefixUnusedVars) {
    // Find function parameters that might be unused
    const functionPattern = /(\w+)\s*\(\s*([^)]+)\s*\)/g;
    let funcMatch;
    
    while ((funcMatch = functionPattern.exec(content)) !== null) {
      const params = funcMatch[2].split(',').map(p => p.trim());
      params.forEach(param => {
        const paramName = param.split(':')[0].trim();
        if (paramName && !paramName.startsWith('_') && paramName.match(/^[a-zA-Z]\w*$/)) {
          // Check if parameter is actually used in the function body
          const functionStart = funcMatch.index + funcMatch[0].length;
          const functionBody = content.substring(functionStart, functionStart + 1000); // Sample
          
          if (!functionBody.includes(paramName)) {
            const oldParam = new RegExp(`\\b${paramName}\\b`, 'g');
            content = content.replace(oldParam, `_${paramName}`);
            stats.unusedVarFixes++;
            modified = true;
          }
        }
      });
    }
  }
  
  // Fix 3: Remove obviously unused imports (conservative approach)
  if (fixConfig.removeDeadImports) {
    const lines = content.split('\n');
    const newLines = [];
    
    lines.forEach(line => {
      if (line.trim().startsWith('import')) {
        const importMatch = line.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/);
        if (importMatch) {
          const imports = importMatch[1].split(',').map(i => i.trim());
          const usedImports = imports.filter(imp => {
            const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
            return content.split('\n').some((l, i) => 
              i !== lines.indexOf(line) && l.includes(cleanImp)
            );
          });
          
          if (usedImports.length === 0) {
            stats.importsRemoved++;
            modified = true;
            return; // Skip this line
          } else if (usedImports.length < imports.length) {
            newLines.push(`import { ${usedImports.join(', ')} } from '${importMatch[2]}';`);
            stats.importsRemoved += imports.length - usedImports.length;
            modified = true;
            return;
          }
        }
      }
      newLines.push(line);
    });
    
    if (modified) {
      content = newLines.join('\n');
    }
  }
  
  // Write back if modified
  if (modified) {
    try {
      fs.writeFileSync(fileAnalysis.file.startsWith('/') ? fileAnalysis.file : path.join(projectRoot, fileAnalysis.file), content);
      stats.filesModified++;
      return true;
    } catch (error) {
      console.error(`Error writing file ${fileAnalysis.file}:`, error.message);
      return false;
    }
  }
  
  return false;
}

/**
 * Generate a comprehensive analysis report
 */
function generateReport(analyses) {
  const report = {
    summary: {
      totalFiles: stats.filesScanned,
      filesWithIssues: analyses.filter(a => a !== null).length,
      filesModified: stats.filesModified,
      totalFixes: stats.anyReplacements + stats.unusedVarFixes + stats.importsRemoved
    },
    fixesByType: {
      anyReplacements: stats.anyReplacements,
      unusedVarFixes: stats.unusedVarFixes,
      importsRemoved: stats.importsRemoved
    },
    issuesByType: {},
    problematicFiles: [],
    recommendedManualFixes: []
  };
  
  // Categorize issues
  analyses.forEach(analysis => {
    if (!analysis) return;
    
    analysis.issues.forEach(issue => {
      if (!report.issuesByType[issue.type]) {
        report.issuesByType[issue.type] = {
          totalCount: 0,
          affectedFiles: 0,
          fixable: issue.fixable
        };
      }
      
      report.issuesByType[issue.type].totalCount += issue.count;
      report.issuesByType[issue.type].affectedFiles++;
    });
    
    // Files with many issues
    const totalIssues = analysis.issues.reduce((sum, issue) => sum + issue.count, 0);
    if (totalIssues > 10) {
      report.problematicFiles.push({
        file: analysis.file,
        totalIssues: totalIssues,
        breakdown: analysis.issues.map(i => `${i.type}: ${i.count}`).join(', ')
      });
    }
  });
  
  // Recommendations for manual fixes
  if (report.issuesByType['react-hooks/exhaustive-deps']) {
    report.recommendedManualFixes.push({
      type: 'React Hook Dependencies',
      description: 'Review useEffect, useCallback, and useMemo dependency arrays',
      files: analyses.filter(a => a && a.issues.some(i => i.type.includes('exhaustive-deps'))).length
    });
  }
  
  if (report.issuesByType['no-console']) {
    report.recommendedManualFixes.push({
      type: 'Console Statements',
      description: 'Remove or replace console.log statements with proper logging',
      count: report.issuesByType['no-console'].totalCount
    });
  }
  
  return report;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 ESLint Warning Analyzer Starting...\n');
  
  // Find all TypeScript/React files
  console.log('📂 Scanning for TypeScript/React files...');
  const files = findTSFiles(srcDir);
  stats.filesScanned = files.length;
  console.log(`Found ${files.length} files to analyze\n`);
  
  // Analyze each file
  console.log('🔎 Analyzing files for potential issues...');
  const analyses = [];
  let processed = 0;
  
  for (const file of files) {
    const analysis = analyzeFile(file);
    if (analysis) {
      analyses.push(analysis);
      
      // Apply automated fixes if configured
      const fixed = applyFixes(analysis);
      if (fixed) {
        console.log(`✅ Fixed issues in ${path.relative(projectRoot, file)}`);
      }
    }
    
    processed++;
    if (processed % 50 === 0) {
      console.log(`   Processed ${processed}/${files.length} files...`);
    }
  }
  
  console.log(`\n📊 Analysis complete! Processed ${processed} files.\n`);
  
  // Generate comprehensive report
  const report = generateReport(analyses);
  
  // Display results
  console.log('='.repeat(60));
  console.log('📈 ESLINT WARNING ANALYSIS REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📋 SUMMARY:');
  console.log(`   Total files scanned: ${report.summary.totalFiles}`);
  console.log(`   Files with issues: ${report.summary.filesWithIssues}`);
  console.log(`   Files modified: ${report.summary.filesModified}`);
  console.log(`   Total automated fixes applied: ${report.summary.totalFixes}`);
  
  console.log('\n🔧 FIXES APPLIED:');
  console.log(`   'any' → 'unknown' replacements: ${report.fixesByType.anyReplacements}`);
  console.log(`   Unused variable fixes: ${report.fixesByType.unusedVarFixes}`);
  console.log(`   Unused imports removed: ${report.fixesByType.importsRemoved}`);
  
  console.log('\n📊 ISSUES BY TYPE:');
  Object.entries(report.issuesByType).forEach(([type, data]) => {
    const status = data.fixable ? '✅ FIXABLE' : '⚠️  MANUAL REVIEW NEEDED';
    console.log(`   ${type}: ${data.totalCount} issues in ${data.affectedFiles} files ${status}`);
  });
  
  if (report.problematicFiles.length > 0) {
    console.log('\n🚨 FILES NEEDING ATTENTION:');
    report.problematicFiles.slice(0, 10).forEach(file => {
      console.log(`   ${file.file}: ${file.totalIssues} issues (${file.breakdown})`);
    });
    if (report.problematicFiles.length > 10) {
      console.log(`   ... and ${report.problematicFiles.length - 10} more files`);
    }
  }
  
  if (report.recommendedManualFixes.length > 0) {
    console.log('\n💡 RECOMMENDED MANUAL FIXES:');
    report.recommendedManualFixes.forEach(fix => {
      console.log(`   • ${fix.type}: ${fix.description}`);
      if (fix.files) console.log(`     Affects ${fix.files} files`);
      if (fix.count) console.log(`     Found ${fix.count} instances`);
    });
  }
  
  // Save detailed report
  const reportPath = path.join(projectRoot, 'docs', 'eslint-analysis-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  } catch (error) {
    console.error('Error saving report:', error.message);
  }
  
  console.log('\n✨ Analysis complete!');
  
  // Provide next steps
  console.log('\n🎯 NEXT STEPS:');
  console.log('   1. Review the automated fixes made');
  console.log('   2. Test your application to ensure nothing is broken');
  console.log('   3. Manually address the issues that require review');
  console.log('   4. Run ESLint again to verify improvements');
  
  return report;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;