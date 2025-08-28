# Multi-stage build for production optimization
FROM node:20-alpine AS base

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Development stage
FROM base AS dev
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
EXPOSE 3001
USER nodejs
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --only=production --ignore-scripts && npm cache clean --force
COPY . .
RUN npm run build

# Production stage
FROM base AS production

ENV NODE_ENV=production
ENV PORT=3000

# Copy application files directly (no build step needed for ES modules)
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && \
    chown -R nodejs:nodejs logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "import http from 'http'; \
        const req=http.request({hostname:'localhost',port:3000,path:'/health',timeout:5000}, (res) => { \
        if(res.statusCode===200) process.exit(0); else process.exit(1); \
        }); req.on('error',()=>process.exit(1)); req.end();"

# Security: Run as non-root user
USER nodejs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "server.js"]

# Expose port
EXPOSE 3000

# Labels for metadata
LABEL maintainer="Serenity Healthcare Team"
LABEL description="HIPAA-compliant authentication service"
LABEL version="1.0.0"