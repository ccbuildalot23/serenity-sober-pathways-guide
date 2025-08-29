# Serenity Docker Management Makefile
# Cross-platform commands for Docker container orchestration

.PHONY: help build deploy test clean logs status health security

# Default environment
ENV ?= dev
VERSION ?= latest

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Serenity Docker Management$(NC)"
	@echo "Usage: make [target] [ENV=dev|test|prod]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# Development commands
dev: ## Start development environment with hot reload
	@echo "$(BLUE)Starting development environment...$(NC)"
	@docker-compose -f docker-compose.dev.yml up -d --build
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "$(YELLOW)Main App: http://localhost:8080$(NC)"
	@echo "$(YELLOW)API Gateway: http://localhost:3003$(NC)"
	@echo "$(YELLOW)Adminer: http://localhost:8090$(NC)"

dev-logs: ## Follow development logs
	@docker-compose -f docker-compose.dev.yml logs -f

dev-stop: ## Stop development environment
	@echo "$(BLUE)Stopping development environment...$(NC)"
	@docker-compose -f docker-compose.dev.yml down
	@echo "$(GREEN)Development environment stopped!$(NC)"

# Test commands
test: ## Run test suite
	@echo "$(BLUE)Starting test environment...$(NC)"
	@docker-compose -f docker-compose.test.yml up -d postgres-test redis-test mongodb-test
	@echo "$(YELLOW)Waiting for test databases...$(NC)"
	@sleep 10
	@docker-compose -f docker-compose.test.yml --profile test up --abort-on-container-exit
	@docker-compose -f docker-compose.test.yml down

test-unit: ## Run unit tests only
	@docker-compose -f docker-compose.test.yml run --rm unit-tests

test-integration: ## Run integration tests
	@docker-compose -f docker-compose.test.yml up -d postgres-test redis-test mongodb-test
	@sleep 5
	@docker-compose -f docker-compose.test.yml run --rm integration-tests
	@docker-compose -f docker-compose.test.yml down

test-e2e: ## Run end-to-end tests
	@docker-compose -f docker-compose.test.yml up -d
	@sleep 10
	@docker-compose -f docker-compose.test.yml run --rm e2e-tests
	@docker-compose -f docker-compose.test.yml down

test-performance: ## Run performance tests
	@docker-compose -f docker-compose.test.yml --profile performance up --abort-on-container-exit
	@docker-compose -f docker-compose.test.yml down

# Production commands
prod: ## Deploy production environment
	@echo "$(BLUE)Deploying production environment...$(NC)"
	@echo "$(RED)WARNING: This will deploy to production!$(NC)"
	@read -p "Are you sure? (y/N) " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f docker-compose.prod.yml up -d --build; \
		echo "$(GREEN)Production environment deployed!$(NC)"; \
	else \
		echo "$(YELLOW)Deployment cancelled.$(NC)"; \
	fi

prod-logs: ## Follow production logs
	@docker-compose -f docker-compose.prod.yml logs -f

prod-stop: ## Stop production environment
	@echo "$(RED)Stopping production environment...$(NC)"
	@docker-compose -f docker-compose.prod.yml down

# Build commands
build: ## Build all Docker images
	@echo "$(BLUE)Building Docker images for $(ENV)...$(NC)"
	@./scripts/docker-build.ps1 -Environment $(ENV) -Version $(VERSION)

build-dev: ## Build development images
	@make build ENV=dev

build-prod: ## Build production images with security scan
	@make build ENV=prod

# Database commands
db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	@docker-compose -f docker-compose.$(ENV).yml exec postgres psql -U serenity_user -d serenity_$(ENV) -f /docker-entrypoint-initdb.d/01-init-serenity.sql
	@docker-compose -f docker-compose.$(ENV).yml exec postgres psql -U serenity_user -d serenity_$(ENV) -f /docker-entrypoint-initdb.d/02-create-tables.sql
	@docker-compose -f docker-compose.$(ENV).yml exec postgres psql -U serenity_user -d serenity_$(ENV) -f /docker-entrypoint-initdb.d/03-enable-rls.sql
	@echo "$(GREEN)Database migrations completed!$(NC)"

db-seed: ## Seed database with test data
	@echo "$(BLUE)Seeding database with test data...$(NC)"
	@docker-compose -f docker-compose.dev.yml run --rm test-data-seeder
	@echo "$(GREEN)Database seeded!$(NC)"

db-backup: ## Backup database
	@echo "$(BLUE)Creating database backup...$(NC)"
	@mkdir -p backups
	@docker-compose -f docker-compose.$(ENV).yml exec postgres pg_dump -U serenity_user serenity_$(ENV) > backups/serenity_$(ENV)_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Database backup created!$(NC)"

db-restore: ## Restore database from backup (specify BACKUP_FILE)
	@echo "$(BLUE)Restoring database from $(BACKUP_FILE)...$(NC)"
	@docker-compose -f docker-compose.$(ENV).yml exec -T postgres psql -U serenity_user serenity_$(ENV) < $(BACKUP_FILE)
	@echo "$(GREEN)Database restored!$(NC)"

# Monitoring commands
monitor: ## Start monitoring stack
	@echo "$(BLUE)Starting monitoring stack...$(NC)"
	@docker-compose -f docker-compose.$(ENV).yml up -d prometheus grafana
	@echo "$(GREEN)Monitoring started!$(NC)"
	@echo "$(YELLOW)Grafana: http://localhost:3001$(NC)"
	@echo "$(YELLOW)Prometheus: http://localhost:9090$(NC)"

logs: ## View logs for all services
	@docker-compose -f docker-compose.$(ENV).yml logs -f

logs-%: ## View logs for specific service (e.g., make logs-auth-service)
	@docker-compose -f docker-compose.$(ENV).yml logs -f $*

status: ## Show container status
	@echo "$(BLUE)Container Status:$(NC)"
	@docker-compose -f docker-compose.$(ENV).yml ps

health: ## Check service health
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo "$(YELLOW)API Gateway:$(NC)"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/health || echo "Service not responding"
	@echo ""
	@echo "$(YELLOW)Auth Service:$(NC)"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "Service not responding"
	@echo ""
	@echo "$(YELLOW)Notification Service:$(NC)"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "Service not responding"
	@echo ""
	@echo "$(YELLOW)Crisis Service:$(NC)"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health || echo "Service not responding"
	@echo ""

# Security commands
security: ## Run security scans on all images
	@echo "$(BLUE)Running security scans...$(NC)"
	@mkdir -p security-reports
	@for service in api-gateway auth-service notification-service crisis-service patient-portal frontend-app; do \
		echo "$(YELLOW)Scanning $$service...$(NC)"; \
		trivy image --format json --output security-reports/$$service-scan.json serenity-$$service:latest || echo "Scan failed for $$service"; \
	done
	@echo "$(GREEN)Security scans completed! Check security-reports/ directory.$(NC)"

security-summary: ## Show security scan summary
	@echo "$(BLUE)Security Scan Summary:$(NC)"
	@for file in security-reports/*-scan.json; do \
		if [ -f "$$file" ]; then \
			service=$$(basename "$$file" -scan.json); \
			critical=$$(jq -r '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' "$$file" 2>/dev/null || echo "0"); \
			high=$$(jq -r '[.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH")] | length' "$$file" 2>/dev/null || echo "0"); \
			echo "$(YELLOW)$$service:$(NC) Critical: $$critical, High: $$high"; \
		fi \
	done

# Cleanup commands
clean: ## Remove all containers and volumes
	@echo "$(BLUE)Cleaning up containers and volumes...$(NC)"
	@docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	@docker-compose -f docker-compose.test.yml down -v --remove-orphans
	@docker-compose -f docker-compose.prod.yml down -v --remove-orphans
	@echo "$(GREEN)Cleanup completed!$(NC)"

clean-images: ## Remove all Serenity Docker images
	@echo "$(BLUE)Removing Serenity Docker images...$(NC)"
	@docker images | grep serenity | awk '{print $$3}' | xargs -r docker rmi -f
	@echo "$(GREEN)Images cleaned!$(NC)"

clean-all: clean clean-images ## Remove everything (containers, volumes, images)
	@docker system prune -f
	@echo "$(GREEN)Complete cleanup finished!$(NC)"

# Utility commands
shell-%: ## Open shell in service container (e.g., make shell-auth-service)
	@docker-compose -f docker-compose.$(ENV).yml exec $* sh

psql: ## Connect to PostgreSQL database
	@docker-compose -f docker-compose.$(ENV).yml exec postgres psql -U serenity_user serenity_$(ENV)

redis-cli: ## Connect to Redis CLI
	@docker-compose -f docker-compose.$(ENV).yml exec redis redis-cli

mongo-shell: ## Connect to MongoDB shell
	@docker-compose -f docker-compose.$(ENV).yml exec mongodb mongosh

# CI/CD commands
ci-test: ## Run CI test suite
	@echo "$(BLUE)Running CI test suite...$(NC)"
	@make test
	@make security
	@echo "$(GREEN)CI tests completed!$(NC)"

ci-build: ## Build and test for CI
	@echo "$(BLUE)Building for CI...$(NC)"
	@make build-dev
	@make test
	@echo "$(GREEN)CI build completed!$(NC)"

ci-deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(NC)"
	@make build ENV=prod
	@docker-compose -f docker-compose.prod.yml up -d
	@echo "$(GREEN)Staging deployment completed!$(NC)"

# Quick actions
up: ## Start default environment
	@make $(ENV)

down: ## Stop default environment
	@make $(ENV)-stop

restart: ## Restart default environment
	@make down
	@make up

# Help is default target
.DEFAULT_GOAL := help