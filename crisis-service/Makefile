# Serenity Crisis Service Makefile

.PHONY: help build test lint clean docker run dev deps migrate

# Variables
APP_NAME=crisis-service
VERSION?=1.0.0
DOCKER_TAG=serenity/$(APP_NAME):$(VERSION)
GO_VERSION=1.21

# Help target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development targets
deps: ## Install dependencies
	@echo "Installing Go dependencies..."
	go mod download
	go mod tidy
	@echo "Installing development tools..."
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest

dev: ## Start development server with hot reload
	@echo "Starting development server..."
	go run cmd/server/main.go

run: ## Run the application
	@echo "Running crisis service..."
	go run cmd/server/main.go

# Build targets
build: ## Build the application
	@echo "Building $(APP_NAME) v$(VERSION)..."
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o bin/$(APP_NAME) ./cmd/server

build-local: ## Build for local OS
	@echo "Building $(APP_NAME) for local OS..."
	go build -o bin/$(APP_NAME) ./cmd/server

# Test targets
test: ## Run all tests
	@echo "Running tests..."
	go test -v -race -coverprofile=coverage.out ./...

test-integration: ## Run integration tests
	@echo "Running integration tests..."
	go test -v -race -tags=integration ./...

test-coverage: ## Generate test coverage report
	@echo "Generating coverage report..."
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

benchmark: ## Run benchmarks
	@echo "Running benchmarks..."
	go test -bench=. -benchmem ./...

# Quality targets
lint: ## Run linter
	@echo "Running linter..."
	golangci-lint run --timeout=5m

security: ## Run security scan
	@echo "Running security scan..."
	gosec ./...

vet: ## Run go vet
	@echo "Running go vet..."
	go vet ./...

fmt: ## Format code
	@echo "Formatting code..."
	go fmt ./...

quality: fmt vet lint security test ## Run all quality checks

# Database targets
migrate-up: ## Run database migrations up
	@echo "Running database migrations..."
	go run cmd/server/main.go migrate up

migrate-down: ## Run database migrations down
	@echo "Rolling back database migrations..."
	go run cmd/server/main.go migrate down

migrate-status: ## Check migration status
	@echo "Checking migration status..."
	go run cmd/server/main.go migrate status

# Docker targets
docker-build: ## Build Docker image
	@echo "Building Docker image $(DOCKER_TAG)..."
	docker build -t $(DOCKER_TAG) .
	docker tag $(DOCKER_TAG) serenity/$(APP_NAME):latest

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	docker run --rm -p 8080:8080 --env-file .env $(DOCKER_TAG)

docker-compose-up: ## Start all services with Docker Compose
	@echo "Starting services with Docker Compose..."
	docker-compose up -d

docker-compose-down: ## Stop all services with Docker Compose
	@echo "Stopping services with Docker Compose..."
	docker-compose down

docker-compose-logs: ## View Docker Compose logs
	docker-compose logs -f

docker-push: ## Push Docker image to registry
	@echo "Pushing Docker image..."
	docker push $(DOCKER_TAG)
	docker push serenity/$(APP_NAME):latest

# Environment targets
env-copy: ## Copy example environment file
	@echo "Copying .env.example to .env..."
	cp .env.example .env
	@echo "Please edit .env with your configuration"

env-validate: ## Validate environment configuration
	@echo "Validating environment configuration..."
	go run cmd/server/main.go validate-config

# Deployment targets
deploy-dev: ## Deploy to development environment
	@echo "Deploying to development environment..."
	docker-compose -f docker-compose.dev.yml up -d

deploy-staging: ## Deploy to staging environment
	@echo "Deploying to staging environment..."
	docker-compose -f docker-compose.staging.yml up -d

deploy-prod: ## Deploy to production environment
	@echo "Deploying to production environment..."
	docker-compose -f docker-compose.prod.yml up -d

# Monitoring targets
logs: ## View application logs
	@echo "Viewing application logs..."
	docker-compose logs -f crisis-service

metrics: ## View Prometheus metrics
	@echo "Opening Prometheus metrics..."
	open http://localhost:9090

grafana: ## Open Grafana dashboard
	@echo "Opening Grafana dashboard..."
	open http://localhost:3000

# Cleanup targets
clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	rm -rf bin/
	rm -f coverage.out coverage.html
	go clean -cache -testcache -modcache

clean-docker: ## Clean Docker images and containers
	@echo "Cleaning Docker images and containers..."
	docker system prune -f
	docker image prune -f

# Load testing targets
load-test: ## Run load tests
	@echo "Running load tests..."
	@echo "Note: Install k6 first (https://k6.io/docs/getting-started/installation/)"
	k6 run tests/load/crisis_trigger_test.js

stress-test: ## Run stress tests
	@echo "Running stress tests..."
	k6 run --vus 1000 --duration 5m tests/load/stress_test.js

# Documentation targets
docs: ## Generate documentation
	@echo "Generating API documentation..."
	@echo "Note: Install swag first (go install github.com/swaggo/swag/cmd/swag@latest)"
	swag init -g cmd/server/main.go -o docs/

docs-serve: ## Serve documentation locally
	@echo "Serving documentation at http://localhost:8081..."
	python3 -m http.server 8081 -d docs/

# Backup targets
backup-db: ## Backup database
	@echo "Creating database backup..."
	docker-compose exec postgres pg_dump -U crisis_user crisis_db > backup_$$(date +%Y%m%d_%H%M%S).sql

restore-db: ## Restore database from backup file
	@echo "Restoring database..."
	@read -p "Enter backup file path: " backup_file; \
	docker-compose exec -T postgres psql -U crisis_user -d crisis_db < $$backup_file

# Security targets
cert-generate: ## Generate self-signed certificates for development
	@echo "Generating self-signed certificates..."
	mkdir -p certs
	openssl req -new -newkey rsa:4096 -days 365 -nodes -x509 \
		-subj "/C=US/ST=CA/L=San Francisco/O=Serenity/CN=localhost" \
		-keyout certs/server.key -out certs/server.crt

# Health check targets
health-check: ## Check service health
	@echo "Checking service health..."
	curl -f http://localhost:8080/health || exit 1

ready-check: ## Check service readiness
	@echo "Checking service readiness..."
	curl -f http://localhost:8080/health/ready || exit 1

# Performance targets
profile-cpu: ## Run CPU profiling
	@echo "Running CPU profiling..."
	go test -cpuprofile=cpu.prof -bench=. ./...
	go tool pprof cpu.prof

profile-mem: ## Run memory profiling
	@echo "Running memory profiling..."
	go test -memprofile=mem.prof -bench=. ./...
	go tool pprof mem.prof

# Default target
all: clean deps quality build docker-build ## Run full build pipeline

# CI/CD targets
ci: deps quality test build ## Run CI pipeline
cd: docker-build docker-push ## Run CD pipeline