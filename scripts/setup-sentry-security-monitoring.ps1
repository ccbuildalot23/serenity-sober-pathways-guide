# Sentry Security Monitoring Setup Script for Serenity Sober Pathways
# HIPAA-compliant error tracking and security event monitoring

param(
    [Parameter(Mandatory = $false)]
    [string]$Environment = "development",
    
    [Parameter(Mandatory = $false)]
    [string]$SentryDsn = "",
    
    [Parameter(Mandatory = $false)]
    [switch]$SetupProject = $false,
    
    [Parameter(Mandatory = $false)]
    [switch]$TestMode = $false
)

Write-Host "Sentry Security Monitoring Setup for Serenity Sober Pathways" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Setup New Project: $SetupProject" -ForegroundColor Yellow

# Function to install Sentry dependencies
function Install-SentryDependencies {
    Write-Host "Installing Sentry dependencies..." -ForegroundColor Yellow
    
    $dependencies = @(
        "@sentry/node@^7.81.1",
        "@sentry/react@^7.81.1",
        "@sentry/tracing@^7.81.1",
        "@sentry/integrations@^7.81.1"
    )
    
    foreach ($dep in $dependencies) {
        Write-Host "Installing: $dep" -ForegroundColor Gray
        npm install $dep 2>$null
    }
    
    Write-Host "Sentry dependencies installed successfully!" -ForegroundColor Green
}

# Function to create Sentry project setup
function Setup-SentryProject {
    Write-Host "Sentry Project Setup Instructions:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Visit https://sentry.io/ and create an account" -ForegroundColor White
    Write-Host "2. Create a new project:" -ForegroundColor White
    Write-Host "   - Platform: Node.js" -ForegroundColor Gray
    Write-Host "   - Project name: serenity-sober-pathways" -ForegroundColor Gray
    Write-Host "   - Team: Your organization" -ForegroundColor Gray
    Write-Host "3. Copy the DSN from the project settings" -ForegroundColor White
    Write-Host "4. Configure HIPAA-compliant data scrubbing:" -ForegroundColor White
    Write-Host "   - Go to Settings > Security & Privacy" -ForegroundColor Gray
    Write-Host "   - Enable 'Scrub Data'" -ForegroundColor Gray
    Write-Host "   - Add PHI-related keywords to scrubbing rules" -ForegroundColor Gray
    Write-Host "5. Set up alerts and notifications" -ForegroundColor White
    Write-Host ""
    
    if (-not $TestMode) {
        $openBrowser = Read-Host "Open Sentry signup page? (y/N)"
        if ($openBrowser -eq 'y' -or $openBrowser -eq 'Y') {
            Start-Process "https://sentry.io/"
        }
    }
}

# Function to create Sentry configuration
function Create-SentryConfig {
    $configPath = "src/config/sentry.ts"
    $configDir = Split-Path $configPath -Parent
    
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    $configContent = @"
import * as Sentry from '@sentry/node';
import { CaptureConsole, ExtraErrorData } from '@sentry/integrations';

// HIPAA-compliant Sentry configuration
export function initializeSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // HIPAA-compliant integrations
    integrations: [
      // Capture console errors
      new CaptureConsole({
        levels: ['error', 'warn']
      }),
      
      // Enhanced error details
      new ExtraErrorData({
        depth: 6
      }),
      
      // HTTP request tracing
      new Sentry.Integrations.Http({
        tracing: true,
        breadcrumbs: true
      })
    ],
    
    // Data scrubbing for PHI compliance
    beforeSend(event, hint) {
      return scrubPHIData(event, hint);
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      return scrubBreadcrumbPHI(breadcrumb, hint);
    },
    
    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
    
    // User context filtering
    beforeSendTransaction(transaction) {
      return scrubTransactionPHI(transaction);
    }
  });
}

// PHI data scrubbing function
function scrubPHIData(event: any, hint?: any): any | null {
  if (!event) return null;
  
  // Remove sensitive headers
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
    delete event.request.headers['x-api-key'];
  }
  
  // Remove sensitive query parameters
  if (event.request?.query_string) {
    event.request.query_string = event.request.query_string.replace(
      /(token|key|password|ssn|dob|phone|email)=[^&]*/gi,
      '$1=[REDACTED]'
    );
  }
  
  // Scrub user data
  if (event.user) {
    event.user = {
      id: event.user.id ? hashId(event.user.id) : undefined,
      ip_address: event.user.ip_address ? anonymizeIP(event.user.ip_address) : undefined
    };
  }
  
  // Remove PHI from extra data
  if (event.extra) {
    event.extra = scrubObjectPHI(event.extra);
  }
  
  // Remove PHI from tags
  if (event.tags) {
    event.tags = scrubObjectPHI(event.tags);
  }
  
  // Scrub exception data
  if (event.exception?.values) {
    event.exception.values.forEach((exception: any) => {
      if (exception.stacktrace?.frames) {
        exception.stacktrace.frames.forEach((frame: any) => {
          if (frame.vars) {
            frame.vars = scrubObjectPHI(frame.vars);
          }
        });
      }
    });
  }
  
  return event;
}

// Breadcrumb PHI scrubbing
function scrubBreadcrumbPHI(breadcrumb: any, hint?: any): any | null {
  if (!breadcrumb) return null;
  
  // Remove sensitive data from HTTP breadcrumbs
  if (breadcrumb.category === 'http') {
    if (breadcrumb.data?.url) {
      breadcrumb.data.url = breadcrumb.data.url.replace(
        /(token|key|password|ssn|dob|phone|email)=[^&]*/gi,
        '$1=[REDACTED]'
      );
    }
    
    if (breadcrumb.data?.data) {
      breadcrumb.data.data = scrubObjectPHI(breadcrumb.data.data);
    }
  }
  
  // Remove sensitive console logs
  if (breadcrumb.category === 'console') {
    breadcrumb.message = scrubStringPHI(breadcrumb.message || '');
  }
  
  return breadcrumb;
}

// Transaction PHI scrubbing
function scrubTransactionPHI(transaction: any): any | null {
  if (!transaction) return null;
  
  // Remove sensitive data from transaction name
  if (transaction.transaction) {
    transaction.transaction = scrubStringPHI(transaction.transaction);
  }
  
  return transaction;
}

// Object PHI scrubbing utility
function scrubObjectPHI(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const scrubbed = { ...obj };
  const sensitiveKeys = [
    'password', 'ssn', 'social_security_number', 'dob', 'date_of_birth',
    'phone', 'phone_number', 'email', 'medical_record_number', 'mrn',
    'diagnosis', 'medication', 'treatment', 'therapy', 'session_notes',
    'crisis_notes', 'assessment', 'billing', 'insurance', 'address',
    'emergency_contact', 'next_of_kin', 'guardian'
  ];
  
  Object.keys(scrubbed).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof scrubbed[key] === 'object') {
      scrubbed[key] = scrubObjectPHI(scrubbed[key]);
    } else if (typeof scrubbed[key] === 'string') {
      scrubbed[key] = scrubStringPHI(scrubbed[key]);
    }
  });
  
  return scrubbed;
}

// String PHI scrubbing utility
function scrubStringPHI(str: string): string {
  if (!str || typeof str !== 'string') return str;
  
  return str
    // Email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    // Phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    // SSN patterns
    .replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, '[SSN]')
    // Date patterns that might be DOB
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '[DATE]')
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, '[DATE]');
}

// ID hashing utility
function hashId(id: string): string {
  // Simple hash for user ID anonymization
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `user_${Math.abs(hash).toString(36)}`;
}

// IP anonymization utility
function anonymizeIP(ip: string): string {
  if (ip.includes(':')) {
    // IPv6 - zero out last 80 bits
    return ip.split(':').slice(0, 2).join(':') + '::0000:0000:0000:0000';
  } else {
    // IPv4 - zero out last octet
    return ip.split('.').slice(0, 3).join('.') + '.0';
  }
}

// Security event tracking
export function trackSecurityEvent(
  event: string,
  details: any,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  Sentry.addBreadcrumb({
    message: `Security Event: ${event}`,
    category: 'security',
    level: severity === 'critical' ? 'error' : 'warning',
    data: scrubObjectPHI(details)
  });
  
  if (severity === 'critical' || severity === 'high') {
    Sentry.captureMessage(`Security Event: ${event}`, {
      level: severity === 'critical' ? 'error' : 'warning',
      tags: {
        security: true,
        event_type: event,
        severity
      },
      extra: scrubObjectPHI(details)
    });
  }
}

// Performance tracking
export function trackPerformance(operation: string, duration: number) {
  Sentry.addBreadcrumb({
    message: `Performance: ${operation}`,
    category: 'performance',
    level: 'info',
    data: { duration }
  });
  
  // Alert on slow operations
  if (duration > 5000) { // 5 seconds
    Sentry.captureMessage(`Slow Operation: ${operation}`, {
      level: 'warning',
      tags: {
        performance: true,
        operation,
        slow: true
      },
      extra: { duration }
    });
  }
}

export { Sentry };
"@
    
    Set-Content -Path $configPath -Value $configContent
    Write-Host "Created Sentry configuration at: $configPath" -ForegroundColor Green
}

# Function to create React Sentry configuration
function Create-ReactSentryConfig {
    $reactConfigPath = "src/config/sentry-react.ts"
    $reactConfigDir = Split-Path $reactConfigPath -Parent
    
    if (-not (Test-Path $reactConfigDir)) {
        New-Item -ItemType Directory -Path $reactConfigDir -Force | Out-Null
    }
    
    $reactConfigContent = @"
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// React/Browser Sentry configuration
export function initializeReactSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    integrations: [
      new BrowserTracing({
        // Capture interactions and navigation
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
    ],
    
    // Data scrubbing for PHI compliance
    beforeSend(event, hint) {
      return scrubClientPHIData(event, hint);
    },
    
    // Release tracking
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || import.meta.env.VITE_APP_VERSION,
    
    // Ignore common non-critical errors
    ignoreErrors: [
      // Network errors
      'NetworkError',
      'ChunkLoadError',
      'Loading chunk',
      'Loading CSS chunk',
      
      // Browser extension errors
      'Script error',
      'Non-Error promise rejection captured',
      
      // Common React errors that aren't actionable
      'ResizeObserver loop limit exceeded',
    ],
    
    // Ignore URLs that shouldn't be tracked
    ignoreTransactions: [
      '/health',
      '/favicon.ico',
      '/robots.txt'
    ]
  });
}

// Client-side PHI data scrubbing
function scrubClientPHIData(event: any, hint?: any): any | null {
  if (!event) return null;
  
  // Remove sensitive form data
  if (event.request?.data) {
    event.request.data = scrubFormData(event.request.data);
  }
  
  // Remove sensitive URLs
  if (event.request?.url) {
    event.request.url = scrubUrlPHI(event.request.url);
  }
  
  // Scrub user context
  if (event.user) {
    event.user = {
      id: event.user.id ? hashClientId(event.user.id) : undefined,
    };
  }
  
  // Remove PHI from breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => ({
      ...breadcrumb,
      message: scrubStringPHI(breadcrumb.message || ''),
      data: breadcrumb.data ? scrubObjectPHI(breadcrumb.data) : undefined
    }));
  }
  
  return event;
}

// Form data scrubbing
function scrubFormData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const scrubbed = { ...data };
  const sensitiveFields = [
    'password', 'ssn', 'social_security', 'dob', 'date_of_birth',
    'phone', 'email', 'medical_record', 'diagnosis', 'medication',
    'crisis_details', 'session_notes', 'assessment_data'
  ];
  
  Object.keys(scrubbed).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      scrubbed[key] = '[REDACTED]';
    }
  });
  
  return scrubbed;
}

// URL PHI scrubbing
function scrubUrlPHI(url: string): string {
  if (!url) return url;
  
  return url
    .replace(/([?&])(email|phone|ssn|dob)=[^&]*/gi, '$1$2=[REDACTED]')
    .replace(/\/patient\/\d+/gi, '/patient/[ID]')
    .replace(/\/user\/[^/]+/gi, '/user/[ID]');
}

// Client-side ID hashing
function hashClientId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `client_${Math.abs(hash).toString(36)}`;
}

// Client-side object PHI scrubbing
function scrubObjectPHI(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const scrubbed = { ...obj };
  const sensitiveKeys = [
    'password', 'ssn', 'dob', 'phone', 'email', 'medical',
    'diagnosis', 'medication', 'crisis', 'assessment'
  ];
  
  Object.keys(scrubbed).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof scrubbed[key] === 'object') {
      scrubbed[key] = scrubObjectPHI(scrubbed[key]);
    }
  });
  
  return scrubbed;
}

// String PHI scrubbing (simplified for client-side)
function scrubStringPHI(str: string): string {
  if (!str || typeof str !== 'string') return str;
  
  return str
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, '[SSN]');
}

export { Sentry };
"@
    
    Set-Content -Path $reactConfigPath -Value $reactConfigContent
    Write-Host "Created React Sentry configuration at: $reactConfigPath" -ForegroundColor Green
}

# Function to create environment configuration
function Create-SentryEnvironmentConfig {
    $envExamplePath = ".env.example"
    
    # Read existing content
    $existingContent = ""
    if (Test-Path $envExamplePath) {
        $existingContent = Get-Content $envExamplePath -Raw
    }
    
    $sentryEnvContent = @"

# Sentry Configuration
SENTRY_DSN=https://your-dsn@your-org.ingest.sentry.io/your-project-id
VITE_SENTRY_DSN=https://your-dsn@your-org.ingest.sentry.io/your-project-id

# Sentry Environment
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=1.0.0

# Performance Monitoring
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0
"@
    
    if (-not $existingContent.Contains("# Sentry Configuration")) {
        $newContent = $existingContent + $sentryEnvContent
        Set-Content -Path $envExamplePath -Value $newContent
        Write-Host "Updated .env.example with Sentry configuration" -ForegroundColor Green
        
        if (-not (Test-Path ".env")) {
            Set-Content -Path ".env" -Value $newContent
            Write-Host "Created .env file with Sentry configuration" -ForegroundColor Green
        }
    }
}

# Function to create Sentry error boundary
function Create-SentryErrorBoundary {
    $errorBoundaryPath = "src/components/SentryErrorBoundary.tsx"
    $errorBoundaryDir = Split-Path $errorBoundaryPath -Parent
    
    if (-not (Test-Path $errorBoundaryDir)) {
        New-Item -ItemType Directory -Path $errorBoundaryDir -Force | Out-Null
    }
    
    $errorBoundaryContent = @"
import React from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<any>;
  showDialog?: boolean;
}

// HIPAA-compliant error boundary with Sentry integration
const SentryErrorBoundary: React.FC<Props> = ({ 
  children, 
  fallback: FallbackComponent,
  showDialog = false 
}) => {
  return (
    <Sentry.ErrorBoundary
      fallback={FallbackComponent || DefaultErrorFallback}
      beforeCapture={(scope, error, errorInfo) => {
        // Add context without PHI
        scope.setTag('errorBoundary', true);
        scope.setContext('errorInfo', {
          componentStack: errorInfo?.componentStack ? '[REDACTED]' : undefined
        });
      }}
      showDialog={showDialog}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({
  error,
  resetError
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Something went wrong
            </h3>
          </div>
        </div>
        <div className="text-sm text-red-700 mb-4">
          We're sorry, but something unexpected happened. The error has been logged and our team has been notified.
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Refresh Page
          </button>
          <button
            onClick={resetError}
            className="bg-red-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default SentryErrorBoundary;
"@
    
    Set-Content -Path $errorBoundaryPath -Value $errorBoundaryContent
    Write-Host "Created Sentry error boundary at: $errorBoundaryPath" -ForegroundColor Green
}

# Function to create Sentry performance monitoring
function Create-SentryPerformanceMonitoring {
    $perfMonitorPath = "src/utils/performance-monitoring.ts"
    $perfMonitorDir = Split-Path $perfMonitorPath -Parent
    
    if (-not (Test-Path $perfMonitorDir)) {
        New-Item -ItemType Directory -Path $perfMonitorDir -Force | Out-Null
    }
    
    $perfMonitorContent = @"
import * as Sentry from '@sentry/react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static transactions = new Map<string, any>();

  // Start a performance transaction
  static startTransaction(name: string, operation: string): string {
    const transactionId = `${name}-${Date.now()}`;
    const transaction = Sentry.startTransaction({
      name,
      op: operation,
      tags: {
        section: 'performance'
      }
    });
    
    this.transactions.set(transactionId, transaction);
    return transactionId;
  }

  // Finish a performance transaction
  static finishTransaction(transactionId: string, status?: string): void {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      if (status) {
        transaction.setStatus(status);
      }
      transaction.finish();
      this.transactions.delete(transactionId);
    }
  }

  // Track API call performance
  static trackApiCall(url: string, method: string): string {
    return this.startTransaction(
      `API ${method} ${this.sanitizeUrl(url)}`,
      'http.client'
    );
  }

  // Track component render performance
  static trackComponentRender(componentName: string): string {
    return this.startTransaction(
      `Component ${componentName}`,
      'react.render'
    );
  }

  // Track database query performance
  static trackDatabaseQuery(query: string): string {
    return this.startTransaction(
      `DB Query`,
      'db.query'
    );
  }

  // Track user interaction performance
  static trackUserInteraction(action: string): string {
    return this.startTransaction(
      `User ${action}`,
      'user.interaction'
    );
  }

  // Sanitize URL to remove PHI
  private static sanitizeUrl(url: string): string {
    return url
      .replace(/\/patient\/[^/]+/gi, '/patient/[ID]')
      .replace(/\/user\/[^/]+/gi, '/user/[ID]')
      .replace(/[?&](email|phone|ssn)=[^&]*/gi, '&$1=[REDACTED]');
  }
}

// React hook for performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  React.useEffect(() => {
    const transactionId = PerformanceMonitor.trackComponentRender(componentName);
    
    return () => {
      PerformanceMonitor.finishTransaction(transactionId);
    };
  }, [componentName]);
}

// HOC for automatic performance monitoring
export function withPerformanceMonitoring<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string
) {
  const WithPerformanceMonitoring: React.FC<T> = (props) => {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name;
    usePerformanceMonitoring(name);
    
    return <WrappedComponent {...props} />;
  };
  
  WithPerformanceMonitoring.displayName = `withPerformanceMonitoring(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithPerformanceMonitoring;
}

// API call monitoring wrapper
export async function monitoredApiCall<T>(
  url: string,
  options: RequestInit,
  apiCall: () => Promise<T>
): Promise<T> {
  const transactionId = PerformanceMonitor.trackApiCall(url, options.method || 'GET');
  
  try {
    const result = await apiCall();
    PerformanceMonitor.finishTransaction(transactionId, 'ok');
    return result;
  } catch (error) {
    PerformanceMonitor.finishTransaction(transactionId, 'internal_error');
    throw error;
  }
}
"@
    
    Set-Content -Path $perfMonitorPath -Value $perfMonitorContent
    Write-Host "Created performance monitoring utilities at: $perfMonitorPath" -ForegroundColor Green
}

# Function to test Sentry setup
function Test-SentrySetup {
    Write-Host "Testing Sentry setup..." -ForegroundColor Yellow
    
    # Check if required files exist
    $requiredFiles = @(
        "src/config/sentry.ts",
        "src/config/sentry-react.ts",
        "src/components/SentryErrorBoundary.tsx",
        "src/utils/performance-monitoring.ts"
    )
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            Write-Host "Missing required file: $file" -ForegroundColor Red
            return $false
        }
    }
    
    # Check if dependencies are installed
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        $sentryPackages = @("@sentry/node", "@sentry/react")
        
        foreach ($package in $sentryPackages) {
            $installed = $false
            if ($packageJson.dependencies -and $packageJson.dependencies.$package) {
                $installed = $true
            }
            if ($packageJson.devDependencies -and $packageJson.devDependencies.$package) {
                $installed = $true
            }
            
            if (-not $installed) {
                Write-Host "Missing dependency: $package" -ForegroundColor Red
                return $false
            }
        }
    }
    
    Write-Host "Sentry setup test passed!" -ForegroundColor Green
    return $true
}

# Main execution
Write-Host "Starting Sentry Security Monitoring Setup..." -ForegroundColor Green

try {
    # Step 1: Setup Sentry project if requested
    if ($SetupProject) {
        Setup-SentryProject
    }
    
    # Step 2: Install dependencies
    Install-SentryDependencies
    
    # Step 3: Create configuration files
    Create-SentryConfig
    Create-ReactSentryConfig
    Create-SentryEnvironmentConfig
    
    # Step 4: Create components and utilities
    Create-SentryErrorBoundary
    Create-SentryPerformanceMonitoring
    
    # Step 5: Test the setup
    $testPassed = Test-SentrySetup
    
    if ($testPassed) {
        Write-Host "Sentry Security Monitoring setup completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Update your SENTRY_DSN in .env file" -ForegroundColor White
        Write-Host "2. Initialize Sentry in your main app files:" -ForegroundColor White
        Write-Host "   - Add initializeSentry() in your Node.js server" -ForegroundColor Gray
        Write-Host "   - Add initializeReactSentry() in your React app" -ForegroundColor Gray
        Write-Host "3. Wrap your React app with SentryErrorBoundary" -ForegroundColor White
        Write-Host "4. Configure HIPAA-compliant data scrubbing in Sentry dashboard" -ForegroundColor White
        Write-Host "5. Set up alerts and notifications for security events" -ForegroundColor White
    } else {
        Write-Host "Sentry setup completed with issues. Please review the errors above." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error during setup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Sentry Security Monitoring Setup Complete!" -ForegroundColor Green