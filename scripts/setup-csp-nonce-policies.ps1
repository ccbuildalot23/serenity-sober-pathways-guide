#!/usr/bin/env pwsh
<#
.SYNOPSIS
Setup Content Security Policy (CSP) with Nonce-based Script Execution

.DESCRIPTION
Implements strict CSP policies with nonce-based script execution for enhanced security.
Creates dynamic nonce generation and CSP header management system.
#>

param(
    [switch]$DryRun,
    [string]$LogLevel = 'INFO'
)

function Write-CSPLog {
    param($Message, $Level = 'INFO')
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] [CSP] $Message" -ForegroundColor $(
        switch ($Level) {
            'ERROR' { 'Red' }
            'WARN' { 'Yellow' }
            'SUCCESS' { 'Green' }
            default { 'White' }
        }
    )
}

Write-CSPLog "Setting up Content Security Policy with Nonce..." -Level 'INFO'

try {
    # 1. Create CSP nonce generator utility
    $cspUtilPath = "src/utils/csp-nonce.ts"
    $utilDir = Split-Path $cspUtilPath -Parent
    
    if (-not (Test-Path $utilDir)) {
        New-Item -ItemType Directory -Path $utilDir -Force | Out-Null
    }
    
    $cspNonceUtil = @"
import crypto from 'crypto';

/**
 * Generate cryptographically secure nonce for CSP
 */
export const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('base64');
};

/**
 * CSP Policy Configuration
 */
export interface CSPConfig {
  nonce: string;
  reportUri?: string;
  reportOnly?: boolean;
}

/**
 * Generate CSP header value with nonce
 */
export const generateCSPHeader = (config: CSPConfig): string => {
  const { nonce, reportUri, reportOnly } = config;
  
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss: *.supabase.co *.supabase.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "object-src 'none'",
    "media-src 'self' blob:",
    "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests"
  ];
  
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }
  
  return directives.join('; ');
};

/**
 * CSP Violation Report Handler
 */
export interface CSPViolation {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    disposition: 'enforce' | 'report';
    'blocked-uri': string;
    'line-number': number;
    'column-number': number;
    'source-file': string;
    'status-code': number;
    'script-sample': string;
  };
}

/**
 * Process CSP violation reports for security monitoring
 */
export const procesCSPViolation = (violation: CSPViolation): void => {
  const report = violation['csp-report'];
  
  console.warn('CSP Violation Detected:', {
    uri: report['document-uri'],
    directive: report['violated-directive'],
    blockedUri: report['blocked-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number'],
    timestamp: new Date().toISOString()
  });
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, LogRocket, or custom security endpoint
    fetch('/api/security/csp-violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(violation)
    }).catch(console.error);
  }
};
"@

    if (-not $DryRun) {
        $cspNonceUtil | Out-File -FilePath $cspUtilPath -Encoding UTF8
        Write-CSPLog "✓ CSP nonce utility created" -Level 'SUCCESS'
    } else {
        Write-CSPLog "DRY RUN: Would create CSP nonce utility" -Level 'WARN'
    }

    # 2. Create Vite plugin for CSP nonce injection
    $vitePluginPath = "src/plugins/vite-csp-nonce.ts"
    $pluginDir = Split-Path $vitePluginPath -Parent
    
    if (-not (Test-Path $pluginDir)) {
        New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null
    }
    
    $vitePlugin = @"
import { Plugin } from 'vite';
import { generateNonce } from '../utils/csp-nonce';

interface CSPNonceOptions {
  nonceAttribute?: string;
  scriptTagPattern?: RegExp;
}

/**
 * Vite plugin to inject nonce into script tags during development
 */
export function cspNoncePlugin(options: CSPNonceOptions = {}): Plugin {
  const { 
    nonceAttribute = 'nonce',
    scriptTagPattern = /<script(?![^>]*nonce=)/gi 
  } = options;
  
  let developmentNonce = '';
  
  return {
    name: 'csp-nonce',
    configureServer(server) {
      // Generate nonce for development server
      developmentNonce = generateNonce();
      
      // Add CSP header to development server
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.html') || req.url === '/') {
          const cspHeader = [
            "default-src 'self'",
            `script-src 'self' 'nonce-${developmentNonce}' 'unsafe-eval'`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "connect-src 'self' ws: wss:",
            "font-src 'self' data:",
            "object-src 'none'"
          ].join('; ');
          
          res.setHeader('Content-Security-Policy', cspHeader);
        }
        next();
      });
    },
    transformIndexHtml: {
      enforce: 'pre',
      transform(html) {
        // Inject nonce into script tags
        return html.replace(scriptTagPattern, `<script ${nonceAttribute}="${developmentNonce}"`);
      }
    },
    generateBundle(options, bundle) {
      // For production builds, replace nonce placeholder
      Object.keys(bundle).forEach(fileName => {
        const file = bundle[fileName];
        if (file.type === 'chunk' && fileName.endsWith('.html')) {
          file.source = (file.source as string).replace(
            /nonce="{{NONCE}}"/g,
            `nonce="<%- nonce %>"`
          );
        }
      });
    }
  };
}
"@

    if (-not $DryRun) {
        $vitePlugin | Out-File -FilePath $vitePluginPath -Encoding UTF8
        Write-CSPLog "✓ Vite CSP nonce plugin created" -Level 'SUCCESS'
    } else {
        Write-CSPLog "DRY RUN: Would create Vite CSP nonce plugin" -Level 'WARN'
    }

    # 3. Update Vite configuration to use CSP plugin
    $viteConfigPath = "vite.config.ts"
    if (Test-Path $viteConfigPath) {
        Write-CSPLog "Updating Vite configuration with CSP plugin..." -Level 'INFO'
        
        $viteConfig = Get-Content $viteConfigPath -Raw
        
        # Add import for CSP plugin
        if ($viteConfig -notmatch "cspNoncePlugin") {
            $importStatement = "import { cspNoncePlugin } from './src/plugins/vite-csp-nonce';"
            $updatedConfig = $viteConfig -replace "(import.*from.*vite.*)", "`$1`n$importStatement"
            
            # Add plugin to plugins array
            $pluginAddition = "cspNoncePlugin(),"
            $updatedConfig = $updatedConfig -replace "(plugins:\s*\[)", "`$1`n    $pluginAddition"
            
            if (-not $DryRun) {
                $updatedConfig | Out-File -FilePath $viteConfigPath -Encoding UTF8
                Write-CSPLog "✓ Vite configuration updated with CSP plugin" -Level 'SUCCESS'
            } else {
                Write-CSPLog "DRY RUN: Would update Vite configuration" -Level 'WARN'
            }
        } else {
            Write-CSPLog "CSP plugin already configured in Vite" -Level 'INFO'
        }
    }

    # 4. Create CSP middleware for Express/Node.js
    $middlewarePath = "src/middleware/csp.ts"
    $middlewareDir = Split-Path $middlewarePath -Parent
    
    if (-not (Test-Path $middlewareDir)) {
        New-Item -ItemType Directory -Path $middlewareDir -Force | Out-Null
    }
    
    $cspMiddleware = @"
import { Request, Response, NextFunction } from 'express';
import { generateNonce, generateCSPHeader } from '../utils/csp-nonce';

// Store nonces for the request lifecycle
declare global {
  namespace Express {
    interface Request {
      nonce?: string;
    }
  }
}

/**
 * CSP middleware to generate nonce and set CSP headers
 */
export const cspMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique nonce for this request
  const nonce = generateNonce();
  req.nonce = nonce;
  
  // Generate CSP header with nonce
  const cspHeader = generateCSPHeader({
    nonce,
    reportUri: '/api/security/csp-report',
    reportOnly: process.env.NODE_ENV === 'development'
  });
  
  // Set CSP header
  const headerName = process.env.NODE_ENV === 'development' 
    ? 'Content-Security-Policy-Report-Only' 
    : 'Content-Security-Policy';
  
  res.setHeader(headerName, cspHeader);
  
  // Add nonce to response locals for template rendering
  res.locals.nonce = nonce;
  
  next();
};

/**
 * CSP violation report endpoint handler
 */
export const cspReportHandler = (req: Request, res: Response): void => {
  const violation = req.body;
  
  console.warn('CSP Violation Report:', {
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    violation: violation['csp-report']
  });
  
  // Store violation for analysis
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service (Sentry, DataDog, etc.)
    // await sendToMonitoringService(violation);
  }
  
  res.status(204).end();
};

/**
 * Emergency CSP bypass for development debugging
 * Only use when absolutely necessary and remove afterwards
 */
export const emergencyCSPBypass = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'development' && process.env.CSP_BYPASS === 'true') {
    console.warn('⚠️  CSP BYPASS ACTIVE - DEVELOPMENT ONLY');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' *");
  }
  next();
};
"@

    if (-not $DryRun) {
        $cspMiddleware | Out-File -FilePath $middlewarePath -Encoding UTF8
        Write-CSPLog "✓ CSP middleware created" -Level 'SUCCESS'
    } else {
        Write-CSPLog "DRY RUN: Would create CSP middleware" -Level 'WARN'
    }

    # 5. Create CSP testing utility
    $testUtilPath = "src/utils/csp-test.ts"
    $testUtil = @"
/**
 * CSP Testing Utilities
 * Use these functions to test CSP compliance in your application
 */

export class CSPTester {
  private violations: string[] = [];
  
  constructor() {
    this.setupViolationListener();
  }
  
  private setupViolationListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('securitypolicyviolation', (event) => {
        const violation = {
          blockedURI: event.blockedURI,
          disposition: event.disposition,
          documentURI: event.documentURI,
          effectiveDirective: event.effectiveDirective,
          originalPolicy: event.originalPolicy,
          referrer: event.referrer,
          violatedDirective: event.violatedDirective,
          lineNumber: event.lineNumber,
          columnNumber: event.columnNumber,
          sourceFile: event.sourceFile,
          timestamp: Date.now()
        };
        
        this.violations.push(JSON.stringify(violation));
        console.warn('CSP Violation:', violation);
      });
    }
  }
  
  /**
   * Test if inline script execution is properly blocked
   */
  testInlineScriptBlocking(): boolean {
    try {
      eval('console.log("Inline script executed - CSP NOT working!")');
      return false; // CSP failed to block
    } catch (error) {
      return true; // CSP successfully blocked
    }
  }
  
  /**
   * Test nonce-based script execution
   */
  testNonceScript(nonce: string): void {
    const script = document.createElement('script');
    script.nonce = nonce;
    script.textContent = 'console.log("Nonce script executed successfully");';
    document.head.appendChild(script);
    document.head.removeChild(script);
  }
  
  /**
   * Get all recorded violations
   */
  getViolations(): string[] {
    return [...this.violations];
  }
  
  /**
   * Clear recorded violations
   */
  clearViolations(): void {
    this.violations = [];
  }
  
  /**
   * Generate CSP compliance report
   */
  generateComplianceReport(): object {
    return {
      timestamp: new Date().toISOString(),
      violationCount: this.violations.length,
      violations: this.violations,
      inlineScriptBlocked: this.testInlineScriptBlocking(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }
}

/**
 * Initialize CSP testing in development mode
 */
export const initCSPTesting = (): CSPTester | null => {
  if (process.env.NODE_ENV === 'development') {
    const tester = new CSPTester();
    (window as any).__cspTester = tester;
    console.log('CSP Tester initialized. Use __cspTester for testing.');
    return tester;
  }
  return null;
};
"@

    if (-not $DryRun) {
        $testUtil | Out-File -FilePath $testUtilPath -Encoding UTF8
        Write-CSPLog "✓ CSP testing utility created" -Level 'SUCCESS'
    } else {
        Write-CSPLog "DRY RUN: Would create CSP testing utility" -Level 'WARN'
    }

    # 6. Create CSP validation script
    $validationScript = @"
#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

/**
 * Validate CSP headers on deployed application
 */
async function validateCSP(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname,
            method: 'GET',
            headers: {
                'User-Agent': 'CSP-Validator/1.0'
            }
        };
        
        const req = https.request(options, (res) => {
            const cspHeader = res.headers['content-security-policy'] || 
                            res.headers['content-security-policy-report-only'];
            
            const result = {
                url,
                statusCode: res.statusCode,
                hasCSP: !!cspHeader,
                cspHeader,
                reportOnly: !!res.headers['content-security-policy-report-only'],
                analysis: analyzeCSP(cspHeader)
            };
            
            resolve(result);
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => reject(new Error('Request timeout')));
        req.end();
    });
}

function analyzeCSP(cspHeader) {
    if (!cspHeader) return { valid: false, issues: ['No CSP header found'] };
    
    const issues = [];
    const directives = cspHeader.split(';').map(d => d.trim());
    
    // Check for essential directives
    const requiredDirectives = ['default-src', 'script-src', 'style-src'];
    requiredDirectives.forEach(directive => {
        if (!directives.some(d => d.startsWith(directive))) {
            issues.push(`Missing ${directive} directive`);
        }
    });
    
    // Check for unsafe directives
    const unsafePatterns = ['unsafe-inline', 'unsafe-eval', '*'];
    directives.forEach(directive => {
        unsafePatterns.forEach(pattern => {
            if (directive.includes(pattern) && !directive.includes('nonce-')) {
                issues.push(`Potentially unsafe directive: ${directive}`);
            }
        });
    });
    
    // Check for nonce usage
    const hasNonce = directives.some(d => d.includes('nonce-'));
    if (!hasNonce && directives.some(d => d.includes('script-src'))) {
        issues.push('No nonce found in script-src, consider using nonce-based CSP');
    }
    
    return {
        valid: issues.length === 0,
        issues,
        directiveCount: directives.length,
        hasNonce
    };
}

async function main() {
    const testUrls = [
        'https://serenity-sober-pathways.vercel.app',
        'https://localhost:8080'
    ];
    
    console.log('🔒 Validating Content Security Policy...\n');
    
    for (const url of testUrls) {
        try {
            const result = await validateCSP(url);
            
            console.log(`URL: ${result.url}`);
            console.log(`Status: ${result.statusCode}`);
            console.log(`CSP Header Present: ${result.hasCSP ? '✅' : '❌'}`);
            console.log(`Report Only Mode: ${result.reportOnly ? '⚠️' : '✅'}`);
            
            if (result.cspHeader) {
                console.log(`Header: ${result.cspHeader.substring(0, 100)}...`);
                console.log(`Valid: ${result.analysis.valid ? '✅' : '❌'}`);
                console.log(`Has Nonce: ${result.analysis.hasNonce ? '✅' : '❌'}`);
                
                if (result.analysis.issues.length > 0) {
                    console.log('Issues:');
                    result.analysis.issues.forEach(issue => {
                        console.log(`  ❌ ${issue}`);
                    });
                }
            }
            
            console.log('---\n');
            
        } catch (error) {
            console.log(`❌ Error testing ${url}: ${error.message}\n`);
        }
    }
    
    console.log('📋 CSP Best Practices:');
    console.log('  ✓ Use nonce-based script execution');
    console.log('  ✓ Avoid unsafe-inline and unsafe-eval');
    console.log('  ✓ Use specific source lists instead of wildcards');
    console.log('  ✓ Implement CSP violation reporting');
    console.log('  ✓ Test in report-only mode first');
}

if (require.main === module) {
    main().catch(console.error);
}
"@

    $validationPath = "scripts/validate-csp.js"
    if (-not $DryRun) {
        $validationScript | Out-File -FilePath $validationPath -Encoding UTF8
        Write-CSPLog "✓ CSP validation script created" -Level 'SUCCESS'
    } else {
        Write-CSPLog "DRY RUN: Would create CSP validation script" -Level 'WARN'
    }

    # 7. Update package.json scripts
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        
        $newScripts = @{
            'security:validate-csp' = 'node scripts/validate-csp.js'
            'security:test-csp' = 'npm run dev & sleep 3 && node scripts/validate-csp.js && pkill -f vite'
        }
        
        $updated = $false
        foreach ($scriptName in $newScripts.Keys) {
            if (-not $packageJson.scripts.$scriptName) {
                $packageJson.scripts | Add-Member -NotePropertyName $scriptName -NotePropertyValue $newScripts[$scriptName]
                $updated = $true
            }
        }
        
        if ($updated -and -not $DryRun) {
            $packageJson | ConvertTo-Json -Depth 5 | Out-File -FilePath $packageJsonPath -Encoding UTF8
            Write-CSPLog "✓ Package.json updated with CSP validation scripts" -Level 'SUCCESS'
        }
    }

    Write-CSPLog "Content Security Policy setup completed successfully!" -Level 'SUCCESS'
    Write-CSPLog "Next steps:" -Level 'INFO'
    Write-CSPLog "1. Run: npm run security:validate-csp" -Level 'INFO'
    Write-CSPLog "2. Test in development: npm run security:test-csp" -Level 'INFO'
    Write-CSPLog "3. Monitor CSP violations in production" -Level 'INFO'
    
    exit 0
    
} catch {
    Write-CSPLog "Error setting up CSP: $($_.Exception.Message)" -Level 'ERROR'
    Write-CSPLog $_.ScriptStackTrace -Level 'ERROR'
    exit 1
}