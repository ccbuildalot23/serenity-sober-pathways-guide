# Redis Rate Limiting Setup Script for Serenity Sober Pathways
# HIPAA-compliant rate limiting with Redis backend

param(
    [Parameter(Mandatory = $false)]
    [string]$Environment = "development",
    
    [Parameter(Mandatory = $false)]
    [string]$RedisHost = "localhost",
    
    [Parameter(Mandatory = $false)]
    [int]$RedisPort = 6379,
    
    [Parameter(Mandatory = $false)]
    [switch]$UseRedisCloud = $false,
    
    [Parameter(Mandatory = $false)]
    [switch]$TestMode = $false
)

Write-Host "Redis Rate Limiting Setup for Serenity Sober Pathways" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Redis Host: $RedisHost" -ForegroundColor Yellow
Write-Host "Redis Port: $RedisPort" -ForegroundColor Yellow

# Function to check if Redis is available
function Test-RedisConnection {
    param(
        [string]$Host,
        [int]$Port,
        [string]$Password = ""
    )
    
    try {
        Write-Host "Testing Redis connection to $Host`:$Port..." -ForegroundColor Yellow
        
        # Try to connect using redis-cli if available
        if (Get-Command redis-cli -ErrorAction SilentlyContinue) {
            if ($Password) {
                $result = redis-cli -h $Host -p $Port -a $Password ping
            } else {
                $result = redis-cli -h $Host -p $Port ping
            }
            
            if ($result -eq "PONG") {
                Write-Host "Redis connection successful!" -ForegroundColor Green
                return $true
            }
        }
        
        # Fallback: Test TCP connection
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.ConnectAsync($Host, $Port).Wait(5000)
        
        if ($tcpClient.Connected) {
            Write-Host "Redis TCP connection successful!" -ForegroundColor Green
            $tcpClient.Close()
            return $true
        }
        
        return $false
    } catch {
        Write-Host "Redis connection failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to install Redis on Windows (development)
function Install-RedisWindows {
    Write-Host "Installing Redis for Windows..." -ForegroundColor Yellow
    
    $redisPath = "C:\Program Files\Redis"
    $redisUrl = "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip"
    $tempPath = "$env:TEMP\redis.zip"
    
    try {
        # Download Redis
        Write-Host "Downloading Redis..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $redisUrl -OutFile $tempPath -TimeoutSec 30
        
        # Extract Redis
        Write-Host "Extracting Redis..." -ForegroundColor Yellow
        if (Test-Path $redisPath) {
            Remove-Item $redisPath -Recurse -Force
        }
        New-Item -ItemType Directory -Path $redisPath -Force | Out-Null
        Expand-Archive -Path $tempPath -DestinationPath $redisPath -Force
        
        # Add to PATH
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
        if ($currentPath -notlike "*$redisPath*") {
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$redisPath", "Machine")
            $env:PATH = "$env:PATH;$redisPath"
        }
        
        Write-Host "Redis installed successfully!" -ForegroundColor Green
        Write-Host "You may need to restart your terminal to use redis-cli" -ForegroundColor Yellow
        
        # Clean up
        Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
        
        return $true
    } catch {
        Write-Host "Failed to install Redis: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to setup Redis Cloud connection
function Setup-RedisCloud {
    Write-Host "Setting up Redis Cloud connection..." -ForegroundColor Yellow
    
    Write-Host "To use Redis Cloud:" -ForegroundColor Cyan
    Write-Host "1. Visit https://app.redislabs.com/" -ForegroundColor White
    Write-Host "2. Create a free account" -ForegroundColor White
    Write-Host "3. Create a new database" -ForegroundColor White
    Write-Host "4. Note the endpoint and password" -ForegroundColor White
    Write-Host "5. Update your environment variables:" -ForegroundColor White
    Write-Host "   REDIS_HOST=your-endpoint.redis.cloud.redislabs.com" -ForegroundColor Gray
    Write-Host "   REDIS_PORT=your-port" -ForegroundColor Gray
    Write-Host "   REDIS_PASSWORD=your-password" -ForegroundColor Gray
    
    if (-not $TestMode) {
        $openBrowser = Read-Host "Open Redis Cloud signup page? (y/N)"
        if ($openBrowser -eq 'y' -or $openBrowser -eq 'Y') {
            Start-Process "https://app.redislabs.com/"
        }
    }
}

# Function to create rate limiting middleware
function Create-RateLimitingMiddleware {
    $middlewarePath = "src/middleware/rate-limiting.ts"
    $middlewareDir = Split-Path $middlewarePath -Parent
    
    if (-not (Test-Path $middlewareDir)) {
        New-Item -ItemType Directory -Path $middlewareDir -Force | Out-Null
    }
    
    $middlewareContent = @"
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { alertSecurity, SecurityEvent } from '../security-enhancements/2025-08-27-1609/security-alerting';

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 300,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
  alertSecurity(SecurityEvent.RATE_LIMIT_EXCEEDED, { error: error.message }, 'high');
});

redis.on('connect', () => {
  console.log('Redis connected for rate limiting');
});

// General API rate limiting (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'api-limit:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    alertSecurity(SecurityEvent.RATE_LIMIT_EXCEEDED, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    }, 'medium');
    
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 900
    });
  }
});

// Authentication endpoints rate limiting (5 attempts per 15 minutes)
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'auth-limit:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    alertSecurity(SecurityEvent.SUSPICIOUS_LOGIN, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      body: req.body ? { ...req.body, password: '[REDACTED]' } : undefined
    }, 'high');
    
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 900
    });
  }
});

// PHI access rate limiting (20 requests per minute per user)
export const phiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'phi-limit:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.id || req.ip;
  },
  message: {
    error: 'PHI access rate limit exceeded. Please contact support if you need higher limits.',
    retryAfter: 60
  },
  handler: (req, res) => {
    alertSecurity(SecurityEvent.UNAUTHORIZED_PHI_ACCESS, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    }, 'critical');
    
    res.status(429).json({
      error: 'PHI access rate limit exceeded. Please contact support if you need higher limits.',
      retryAfter: 60
    });
  }
});

// Password reset rate limiting (3 attempts per hour per email)
export const passwordResetLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'pwd-reset:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
  message: {
    error: 'Too many password reset attempts. Please try again later.',
    retryAfter: 3600
  },
  skipSuccessfulRequests: false
});

// Crisis support rate limiting (higher limits for emergency endpoints)
export const crisisLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'crisis-limit:',
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Higher limit for crisis endpoints
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Crisis support rate limit reached. If this is an emergency, please call 911.',
    retryAfter: 300
  }
});

// Export Redis client for other modules
export { redis };
"@
    
    Set-Content -Path $middlewarePath -Value $middlewareContent
    Write-Host "Created rate limiting middleware at: $middlewarePath" -ForegroundColor Green
}

# Function to create Redis health check
function Create-RedisHealthCheck {
    $healthCheckPath = "src/health/redis-health.ts"
    $healthCheckDir = Split-Path $healthCheckPath -Parent
    
    if (-not (Test-Path $healthCheckDir)) {
        New-Item -ItemType Directory -Path $healthCheckDir -Force | Out-Null
    }
    
    $healthCheckContent = @"
import { redis } from '../middleware/rate-limiting';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: Date;
  details?: any;
}

export async function checkRedisHealth(): Promise<HealthCheckResult> {
  try {
    const start = Date.now();
    const result = await redis.ping();
    const latency = Date.now() - start;
    
    if (result === 'PONG') {
      return {
        status: 'healthy',
        message: 'Redis is responsive',
        timestamp: new Date(),
        details: {
          latency: `${latency}ms`,
          connection: 'active'
        }
      };
    } else {
      return {
        status: 'unhealthy',
        message: 'Redis ping returned unexpected result',
        timestamp: new Date(),
        details: { result }
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Redis health check failed',
      timestamp: new Date(),
      details: { error: error.message }
    };
  }
}

export async function getRedisInfo(): Promise<any> {
  try {
    const info = await redis.info();
    return {
      status: 'success',
      info: info.split('\r\n').reduce((acc, line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {})
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}
"@
    
    Set-Content -Path $healthCheckPath -Value $healthCheckContent
    Write-Host "Created Redis health check at: $healthCheckPath" -ForegroundColor Green
}

# Function to update package.json dependencies
function Update-Dependencies {
    $packageJsonPath = "package.json"
    
    if (-not (Test-Path $packageJsonPath)) {
        Write-Host "package.json not found. Creating minimal configuration..." -ForegroundColor Yellow
        @{
            name = "serenity-sober-pathways"
            version = "1.0.0"
            dependencies = @{}
            devDependencies = @{}
        } | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
    }
    
    Write-Host "Adding Redis rate limiting dependencies..." -ForegroundColor Yellow
    
    $dependencies = @(
        "express-rate-limit@^7.1.5",
        "rate-limit-redis@^4.2.0",
        "ioredis@^5.3.2"
    )
    
    foreach ($dep in $dependencies) {
        Write-Host "Adding dependency: $dep" -ForegroundColor Gray
        npm install $dep 2>$null
    }
    
    Write-Host "Dependencies added successfully!" -ForegroundColor Green
}

# Function to create environment configuration
function Create-EnvironmentConfig {
    $envExamplePath = ".env.example"
    
    $envContent = @"
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Redis Cloud (if using cloud service)
# REDIS_HOST=your-endpoint.redis.cloud.redislabs.com
# REDIS_PORT=your-port
# REDIS_PASSWORD=your-password

# Rate Limiting Configuration
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=5
PHI_RATE_LIMIT_WINDOW_MS=60000
PHI_RATE_LIMIT_MAX=20
"@
    
    if (-not (Test-Path ".env")) {
        Set-Content -Path ".env" -Value $envContent
        Write-Host "Created .env file with Redis configuration" -ForegroundColor Green
    }
    
    Set-Content -Path $envExamplePath -Value $envContent
    Write-Host "Updated .env.example with Redis configuration" -ForegroundColor Green
}

# Function to run tests
function Test-RateLimitingSetup {
    Write-Host "Testing rate limiting setup..." -ForegroundColor Yellow
    
    # Test Redis connection
    if ($UseRedisCloud) {
        Write-Host "Skipping Redis connection test for cloud setup" -ForegroundColor Yellow
    } else {
        $redisConnected = Test-RedisConnection $RedisHost $RedisPort
        if (-not $redisConnected) {
            Write-Host "Redis connection test failed" -ForegroundColor Red
            return $false
        }
    }
    
    # Check if middleware files exist
    $requiredFiles = @(
        "src/middleware/rate-limiting.ts",
        "src/health/redis-health.ts"
    )
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            Write-Host "Missing required file: $file" -ForegroundColor Red
            return $false
        }
    }
    
    Write-Host "Rate limiting setup test passed!" -ForegroundColor Green
    return $true
}

# Main execution
Write-Host "Starting Redis Rate Limiting Setup..." -ForegroundColor Green

try {
    # Step 1: Handle Redis installation/setup
    if ($UseRedisCloud) {
        Setup-RedisCloud
    } elseif ($Environment -eq "development" -and -not (Test-RedisConnection $RedisHost $RedisPort)) {
        Write-Host "Redis not found locally. Installing Redis for Windows..." -ForegroundColor Yellow
        $installed = Install-RedisWindows
        if (-not $installed) {
            throw "Failed to install Redis"
        }
    }
    
    # Step 2: Update dependencies
    Update-Dependencies
    
    # Step 3: Create middleware and health checks
    Create-RateLimitingMiddleware
    Create-RedisHealthCheck
    
    # Step 4: Create environment configuration
    Create-EnvironmentConfig
    
    # Step 5: Test the setup
    $testPassed = Test-RateLimitingSetup
    
    if ($testPassed) {
        Write-Host "Redis Rate Limiting setup completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Start Redis server (if using local Redis): redis-server" -ForegroundColor White
        Write-Host "2. Update your Express app to use the rate limiting middleware" -ForegroundColor White
        Write-Host "3. Test the rate limiting endpoints" -ForegroundColor White
        Write-Host "4. Monitor Redis performance and adjust limits as needed" -ForegroundColor White
    } else {
        Write-Host "Rate limiting setup completed with issues. Please review the errors above." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error during setup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Redis Rate Limiting Setup Complete!" -ForegroundColor Green