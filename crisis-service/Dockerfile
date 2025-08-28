# Multi-stage build for Node.js Crisis Service
FROM node:20-alpine AS base

# Install security updates and required tools
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS dev
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3002
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --only=production --ignore-scripts && npm cache clean --force
COPY . .

# Production stage
FROM base AS production

ENV NODE_ENV=production
ENV PORT=3002

# Copy application files
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && \
    chown -R nodejs:nodejs logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Security: Run as non-root user
USER nodejs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "server.js"]

# Expose port
EXPOSE 3002

# Labels for metadata
LABEL maintainer="Serenity Healthcare Team"
LABEL description="HIPAA-compliant crisis management service"
LABEL version="2.0.0"