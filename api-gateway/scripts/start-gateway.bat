@echo off
REM Serenity API Gateway Startup Script for Windows
REM This script initializes and starts the Kong API Gateway with all dependencies

setlocal EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "COMPOSE_FILE=%PROJECT_DIR%\docker-compose.yml"
set "ENV_FILE=%PROJECT_DIR%\.env"

REM Colors (limited support in Windows CMD)
set "GREEN=[92m"
set "RED=[91m"  
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Get timestamp
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
    set "DATE=%%c-%%a-%%b"
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set "TIME=%%a:%%b"
)
set "TIMESTAMP=%DATE% %TIME%"

:log
echo %GREEN%[%TIMESTAMP%] %~1%NC%
exit /b

:warn
echo %YELLOW%[%TIMESTAMP%] WARNING: %~1%NC%
exit /b

:error
echo %RED%[%TIMESTAMP%] ERROR: %~1%NC%
exit /b 1

:info
echo %BLUE%[%TIMESTAMP%] INFO: %~1%NC%
exit /b

:check_prerequisites
call :log "Checking prerequisites..."

REM Check if Docker is installed
docker --version >nul 2>&1
if !errorlevel! neq 0 (
    call :error "Docker is not installed. Please install Docker Desktop first."
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if !errorlevel! neq 0 (
    call :error "Docker is not running. Please start Docker Desktop first."
    exit /b 1
)

REM Check if Docker Compose is available
docker compose version >nul 2>&1
if !errorlevel! neq 0 (
    docker-compose --version >nul 2>&1
    if !errorlevel! neq 0 (
        call :error "Docker Compose is not available. Please install Docker Compose."
        exit /b 1
    )
)

call :log "Prerequisites check completed."
exit /b 0

:setup_environment
call :log "Setting up environment..."

REM Create .env file if it doesn't exist
if not exist "%ENV_FILE%" (
    call :info "Creating environment file..."
    (
        echo # Serenity API Gateway Environment Configuration
        echo COMPOSE_PROJECT_NAME=serenity-gateway
        echo.
        echo # Kong Configuration
        echo KONG_PG_PASSWORD=kong_password_secure123
        echo KONG_REDIS_PASSWORD=redis_password_secure123
        echo.
        echo # Grafana Configuration
        echo GF_SECURITY_ADMIN_PASSWORD=admin_password_secure123
        echo.
        echo # Alert Webhook Token
        echo ALERT_WEBHOOK_TOKEN=webhook_token_secure123456789
        echo.
        echo # Environment
        echo ENVIRONMENT=production
        echo LOG_LEVEL=info
        echo.
        echo # Network Configuration
        echo KONG_PROXY_HTTP_PORT=8000
        echo KONG_PROXY_HTTPS_PORT=8443
        echo KONG_ADMIN_PORT=8001
        echo KONG_MANAGER_PORT=8002
        echo KONGA_PORT=1337
        echo PROMETHEUS_PORT=9090
        echo GRAFANA_PORT=3001
        echo KIBANA_PORT=5601
        echo ELASTICSEARCH_PORT=9200
    ) > "%ENV_FILE%"
    call :log "Environment file created at %ENV_FILE%"
) else (
    call :info "Using existing environment file."
)

REM Create necessary directories
if not exist "%PROJECT_DIR%\logs" mkdir "%PROJECT_DIR%\logs"
if not exist "%PROJECT_DIR%\data" mkdir "%PROJECT_DIR%\data"

call :log "Environment setup completed."
exit /b 0

:validate_configuration
call :log "Validating configuration..."

REM Check if Kong configuration exists
if not exist "%PROJECT_DIR%\config\kong.yml" (
    call :error "Kong configuration file not found at %PROJECT_DIR%\config\kong.yml"
    exit /b 1
)

REM Check if required configuration files exist
set "required_files=%PROJECT_DIR%\monitoring\prometheus.yml %PROJECT_DIR%\logging\logstash.conf %PROJECT_DIR%\health-checker\package.json"

for %%f in (%required_files%) do (
    if not exist "%%f" (
        call :error "Required configuration file not found: %%f"
        exit /b 1
    )
)

call :log "Configuration validation completed."
exit /b 0

:start_services
call :log "Starting Serenity API Gateway services..."

cd /d "%PROJECT_DIR%"

REM Check if services are already running
docker-compose ps 2>nul | findstr "Up" >nul
if !errorlevel! equ 0 (
    call :warn "Some services are already running. Stopping them first..."
    docker-compose down
)

REM Pull latest images
call :info "Pulling latest Docker images..."
docker-compose pull

REM Start infrastructure services first
call :info "Starting infrastructure services (databases, cache)..."
docker-compose up -d kong-database kong-redis elasticsearch

REM Wait for databases to be ready
call :info "Waiting for databases to initialize..."
timeout /t 30 /nobreak >nul

REM Run Kong migrations
call :info "Running Kong database migrations..."
docker-compose run --rm kong-migration

REM Start Kong
call :info "Starting Kong API Gateway..."
docker-compose up -d kong

REM Wait for Kong to be ready
call :info "Waiting for Kong to be ready..."
set /a "max_attempts=30"
set /a "attempt=0"

:wait_kong
curl -s http://localhost:8001/status >nul 2>&1
if !errorlevel! equ 0 goto kong_ready

set /a "attempt=attempt+1"
if !attempt! geq !max_attempts! (
    call :error "Kong failed to start within expected time"
    exit /b 1
)

timeout /t 2 /nobreak >nul
goto wait_kong

:kong_ready
REM Start remaining services
call :info "Starting monitoring and logging services..."
docker-compose up -d prometheus grafana logstash kibana

REM Start health checker
call :info "Starting health checker service..."
docker-compose up -d health-checker

REM Start admin UI
call :info "Starting Kong admin UI..."
docker-compose up -d konga

REM Start circuit breaker
call :info "Starting circuit breaker..."
docker-compose up -d circuit-breaker

call :log "All services started successfully!"
exit /b 0

:health_check
call :log "Performing health check..."

REM Check key services
set "failed=0"

call :info "Checking Kong Gateway..."
curl -s -f http://localhost:8001/status >nul 2>&1
if !errorlevel! equ 0 (
    call :log "Kong Gateway is healthy"
) else (
    call :warn "Kong Gateway failed health check"
    set /a "failed=failed+1"
)

call :info "Checking Kong Proxy..."
curl -s -f http://localhost:8000 >nul 2>&1
if !errorlevel! equ 0 (
    call :log "Kong Proxy is healthy"
) else (
    call :warn "Kong Proxy failed health check"
    set /a "failed=failed+1"
)

call :info "Checking Prometheus..."
curl -s -f http://localhost:9090/-/healthy >nul 2>&1
if !errorlevel! equ 0 (
    call :log "Prometheus is healthy"
) else (
    call :warn "Prometheus failed health check"
    set /a "failed=failed+1"
)

call :info "Checking Health Checker..."
curl -s -f http://localhost:8090/health >nul 2>&1
if !errorlevel! equ 0 (
    call :log "Health Checker is healthy"
) else (
    call :warn "Health Checker failed health check"
    set /a "failed=failed+1"
)

if !failed! equ 0 (
    call :log "All services are healthy!"
) else (
    call :warn "!failed! service(s) failed health check"
)

REM Display service URLs
echo.
echo %GREEN%=== Serenity API Gateway Services ===%NC%
echo %BLUE%Kong Proxy:%NC%         http://localhost:8000
echo %BLUE%Kong Admin API:%NC%     http://localhost:8001
echo %BLUE%Kong Manager UI:%NC%    http://localhost:8002
echo %BLUE%Konga Admin UI:%NC%     http://localhost:1337
echo %BLUE%Prometheus:%NC%         http://localhost:9090
echo %BLUE%Grafana:%NC%            http://localhost:3001 (admin/admin)
echo %BLUE%Kibana:%NC%             http://localhost:5601
echo %BLUE%Health Checker:%NC%     http://localhost:8090/health
echo.
echo %YELLOW%API Routes:%NC%
echo %BLUE%Auth Service:%NC%       http://localhost:8000/api/auth
echo %BLUE%Notification:%NC%       http://localhost:8000/api/notifications
echo %BLUE%Crisis Service:%NC%     http://localhost:8000/api/crisis
echo %BLUE%Frontend App:%NC%       http://localhost:8000/
echo.

exit /b 0

:main
call :log "Starting Serenity API Gateway initialization..."

call :check_prerequisites
if !errorlevel! neq 0 exit /b 1

call :setup_environment
if !errorlevel! neq 0 exit /b 1

call :validate_configuration
if !errorlevel! neq 0 exit /b 1

call :start_services
if !errorlevel! neq 0 exit /b 1

REM Wait a moment for services to stabilize
timeout /t 10 /nobreak >nul

call :health_check

call :log "Serenity API Gateway startup completed successfully!"
call :info "Use '%~nx0 stop' to stop all services"
call :info "Use '%~nx0 logs' to view logs"
call :info "Use '%~nx0 status' to check service status"
exit /b 0

REM Main script logic
if "%~1"=="" goto main
if "%~1"=="start" goto main

if "%~1"=="stop" (
    call :log "Stopping Serenity API Gateway services..."
    cd /d "%PROJECT_DIR%"
    docker-compose down
    call :log "All services stopped."
    exit /b 0
)

if "%~1"=="restart" (
    call :log "Restarting Serenity API Gateway services..."
    cd /d "%PROJECT_DIR%"
    docker-compose restart
    timeout /t 10 /nobreak >nul
    call :health_check
    exit /b 0
)

if "%~1"=="status" (
    call :log "Checking service status..."
    cd /d "%PROJECT_DIR%"
    docker-compose ps
    exit /b 0
)

if "%~1"=="logs" (
    call :log "Showing recent logs..."
    cd /d "%PROJECT_DIR%"
    docker-compose logs --tail=100 -f
    exit /b 0
)

if "%~1"=="health" (
    call :health_check
    exit /b 0
)

echo Usage: %~nx0 {start^|stop^|restart^|status^|logs^|health}
echo   start   - Start all gateway services (default)
echo   stop    - Stop all gateway services
echo   restart - Restart all gateway services
echo   status  - Show service status
echo   logs    - Show and follow logs
echo   health  - Perform health check
exit /b 1