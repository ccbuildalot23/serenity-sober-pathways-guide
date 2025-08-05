#!/usr/bin/env node

/**
 * BMAD Method - Analyze Command
 * Analyzes the codebase and provides insights based on configured agents
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CodebaseAnalyzer {
  constructor() {
    this.configPath = path.join(process.cwd(), '.bmad-core', 'bmad-config.json');
    this.config = this.loadConfig();
    this.issues = [];
    this.suggestions = [];
    this.metrics = {
      totalFiles: 0,
      totalLines: 0,
      componentCount: 0,
      serviceCount: 0,
      testCoverage: 0
    };
  }

  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    } catch (error) {
      console.error('Failed to load BMAD configuration:', error.message);
      process.exit(1);
    }
  }

  async analyze() {
    console.log('\n🔍 BMAD Method - Codebase Analysis\n');
    console.log('Project:', this.config.projectName);
    console.log('Framework:', this.config.framework);
    console.log('Domain:', this.config.domain);
    console.log('\n' + '='.repeat(50) + '\n');

    // Analyze different aspects based on enabled agents
    if (this.config.agents.architecture.enabled) {
      await this.analyzeArchitecture();
    }

    if (this.config.agents.security.enabled) {
      await this.analyzeSecurity();
    }

    if (this.config.agents.optimization.enabled) {
      await this.analyzePerformance();
    }

    this.generateReport();
  }

  async analyzeArchitecture() {
    console.log('📐 Analyzing Architecture...\n');

    // Check component structure
    const components = glob.sync('src/components/**/*.tsx');
    this.metrics.componentCount = components.length;

    // Check for enhanced components pattern
    const enhancedComponents = components.filter(f => f.includes('Enhanced'));
    if (enhancedComponents.length > 0) {
      this.suggestions.push({
        type: 'architecture',
        message: `Found ${enhancedComponents.length} enhanced components following best practices`,
        severity: 'info'
      });
    }

    // Check service layer
    const services = glob.sync('src/services/**/*.ts');
    this.metrics.serviceCount = services.length;

    // Check for proper separation of concerns
    const mixedFiles = components.filter(file => {
      const content = fs.readFileSync(file, 'utf8');
      return content.includes('supabase.from(') || content.includes('fetch(');
    });

    if (mixedFiles.length > 0) {
      this.issues.push({
        type: 'architecture',
        message: `Found ${mixedFiles.length} components with direct API calls (should use services)`,
        severity: 'warning',
        files: mixedFiles.slice(0, 5)
      });
    }
  }

  async analyzeSecurity() {
    console.log('🔒 Analyzing Security...\n');

    const sourceFiles = glob.sync('src/**/*.{ts,tsx}');
    
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hardcoded secrets
      if (content.match(/['"](sk_|pk_|secret_|key_|token_)[a-zA-Z0-9]{20,}['"]/)) {
        this.issues.push({
          type: 'security',
          message: 'Potential hardcoded secret detected',
          severity: 'critical',
          file: file
        });
      }

      // Check for console.log in production code
      if (content.includes('console.log') && !file.includes('test')) {
        this.issues.push({
          type: 'security',
          message: 'console.log found in production code',
          severity: 'low',
          file: file
        });
      }

      // Check for input validation
      if (content.includes('dangerouslySetInnerHTML')) {
        this.issues.push({
          type: 'security',
          message: 'dangerouslySetInnerHTML usage detected',
          severity: 'high',
          file: file
        });
      }

      // Check for proper error handling
      if (content.includes('catch') && content.includes('catch(e){}')) {
        this.issues.push({
          type: 'security',
          message: 'Empty catch block detected',
          severity: 'medium',
          file: file
        });
      }
    }

    // Check for security headers
    const vercelConfig = path.join(process.cwd(), 'vercel.json');
    if (fs.existsSync(vercelConfig)) {
      const config = JSON.parse(fs.readFileSync(vercelConfig, 'utf8'));
      if (!config.headers) {
        this.issues.push({
          type: 'security',
          message: 'Security headers not configured in vercel.json',
          severity: 'high'
        });
      }
    }
  }

  async analyzePerformance() {
    console.log('⚡ Analyzing Performance...\n');

    const components = glob.sync('src/components/**/*.tsx');
    
    for (const file of components) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for missing React.memo
      if (content.includes('export default function') && !content.includes('memo(')) {
        const componentName = path.basename(file, '.tsx');
        if (!['App', 'Layout', 'Router'].includes(componentName)) {
          this.suggestions.push({
            type: 'performance',
            message: `Consider using React.memo for ${componentName}`,
            severity: 'info',
            file: file
          });
        }
      }

      // Check for missing useMemo/useCallback
      const stateCount = (content.match(/useState/g) || []).length;
      const memoCount = (content.match(/useMemo|useCallback/g) || []).length;
      
      if (stateCount > 3 && memoCount === 0) {
        this.suggestions.push({
          type: 'performance',
          message: `Complex component without memoization detected`,
          severity: 'medium',
          file: file
        });
      }

      // Check for large bundle imports
      if (content.includes('import _ from "lodash"')) {
        this.issues.push({
          type: 'performance',
          message: 'Full lodash import detected (use specific imports)',
          severity: 'medium',
          file: file
        });
      }
    }

    // Check for lazy loading
    const routeFile = path.join(process.cwd(), 'src', 'App.tsx');
    if (fs.existsSync(routeFile)) {
      const content = fs.readFileSync(routeFile, 'utf8');
      if (!content.includes('lazy(')) {
        this.suggestions.push({
          type: 'performance',
          message: 'Consider implementing code splitting with React.lazy',
          severity: 'medium'
        });
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Analysis Report\n');

    // Metrics
    console.log('📈 Metrics:');
    console.log(`  • Components: ${this.metrics.componentCount}`);
    console.log(`  • Services: ${this.metrics.serviceCount}`);
    console.log(`  • Issues Found: ${this.issues.length}`);
    console.log(`  • Suggestions: ${this.suggestions.length}`);

    // Critical Issues
    const criticalIssues = this.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      criticalIssues.forEach(issue => {
        console.log(`  ❌ ${issue.message}`);
        if (issue.file) console.log(`     File: ${issue.file}`);
      });
    }

    // High Priority Issues
    const highIssues = this.issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      console.log('\n⚠️  High Priority Issues:');
      highIssues.slice(0, 5).forEach(issue => {
        console.log(`  • ${issue.message}`);
        if (issue.file) console.log(`    File: ${issue.file}`);
      });
    }

    // Suggestions
    if (this.suggestions.length > 0) {
      console.log('\n💡 Top Suggestions:');
      this.suggestions.slice(0, 5).forEach(suggestion => {
        console.log(`  • ${suggestion.message}`);
      });
    }

    // Score
    const score = this.calculateHealthScore();
    console.log('\n🏆 Health Score:', this.getScoreEmoji(score), `${score}/100`);

    // Recommendations
    console.log('\n📝 Recommendations:');
    if (score < 60) {
      console.log('  • Address critical security issues immediately');
      console.log('  • Implement proper error handling');
      console.log('  • Add input validation to all user inputs');
    } else if (score < 80) {
      console.log('  • Consider implementing performance optimizations');
      console.log('  • Review and update security policies');
      console.log('  • Add more comprehensive testing');
    } else {
      console.log('  • Great job! Continue monitoring for issues');
      console.log('  • Consider implementing advanced optimizations');
      console.log('  • Keep dependencies up to date');
    }

    // Save report
    this.saveReport();
  }

  calculateHealthScore() {
    let score = 100;
    
    // Deduct points for issues
    this.issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });

    // Bonus points for good practices
    if (this.metrics.serviceCount > 10) score += 5;
    if (this.metrics.componentCount > 20) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  getScoreEmoji(score) {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      project: this.config.projectName,
      metrics: this.metrics,
      issues: this.issues,
      suggestions: this.suggestions,
      score: this.calculateHealthScore()
    };

    const reportPath = path.join(process.cwd(), '.bmad-core', 'analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('\n📁 Full report saved to:', reportPath);
  }
}

// Run analyzer
const analyzer = new CodebaseAnalyzer();
analyzer.analyze().catch(console.error);