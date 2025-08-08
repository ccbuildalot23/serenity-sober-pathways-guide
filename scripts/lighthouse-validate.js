#!/usr/bin/env node

/**
 * Lighthouse Configuration Validator and Local Test Runner
 * 
 * This script validates the Lighthouse CI configuration and provides
 * tools for local testing of the Serenity platform.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

class LighthouseValidator {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'lighthouse.config.js');
    this.tempConfigPath = path.join(process.cwd(), 'lighthouserc.js');
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validateConfig() {
    this.log('Validating Lighthouse CI configuration...', 'info');

    // Check if config file exists
    if (!fs.existsSync(this.configPath)) {
      this.errors.push(`Configuration file not found: ${this.configPath}`);
      return false;
    }

    try {
      // Load and validate configuration
      const configModule = await import(`file:///${this.configPath.replace(/\\/g, '/')}?t=${Date.now()}`);
      const config = configModule.default || configModule;
      
      // Validate required sections
      if (!config.ci) {
        this.errors.push('Missing ci configuration section');
      }
      
      if (!config.ci.collect) {
        this.errors.push('Missing ci.collect configuration');
      }
      
      if (!config.ci.assert) {
        this.errors.push('Missing ci.assert configuration');
      }

      // Validate critical accessibility thresholds
      const accessibilityThreshold = config.ci.assert?.assertions?.['categories:accessibility'];
      if (!accessibilityThreshold || accessibilityThreshold[1]?.minScore < 0.95) {
        this.warnings.push('Accessibility threshold should be 0.95 or higher for HIPAA compliance');
      }

      // Validate Core Web Vitals thresholds
      const coreVitals = [
        'largest-contentful-paint',
        'first-contentful-paint',
        'cumulative-layout-shift',
        'total-blocking-time'
      ];

      coreVitals.forEach(vital => {
        if (!config.ci.assert?.assertions?.[vital]) {
          this.warnings.push(`Missing Core Web Vital assertion: ${vital}`);
        }
      });

      // Validate accessibility audits
      const criticalA11yAudits = [
        'color-contrast',
        'heading-order',
        'html-has-lang',
        'image-alt',
        'label',
        'link-name'
      ];

      criticalA11yAudits.forEach(audit => {
        if (!config.ci.assert?.assertions?.[audit]) {
          this.warnings.push(`Missing critical accessibility audit: ${audit}`);
        }
      });

      if (this.errors.length === 0) {
        this.log('Configuration validation passed', 'success');
        return true;
      }

    } catch (error) {
      this.errors.push(`Failed to load configuration: ${error.message}`);
    }

    return false;
  }

  async checkDependencies() {
    this.log('Checking Lighthouse CI dependencies...', 'info');

    try {
      // Check if @lhci/cli is available
      execSync('npx @lhci/cli --version', { stdio: 'pipe' });
      this.log('Lighthouse CI is available', 'success');
      return true;
    } catch (error) {
      this.errors.push('Lighthouse CI not available. Install with: npm install -g @lhci/cli');
      return false;
    }
  }

  async runLocalTest(url = 'http://localhost:5173') {
    this.log(`Running local Lighthouse audit on: ${url}`, 'info');

    // Copy config to root for LHCI
    if (fs.existsSync(this.configPath)) {
      const configModule = await import(`file:///${this.configPath.replace(/\\/g, '/')}?t=${Date.now()}`);
      const config = configModule.default || configModule;
      
      // Create temporary config with local URL
      const tempConfig = {
        ...config,
        ci: {
          ...config.ci,
          collect: {
            ...config.ci.collect,
            url: [url]
          }
        }
      };

      fs.writeFileSync(
        this.tempConfigPath,
        `module.exports = ${JSON.stringify(tempConfig, null, 2)};`
      );
    }

    try {
      // Check if URL is accessible
      const response = await fetch(url).catch(() => null);
      if (!response || !response.ok) {
        this.warnings.push(`URL ${url} is not accessible. Make sure your dev server is running.`);
        return false;
      }

      // Run Lighthouse CI
      const command = `npx @lhci/cli autorun --config=${this.tempConfigPath}`;
      this.log(`Executing: ${command}`, 'info');
      
      execSync(command, { stdio: 'inherit' });
      this.log('Local Lighthouse audit completed', 'success');
      
      // Clean up temp config
      if (fs.existsSync(this.tempConfigPath)) {
        fs.unlinkSync(this.tempConfigPath);
      }
      
      return true;
    } catch (error) {
      this.errors.push(`Failed to run local test: ${error.message}`);
      
      // Clean up temp config
      if (fs.existsSync(this.tempConfigPath)) {
        fs.unlinkSync(this.tempConfigPath);
      }
      
      return false;
    }
  }

  generateReport() {
    this.log('\\n=== LIGHTHOUSE CONFIGURATION VALIDATION REPORT ===', 'info');
    
    if (this.errors.length > 0) {
      this.log('\\nErrors found:', 'error');
      this.errors.forEach(error => this.log(`  - ${error}`, 'error'));
    }
    
    if (this.warnings.length > 0) {
      this.log('\\nWarnings:', 'warning');
      this.warnings.forEach(warning => this.log(`  - ${warning}`, 'warning'));
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('\\nAll validations passed! 🎉', 'success');
    }
    
    this.log('\\n=== NEXT STEPS ===', 'info');
    this.log('1. Run "npm run dev" to start your development server', 'info');
    this.log('2. Run "node scripts/lighthouse-validate.js --test" to test locally', 'info');
    this.log('3. Create a PR to trigger the full CI pipeline with Vercel deployment', 'info');
    
    return this.errors.length === 0;
  }
}

// Main execution
async function main() {
  const validator = new LighthouseValidator();
  const args = process.argv.slice(2);
  
  validator.log('🚀 Starting Lighthouse CI validation for Serenity platform...', 'info');
  
  // Validate configuration
  const configValid = await validator.validateConfig();
  
  // Check dependencies
  const depsValid = await validator.checkDependencies();
  
  // Run local test if requested and everything is valid
  if (args.includes('--test') && configValid && depsValid) {
    const url = args.includes('--url') 
      ? args[args.indexOf('--url') + 1] 
      : 'http://localhost:5173';
    
    await validator.runLocalTest(url);
  }
  
  // Generate final report
  const success = validator.generateReport();
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Handle different invocation methods
const isMainModule = import.meta.url.startsWith('file:') && 
  process.argv[1] && 
  import.meta.url.endsWith(path.basename(process.argv[1]));

if (isMainModule) {
  main().catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });
}

export { LighthouseValidator };