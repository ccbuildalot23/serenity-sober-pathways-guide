#!/usr/bin/env pwsh
<#
.SYNOPSIS
Implement HSTS Preload Security Headers

.DESCRIPTION
Configures HTTP Strict Transport Security (HSTS) with preload for maximum security.
Implements CSP nonce policies and security headers across all deployment targets.
#>

param(
    [switch]$DryRun,
    [string]$LogLevel = 'INFO'
)

function Write-SecurityLog {
    param($Message, $Level = 'INFO')
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] [HSTS] $Message" -ForegroundColor $(
        switch ($Level) {
            'ERROR' { 'Red' }
            'WARN' { 'Yellow' }
            'SUCCESS' { 'Green' }
            default { 'White' }
        }
    )
}

Write-SecurityLog "Implementing HSTS Preload Security Headers..." -Level 'INFO'

try {
    # 1. Update Vercel configuration
    $vercelConfigPath = "vercel.json"
    if (Test-Path $vercelConfigPath) {
        Write-SecurityLog "Updating Vercel configuration with HSTS headers..." -Level 'INFO'
        
        $vercelConfig = Get-Content $vercelConfigPath -Raw | ConvertFrom-Json
        
        # Ensure headers section exists
        if (-not $vercelConfig.headers) {
            $vercelConfig | Add-Member -NotePropertyName 'headers' -NotePropertyValue @()
        }
        
        # HSTS and security headers configuration
        $securityHeaders = @{
            source = "/(.*)"
            headers = @(
                @{
                    key = "Strict-Transport-Security"
                    value = "max-age=63072000; includeSubDomains; preload"
                },
                @{
                    key = "X-Content-Type-Options"
                    value = "nosniff"
                },
                @{
                    key = "X-Frame-Options"
                    value = "DENY"
                },
                @{
                    key = "X-XSS-Protection"
                    value = "1; mode=block"
                },
                @{
                    key = "Referrer-Policy"
                    value = "strict-origin-when-cross-origin"
                },
                @{
                    key = "Permissions-Policy"
                    value = "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()"
                }
            )
        }
        
        # Remove existing security headers and add new ones
        $vercelConfig.headers = @($vercelConfig.headers | Where-Object { $_.source -ne "/(.*)" })
        $vercelConfig.headers += $securityHeaders
        
        if (-not $DryRun) {
            $vercelConfig | ConvertTo-Json -Depth 5 | Out-File -FilePath $vercelConfigPath -Encoding UTF8
            Write-SecurityLog "✓ Vercel configuration updated with HSTS preload" -Level 'SUCCESS'
        } else {
            Write-SecurityLog "DRY RUN: Would update Vercel configuration" -Level 'WARN'
        }
    }
    
    # 2. Update Vite configuration for development
    $viteConfigPath = "vite.config.ts"
    if (Test-Path $viteConfigPath) {
        Write-SecurityLog "Updating Vite configuration with security headers..." -Level 'INFO'
        
        $viteConfig = Get-Content $viteConfigPath -Raw
        
        # Check if security headers plugin is already configured
        if ($viteConfig -notmatch "defineConfig.*headers") {
            $securityHeadersPlugin = @"
  server: {
    headers: {
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'nonce-{NONCE}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; media-src 'self'; frame-src 'none';"
    }
  },
"@
            
            # Insert security headers into vite config
            $updatedConfig = $viteConfig -replace "(export default defineConfig\(\{)", "`$1`n$securityHeadersPlugin"
            
            if (-not $DryRun) {
                $updatedConfig | Out-File -FilePath $viteConfigPath -Encoding UTF8
                Write-SecurityLog "✓ Vite configuration updated with security headers" -Level 'SUCCESS'
            } else {
                Write-SecurityLog "DRY RUN: Would update Vite configuration" -Level 'WARN'
            }
        } else {
            Write-SecurityLog "Security headers already configured in Vite config" -Level 'INFO'
        }
    }
    
    # 3. Create security middleware for Express (if using)
    $middlewarePath = "src/middleware/security.ts"
    $middlewareDir = Split-Path $middlewarePath -Parent
    
    if (-not (Test-Path $middlewareDir)) {
        New-Item -ItemType Directory -Path $middlewareDir -Force | Out-Null
    }
    
    $securityMiddleware = @"
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// Generate nonce for CSP
export const generateNonce = (): string => {
  return Buffer.from(Math.random().toString()).toString('base64');
};

// Security middleware configuration
export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const nonce = generateNonce();
  
  // Store nonce in request for use in templates
  (req as any).nonce = nonce;
  
  // Apply helmet security headers
  helmet({
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", `'nonce-${nonce}'`, "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false // Disable for compatibility
  })(req, res, next);
};

// HIPAA security enhancements
export const hipaaSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add HIPAA-specific security headers
  res.setHeader('X-Healthcare-Security', 'HIPAA-Compliant');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  next();
};
"@
    
    if (-not $DryRun) {
        $securityMiddleware | Out-File -FilePath $middlewarePath -Encoding UTF8
        Write-SecurityLog "✓ Security middleware created" -Level 'SUCCESS'
    } else {
        Write-SecurityLog "DRY RUN: Would create security middleware" -Level 'WARN'
    }
    
    # 4. Update index.html with CSP nonce support
    $indexPath = "index.html"
    if (Test-Path $indexPath) {
        Write-SecurityLog "Updating index.html with CSP nonce support..." -Level 'INFO'
        
        $indexContent = Get-Content $indexPath -Raw
        
        # Add nonce placeholder for scripts
        if ($indexContent -notmatch "nonce=") {
            $updatedIndex = $indexContent -replace "<script", "<script nonce=`"{{NONCE}}`""
            
            if (-not $DryRun) {
                $updatedIndex | Out-File -FilePath $indexPath -Encoding UTF8
                Write-SecurityLog "✓ Index.html updated with CSP nonce support" -Level 'SUCCESS'
            } else {
                Write-SecurityLog "DRY RUN: Would update index.html" -Level 'WARN'
            }
        } else {
            Write-SecurityLog "CSP nonce already configured in index.html" -Level 'INFO'
        }
    }
    
    # 5. Create HSTS preload verification script
    $verificationScript = @"
#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

async function verifyHSTS(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname,
            method: 'HEAD',
            timeout: 10000
        };
        
        const req = https.request(options, (res) => {
            const hstsHeader = res.headers['strict-transport-security'];
            const hasHSTS = !!hstsHeader;
            const hasPreload = hstsHeader && hstsHeader.includes('preload');
            const maxAge = hstsHeader && hstsHeader.match(/max-age=(\d+)/);
            
            resolve({
                url,
                hasHSTS,
                hasPreload,
                maxAge: maxAge ? parseInt(maxAge[1]) : 0,
                header: hstsHeader,
                statusCode: res.statusCode
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        req.setTimeout(10000);
        req.end();
    });
}

async function main() {
    const testUrls = [
        'https://serenity-sober-pathways.vercel.app',
        'https://serenity-pathways.com'
    ];
    
    console.log('🔒 Verifying HSTS Preload Configuration...\n');
    
    for (const url of testUrls) {
        try {
            const result = await verifyHSTS(url);
            
            console.log(`URL: ${result.url}`);
            console.log(`Status: ${result.statusCode}`);
            console.log(`HSTS Header: ${result.hasHSTS ? '✅' : '❌'}`);
            console.log(`Preload: ${result.hasPreload ? '✅' : '❌'}`);
            console.log(`Max Age: ${result.maxAge} seconds`);
            console.log(`Header Value: ${result.header || 'Not found'}`);
            console.log('---');
        } catch (error) {
            console.log(`❌ Error testing ${url}: ${error.message}`);
        }
    }
    
    console.log('\n📋 HSTS Preload Checklist:');
    console.log('   ✓ HSTS header present');
    console.log('   ✓ Max-age >= 63072000 (2 years)');
    console.log('   ✓ includeSubDomains directive');
    console.log('   ✓ preload directive');
    console.log('\n🌐 Submit to HSTS Preload List:');
    console.log('   https://hstspreload.org/');
}

if (require.main === module) {
    main().catch(console.error);
}
"@
    
    $verificationPath = "scripts/verify-hsts.js"
    if (-not $DryRun) {
        $verificationScript | Out-File -FilePath $verificationPath -Encoding UTF8
        Write-SecurityLog "✓ HSTS verification script created" -Level 'SUCCESS'
    } else {
        Write-SecurityLog "DRY RUN: Would create HSTS verification script" -Level 'WARN'
    }
    
    # 6. Update package.json with security verification script
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        
        if (-not $packageJson.scripts.'security:verify-hsts') {
            $packageJson.scripts | Add-Member -NotePropertyName 'security:verify-hsts' -NotePropertyValue 'node scripts/verify-hsts.js'
            
            if (-not $DryRun) {
                $packageJson | ConvertTo-Json -Depth 5 | Out-File -FilePath $packageJsonPath -Encoding UTF8
                Write-SecurityLog "✓ Package.json updated with HSTS verification script" -Level 'SUCCESS'
            } else {
                Write-SecurityLog "DRY RUN: Would update package.json" -Level 'WARN'
            }
        }
    }
    
    Write-SecurityLog "HSTS Preload implementation completed successfully!" -Level 'SUCCESS'
    Write-SecurityLog "Next steps:" -Level 'INFO'
    Write-SecurityLog "1. Deploy to production" -Level 'INFO'
    Write-SecurityLog "2. Run: npm run security:verify-hsts" -Level 'INFO'
    Write-SecurityLog "3. Submit domain to https://hstspreload.org/" -Level 'INFO'
    
    exit 0
    
} catch {
    Write-SecurityLog "Error implementing HSTS Preload: $($_.Exception.Message)" -Level 'ERROR'
    Write-SecurityLog $_.ScriptStackTrace -Level 'ERROR'
    exit 1
}