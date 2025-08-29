# Serenity Deployment Script
# Supports development, test, and production environments

param(
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment = "dev",
    [switch]$Build = $false,
    [switch]$Migrate = $false,
    [switch]$Seed = $false,
    [switch]$Monitor = $false,
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

# Color functions
function Write-Success { param([string]$Message) Write-Host $Message -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param([string]$Message) Write-Host $Message -ForegroundColor Yellow }

# Environment configuration
$EnvConfig = @{
    "dev" = @{
        composeFile = "docker-compose.dev.yml"
        envFile = ".env.dev"
        healthCheckTimeout = 60
        services = @("postgres", "redis", "mongodb", "rabbitmq")
    }
    "test" = @{
        composeFile = "docker-compose.test.yml" 
        envFile = ".env.test"
        healthCheckTimeout = 30
        services = @("postgres-test", "redis-test", "mongodb-test")
    }
    "prod" = @{
        composeFile = "docker-compose.prod.yml"
        envFile = ".env.prod"
        healthCheckTimeout = 120
        services = @("postgres", "redis", "mongodb", "rabbitmq", "elasticsearch")
    }
}

$config = $EnvConfig[$Environment]

Write-Info "🚀 Starting Serenity Deployment"
Write-Info "Environment: $Environment"
Write-Info "Build: $Build"
Write-Info "Migrate: $Migrate"
Write-Info "Seed: $Seed"
Write-Info "Version: $Version"

# Check prerequisites
Write-Info "📋 Checking prerequisites..."

if (!(Test-Path $config.composeFile)) {
    Write-Error "❌ Compose file not found: $($config.composeFile)"
    exit 1
}

if (!(Test-Path $config.envFile)) {
    Write-Warning "⚠️  Environment file not found: $($config.envFile)"
    Write-Info "Creating default environment file..."
    
    # Create default .env file
    switch ($Environment) {
        "dev" {
            @"
# Serenity Development Environment
NODE_ENV=development
ENVIRONMENT=development

# Database
POSTGRES_DB=serenity_dev
POSTGRES_USER=serenity_user
POSTGRES_PASSWORD=dev_password_123

# Redis
REDIS_PASSWORD=dev_redis_123

# MongoDB
MONGODB_USERNAME=admin
MONGODB_PASSWORD=dev_mongo_123

# RabbitMQ
RABBITMQ_DEFAULT_USER=serenity
RABBITMQ_DEFAULT_PASS=dev_rabbit_123

# Supabase (replace with actual values)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=dev-jwt-secret-key-change-in-production

# Notification services (add your credentials)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone
SENDGRID_API_KEY=your-sendgrid-api-key
FIREBASE_PROJECT_ID=your-firebase-project

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
"@ | Out-File -FilePath $config.envFile -Encoding UTF8
        }
        "test" {
            @"
# Serenity Test Environment
NODE_ENV=test
ENVIRONMENT=test

# Test Database
POSTGRES_DB=serenity_test
POSTGRES_USER=test_user
POSTGRES_PASSWORD=test_password

# Test services
REDIS_URL=redis://redis-test:6379
MONGODB_URL=mongodb://test_admin:test_mongo@mongodb-test:27017/serenity_test?authSource=admin

# Mock service URLs
TWILIO_ACCOUNT_SID=test_account_sid
TWILIO_AUTH_TOKEN=test_auth_token
SENDGRID_API_KEY=test_sendgrid_key

# Test JWT
JWT_SECRET=test-jwt-secret-key-for-testing-only
"@ | Out-File -FilePath $config.envFile -Encoding UTF8
        }
        "prod" {
            Write-Error "❌ Production environment file must be created manually with secure values!"
            exit 1
        }
    }
    
    Write-Success "✅ Created default environment file: $($config.envFile)"
    Write-Warning "⚠️  Please update the environment file with your actual configuration values"
}

# Build images if requested
if ($Build) {
    Write-Info "🔨 Building Docker images..."
    
    $buildArgs = @(
        "-Environment", $Environment,
        "-Version", $Version
    )
    
    if ($Environment -eq "prod") {
        $buildArgs += @("-SecurityScan", "-Push")
    }
    
    & .\scripts\docker-build.ps1 @buildArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Build failed"
        exit 1
    }
}

# Function to wait for service health
function Wait-ForServiceHealth {
    param([string]$ServiceName, [int]$TimeoutSeconds = 60)
    
    Write-Info "⏳ Waiting for $ServiceName to be healthy (timeout: ${TimeoutSeconds}s)..."
    
    $elapsed = 0
    $interval = 5
    
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $health = & docker-compose -f $config.composeFile exec $ServiceName sh -c "exit 0" 2>$null
            if ($LASTEXITCODE -eq 0) {
                # Check specific health endpoints
                switch ($ServiceName) {
                    "postgres" { 
                        $result = & docker-compose -f $config.composeFile exec $ServiceName pg_isready -U serenity_user 2>$null
                        if ($LASTEXITCODE -eq 0) { return $true }
                    }
                    "redis" { 
                        $result = & docker-compose -f $config.composeFile exec $ServiceName redis-cli ping 2>$null
                        if ($result -eq "PONG") { return $true }
                    }
                    "mongodb" { 
                        $result = & docker-compose -f $config.composeFile exec $ServiceName mongosh --eval "db.adminCommand('ping')" 2>$null
                        if ($LASTEXITCODE -eq 0) { return $true }
                    }
                    default { 
                        return $true 
                    }
                }
            }
        }
        catch {
            # Service not ready yet
        }
        
        Start-Sleep -Seconds $interval
        $elapsed += $interval
        Write-Host "." -NoNewline
    }
    
    Write-Host ""
    return $false
}

# Stop existing containers
Write-Info "🛑 Stopping existing containers..."
& docker-compose -f $config.composeFile down --remove-orphans

# Start infrastructure services first
Write-Info "🏗️  Starting infrastructure services..."
& docker-compose -f $config.composeFile up -d @($config.services)

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to start infrastructure services"
    exit 1
}

# Wait for infrastructure services to be healthy
foreach ($service in $config.services) {
    $healthy = Wait-ForServiceHealth $service $config.healthCheckTimeout
    if ($healthy) {
        Write-Success "✅ $service is healthy"
    } else {
        Write-Error "❌ $service failed to become healthy within timeout"
        & docker-compose -f $config.composeFile logs $service
        exit 1
    }
}

# Run database migrations if requested
if ($Migrate) {
    Write-Info "🗄️  Running database migrations..."
    
    if ($Environment -ne "test") {
        # Wait a bit more for database to be fully ready
        Start-Sleep -Seconds 10
        
        # Run migrations
        try {
            & docker-compose -f $config.composeFile exec postgres psql -U serenity_user -d serenity_dev -f /docker-entrypoint-initdb.d/01-init-serenity.sql
            & docker-compose -f $config.composeFile exec postgres psql -U serenity_user -d serenity_dev -f /docker-entrypoint-initdb.d/02-create-tables.sql
            & docker-compose -f $config.composeFile exec postgres psql -U serenity_user -d serenity_dev -f /docker-entrypoint-initdb.d/03-enable-rls.sql
            Write-Success "✅ Database migrations completed"
        }
        catch {
            Write-Error "❌ Database migration failed: $_"
            exit 1
        }
    }
}

# Seed test data if requested
if ($Seed -and $Environment -eq "dev") {
    Write-Info "🌱 Seeding development data..."
    
    # Use the test data seeder
    & docker-compose -f $config.composeFile run --rm test-data-seeder
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Development data seeded"
    } else {
        Write-Warning "⚠️  Data seeding failed - continuing with deployment"
    }
}

# Start application services
Write-Info "🚀 Starting application services..."
& docker-compose -f $config.composeFile up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to start application services"
    exit 1
}

# Wait for application services to be ready
$appServices = @("api-gateway", "auth-service", "notification-service", "crisis-service")
foreach ($service in $appServices) {
    Start-Sleep -Seconds 10  # Give services time to start
    
    try {
        # Check if service is responding
        $port = switch ($service) {
            "api-gateway" { 3003 }
            "auth-service" { 3000 }
            "notification-service" { 8000 }
            "crisis-service" { 3002 }
        }
        
        $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "✅ $service is responding"
        } else {
            Write-Warning "⚠️  $service health check returned status: $($response.StatusCode)"
        }
    }
    catch {
        Write-Warning "⚠️  Could not reach $service health endpoint: $_"
    }
}

# Start monitoring if requested
if ($Monitor -and $Environment -ne "test") {
    Write-Info "📊 Starting monitoring services..."
    & docker-compose -f $config.composeFile up -d prometheus grafana
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Monitoring services started"
        Write-Info "📊 Grafana: http://localhost:3001 (admin/admin)"
        Write-Info "📊 Prometheus: http://localhost:9090"
    }
}

# Display deployment summary
Write-Success "`n🎉 Deployment completed successfully!"

Write-Info "`n📋 Service URLs:"
switch ($Environment) {
    "dev" {
        Write-Info "🌐 Main App: http://localhost:8080"
        Write-Info "👥 Patient Portal: http://localhost:8081"
        Write-Info "🔑 API Gateway: http://localhost:3003"
        Write-Info "🛠️  Adminer: http://localhost:8090"
        Write-Info "📱 Redis Commander: http://localhost:8091"
        Write-Info "🐰 RabbitMQ Management: http://localhost:15672"
        Write-Info "📊 Mongo Express: http://localhost:8092"
    }
    "test" {
        Write-Info "🧪 Test environment is running"
        Write-Info "Run tests with: docker-compose -f $($config.composeFile) --profile test up"
    }
    "prod" {
        Write-Info "🚀 Production environment is running"
        Write-Info "🌐 Main App: https://app.serenity.com"
        Write-Info "📊 Monitoring: http://localhost:3001"
    }
}

Write-Info "`n🔍 Useful commands:"
Write-Info "📋 View logs: docker-compose -f $($config.composeFile) logs -f [service]"
Write-Info "📊 View status: docker-compose -f $($config.composeFile) ps"
Write-Info "🛑 Stop all: docker-compose -f $($config.composeFile) down"
Write-Info "🔄 Restart service: docker-compose -f $($config.composeFile) restart [service]"

# Health check summary
Write-Info "`n🏥 Running final health checks..."
& docker-compose -f $config.composeFile ps

Write-Success "✅ Deployment completed successfully!"