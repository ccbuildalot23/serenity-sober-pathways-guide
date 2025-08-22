# Multi-stage Docker build for Security Service
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set working directory
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY --chown=appuser:appgroup .env.example ./.env.example

# Create logs directory
RUN mkdir -p logs && \
    chown -R appuser:appgroup logs

# Create health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:${PORT:-3001}/health || exit 1' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

# Set security headers and limits
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Expose port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /healthcheck.sh

# Switch to non-root user
USER appuser

# Set process title
ENV npm_config_process_title="serenity-security-service"

# Start the application
CMD ["node", "dist/index.js"]

# Labels for container metadata
LABEL maintainer="Serenity Team" \
      service="security-service" \
      version="1.0.0" \
      description="HIPAA-compliant security and audit logging microservice" \
      org.opencontainers.image.title="Serenity Security Service" \
      org.opencontainers.image.description="HIPAA-compliant security and audit logging microservice for Serenity platform" \
      org.opencontainers.image.vendor="Serenity" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.source="https://github.com/serenity/security-service"