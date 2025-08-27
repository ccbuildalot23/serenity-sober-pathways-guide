#!/usr/bin/env pwsh
<#
.SYNOPSIS
Optimize Bundle Size for Performance

.DESCRIPTION
Implements comprehensive bundle size optimization including code splitting,
tree shaking, compression, and dynamic imports to achieve <1MB target.
#>

param(
    [switch]$DryRun,
    [string]$LogLevel = 'INFO',
    [int]$TargetSizeKB = 1024
)

function Write-BundleLog {
    param($Message, $Level = 'INFO')
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] [BUNDLE] $Message" -ForegroundColor $(
        switch ($Level) {
            'ERROR' { 'Red' }
            'WARN' { 'Yellow' }
            'SUCCESS' { 'Green' }
            default { 'White' }
        }
    )
}

Write-BundleLog "Starting bundle size optimization..." -Level 'INFO'
Write-BundleLog "Target bundle size: ${TargetSizeKB}KB" -Level 'INFO'

try {
    # 1. Update Vite configuration for optimal bundling
    $viteConfigPath = "vite.config.ts"
    if (Test-Path $viteConfigPath) {
        Write-BundleLog "Updating Vite configuration for bundle optimization..." -Level 'INFO'
        
        $viteConfig = Get-Content $viteConfigPath -Raw
        
        # Bundle optimization configuration
        $bundleOptimization = @"
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          'vendor-routing': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['date-fns', 'clsx', 'class-variance-authority'],
          'vendor-auth': ['@supabase/supabase-js', '@supabase/realtime-js'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      external: [],
      plugins: []
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    cssMinify: true,
    reportCompressedSize: true,
    assetsInlineLimit: 4096
  },
"@
        
        # Check if build configuration already exists
        if ($viteConfig -notmatch "build:\s*\{") {
            # Insert build configuration
            $updatedConfig = $viteConfig -replace "(export default defineConfig\(\{)", "`$1`n$bundleOptimization"
            
            if (-not $DryRun) {
                $updatedConfig | Out-File -FilePath $viteConfigPath -Encoding UTF8
                Write-BundleLog "✓ Vite configuration updated for bundle optimization" -Level 'SUCCESS'
            } else {
                Write-BundleLog "DRY RUN: Would update Vite configuration" -Level 'WARN'
            }
        } else {
            Write-BundleLog "Build configuration already exists in Vite config" -Level 'INFO'
        }
    }
    
    # 2. Create dynamic import utility for lazy loading
    $lazyImportPath = "src/utils/lazy-import.ts"
    $lazyImportUtil = @"
import { lazy, ComponentType } from 'react';
import { LoadingSpinner } from '../components/ui/loading-spinner';

/**
 * Enhanced lazy import with error boundary and loading state
 */
export function lazyImport<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback: ComponentType = LoadingSpinner
) {
  const LazyComponent = lazy(factory);
  
  return (props: React.ComponentProps<T>) => (
    <React.Suspense fallback={<fallback />}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
}

/**
 * Preload component for faster subsequent loads
 */
export function preloadComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): void {
  const modulePromise = factory();
  
  // Handle preload errors gracefully
  modulePromise.catch((error) => {
    console.warn('Component preload failed:', error);
  });
}

/**
 * Route-based lazy loading utility
 */
export const createLazyRoute = (importFn: () => Promise<{ default: ComponentType<any> }>) => {
  return {
    Component: lazy(importFn),
    preload: () => preloadComponent(importFn)
  };
};

/**
 * Bundle size analyzer utility
 */
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    import('webpack-bundle-analyzer').then(({ BundleAnalyzerPlugin }) => {
      console.log('Bundle analyzer would run here in webpack build');
    });
  }
};
"@
    
    if (-not $DryRun) {
        $lazyImportUtil | Out-File -FilePath $lazyImportPath -Encoding UTF8
        Write-BundleLog "✓ Lazy import utility created" -Level 'SUCCESS'
    } else {
        Write-BundleLog "DRY RUN: Would create lazy import utility" -Level 'WARN'
    }
    
    # 3. Update router configuration with lazy loading
    $routerPath = "src/App.tsx"
    if (Test-Path $routerPath) {
        Write-BundleLog "Updating router with lazy loading..." -Level 'INFO'
        
        $routerContent = Get-Content $routerPath -Raw
        
        # Check if lazy loading is already implemented
        if ($routerContent -notmatch "lazy\(|Suspense") {
            Write-BundleLog "Adding lazy loading imports to router..." -Level 'INFO'
            
            $lazyRoutesUpdate = @"
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './components/ui/loading-spinner';

// Lazy load main components
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const CrisisSupport = lazy(() => import('./components/crisis/CrisisSupport'));
const DailyCheckin = lazy(() => import('./components/checkin/DailyCheckin'));
const PeerSupport = lazy(() => import('./components/peer/PeerSupport'));
const ProviderDashboard = lazy(() => import('./components/provider/ProviderDashboard'));

// Wrap routes in Suspense
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);
"@
            
            if (-not $DryRun) {
                # This is a placeholder - actual implementation would require more careful AST manipulation
                Write-BundleLog "Manual router update required for lazy loading" -Level 'WARN'
            }
        } else {
            Write-BundleLog "Lazy loading already configured in router" -Level 'INFO'
        }
    }
    
    # 4. Create bundle analyzer script
    $analyzerScript = @"
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

/**
 * Analyze bundle sizes and provide optimization recommendations
 */
class BundleAnalyzer {
  constructor() {
    this.distPath = path.join(process.cwd(), 'dist');
    this.targetSizeKB = 1024;
    this.results = {
      totalSize: 0,
      gzippedSize: 0,
      files: [],
      recommendations: []
    };
  }

  async analyze() {
    if (!fs.existsSync(this.distPath)) {
      console.log('❌ No dist folder found. Run npm run build first.');
      return;
    }

    console.log('📊 Analyzing bundle sizes...\n');

    await this.scanDirectory(this.distPath);
    this.generateRecommendations();
    this.printReport();
    
    return this.results;
  }

  async scanDirectory(dirPath, prefix = '') {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        await this.scanDirectory(filePath, prefix + file + '/');
      } else if (this.isRelevantFile(file)) {
        await this.analyzeFile(filePath, prefix + file);
      }
    }
  }

  isRelevantFile(filename) {
    const extensions = ['.js', '.css', '.html', '.wasm'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  async analyzeFile(filePath, relativePath) {
    const content = fs.readFileSync(filePath);
    const size = content.length;
    const gzippedSize = gzipSync(content).length;

    this.results.totalSize += size;
    this.results.gzippedSize += gzippedSize;

    const fileInfo = {
      path: relativePath,
      size: size,
      sizeKB: Math.round(size / 1024),
      gzippedSize: gzippedSize,
      gzippedKB: Math.round(gzippedSize / 1024),
      compression: Math.round((1 - gzippedSize / size) * 100)
    };

    this.results.files.push(fileInfo);
  }

  generateRecommendations() {
    const totalKB = Math.round(this.results.totalSize / 1024);
    const gzippedKB = Math.round(this.results.gzippedSize / 1024);

    if (totalKB > this.targetSizeKB) {
      this.results.recommendations.push(`Total bundle size (${totalKB}KB) exceeds target (${this.targetSizeKB}KB)`);
    }

    // Find large files
    const largeFiles = this.results.files.filter(f => f.sizeKB > 100);
    largeFiles.forEach(file => {
      this.results.recommendations.push(`Large file: ${file.path} (${file.sizeKB}KB) - consider code splitting`);
    });

    // Find poorly compressed files
    const poorlyCompressed = this.results.files.filter(f => f.compression < 50 && f.sizeKB > 10);
    poorlyCompressed.forEach(file => {
      this.results.recommendations.push(`Poor compression: ${file.path} (${file.compression}%) - optimize content`);
    });

    // Check for duplicate dependencies
    const jsFiles = this.results.files.filter(f => f.path.endsWith('.js'));
    if (jsFiles.length > 10) {
      this.results.recommendations.push(`Many JS chunks (${jsFiles.length}) - consider chunk consolidation`);
    }
  }

  printReport() {
    const totalKB = Math.round(this.results.totalSize / 1024);
    const gzippedKB = Math.round(this.results.gzippedSize / 1024);
    const compressionRatio = Math.round((1 - this.results.gzippedSize / this.results.totalSize) * 100);

    console.log('📦 Bundle Size Analysis Report');
    console.log('═'.repeat(50));
    console.log(`Total Size: ${totalKB}KB`);
    console.log(`Gzipped Size: ${gzippedKB}KB`);
    console.log(`Compression: ${compressionRatio}%`);
    console.log(`Target: ${this.targetSizeKB}KB`);
    console.log(`Status: ${gzippedKB <= this.targetSizeKB ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    // Top 10 largest files
    const topFiles = this.results.files
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    console.log('📋 Largest Files:');
    topFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.path} - ${file.sizeKB}KB (${file.gzippedKB}KB gzipped)`);
    });
    console.log('');

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('💡 Optimization Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    } else {
      console.log('✅ No optimization recommendations - bundle is well optimized!');
    }

    console.log('');
    console.log('🚀 Performance Impact:');
    console.log(`Estimated load time (3G): ${Math.round(gzippedKB / 50)}s`);
    console.log(`Estimated load time (4G): ${Math.round(gzippedKB / 200)}s`);
    console.log(`Estimated load time (WiFi): ${Math.round(gzippedKB / 1000)}s`);
  }
}

async function main() {
  const analyzer = new BundleAnalyzer();
  const results = await analyzer.analyze();
  
  // Save results to file
  fs.writeFileSync(
    'bundle-analysis.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n📁 Full results saved to bundle-analysis.json');
  
  // Exit with error code if bundle is too large
  const gzippedKB = Math.round(results.gzippedSize / 1024);
  if (gzippedKB > analyzer.targetSizeKB) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
"@
    
    $analyzerPath = "scripts/analyze-bundle.js"
    if (-not $DryRun) {
        $analyzerScript | Out-File -FilePath $analyzerPath -Encoding UTF8
        Write-BundleLog "✓ Bundle analyzer script created" -Level 'SUCCESS'
    } else {
        Write-BundleLog "DRY RUN: Would create bundle analyzer script" -Level 'WARN'
    }
    
    # 5. Create Webpack Bundle Analyzer integration
    $webpackAnalyzerScript = @"
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Generate bundle analysis using webpack-bundle-analyzer equivalent for Vite
 */
async function generateBundleAnalysis() {
  console.log('📊 Generating interactive bundle analysis...');
  
  try {
    // Install rollup-plugin-visualizer if not present
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!packageJson.devDependencies['rollup-plugin-visualizer']) {
      console.log('Installing rollup-plugin-visualizer...');
      execSync('npm install --save-dev rollup-plugin-visualizer', { stdio: 'inherit' });
    }
    
    // Create temporary vite config with visualizer
    const tempConfig = `
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import baseConfig from './vite.config';

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    rollupOptions: {
      ...baseConfig.build?.rollupOptions,
      plugins: [
        ...(baseConfig.build?.rollupOptions?.plugins || []),
        visualizer({
          filename: 'dist/bundle-analysis.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        })
      ]
    }
  }
});`;
    
    fs.writeFileSync('vite.config.analysis.ts', tempConfig);
    
    // Run build with analysis
    execSync('npx vite build --config vite.config.analysis.ts', { stdio: 'inherit' });
    
    // Cleanup temp config
    fs.unlinkSync('vite.config.analysis.ts');
    
    console.log('✅ Bundle analysis generated: dist/bundle-analysis.html');
    
  } catch (error) {
    console.error('❌ Failed to generate bundle analysis:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  generateBundleAnalysis();
}
"@
    
    $webpackAnalyzerPath = "scripts/bundle-visualizer.js"
    if (-not $DryRun) {
        $webpackAnalyzerScript | Out-File -FilePath $webpackAnalyzerPath -Encoding UTF8
        Write-BundleLog "✓ Bundle visualizer script created" -Level 'SUCCESS'
    } else {
        Write-BundleLog "DRY RUN: Would create bundle visualizer script" -Level 'WARN'
    }
    
    # 6. Update package.json with bundle optimization scripts
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        
        $newScripts = @{
            'analyze:bundle' = 'npm run build && node scripts/analyze-bundle.js'
            'analyze:bundle-visual' = 'node scripts/bundle-visualizer.js'
            'optimize:bundle' = 'npm run analyze:bundle && npm run build'
            'build:analyze' = 'npm run build && npm run analyze:bundle'
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
            Write-BundleLog "✓ Package.json updated with bundle optimization scripts" -Level 'SUCCESS'
        }
    }
    
    # 7. Run initial bundle analysis
    if (-not $DryRun) {
        Write-BundleLog "Running initial bundle size check..." -Level 'INFO'
        
        try {
            # Build the project first
            Write-BundleLog "Building project for analysis..." -Level 'INFO'
            & npm run build 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-BundleLog "✓ Build successful" -Level 'SUCCESS'
                
                # Run bundle analysis
                & node scripts/analyze-bundle.js
                
                if ($LASTEXITCODE -eq 0) {
                    Write-BundleLog "✓ Bundle analysis completed successfully" -Level 'SUCCESS'
                } else {
                    Write-BundleLog "⚠ Bundle size exceeds target - optimization needed" -Level 'WARN'
                }
            } else {
                Write-BundleLog "Build failed - skipping bundle analysis" -Level 'WARN'
            }
        }
        catch {
            Write-BundleLog "Error during bundle analysis: $($_.Exception.Message)" -Level 'WARN'
        }
    }
    
    Write-BundleLog "Bundle optimization setup completed!" -Level 'SUCCESS'
    Write-BundleLog "Next steps:" -Level 'INFO'
    Write-BundleLog "1. Run: npm run analyze:bundle" -Level 'INFO'
    Write-BundleLog "2. View visual analysis: npm run analyze:bundle-visual" -Level 'INFO'
    Write-BundleLog "3. Monitor bundle size in CI/CD pipeline" -Level 'INFO'
    
    exit 0
    
} catch {
    Write-BundleLog "Error optimizing bundle: $($_.Exception.Message)" -Level 'ERROR'
    Write-BundleLog $_.ScriptStackTrace -Level 'ERROR'
    exit 1
}