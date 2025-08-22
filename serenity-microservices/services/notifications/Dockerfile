# Multi-stage build for Node.js TypeScript application
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies for building native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    dumb-init

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development

# Install all dependencies including dev dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Expose port
EXPOSE 3003

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build

# Install all dependencies for building
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S notifications -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy migration files
COPY --from=build /app/migrations ./migrations

# Create logs directory
RUN mkdir -p logs && chown -R notifications:nodejs logs

# Copy health check script
COPY --from=build /app/scripts/health-check.js ./scripts/

# Switch to non-root user
USER notifications

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node scripts/health-check.js || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# Labels for metadata
LABEL maintainer="Serenity Team <team@serenity.com>"
LABEL version="1.0.0"
LABEL description="HIPAA-compliant notification service for Serenity platform"
LABEL org.opencontainers.image.source="https://github.com/serenity/notification-service"
LABEL org.opencontainers.image.vendor="Serenity"
LABEL org.opencontainers.image.title="Serenity Notification Service"
LABEL org.opencontainers.image.description="Multi-channel notification service with HIPAA compliance"
LABEL org.opencontainers.image.version="1.0.0"