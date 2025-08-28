# Multi-stage build for React Native Patient Portal (Web Build)
FROM node:20-alpine AS base

# Install security updates and required tools
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl python3 make g++

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
EXPOSE 8081
CMD ["npm", "start"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --only=production --ignore-scripts && npm cache clean --force
COPY . .
# Build for web using React Native Web
RUN npm run build:web

# Production stage - Serve static build
FROM nginx:alpine AS production

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Expose port
EXPOSE 8081

# Labels for metadata
LABEL maintainer="Serenity Healthcare Team"
LABEL description="React Native Patient Portal - Web Build"
LABEL version="1.0.0"

CMD ["nginx", "-g", "daemon off;"]