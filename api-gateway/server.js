// Simple API Gateway for Serenity Microservices
const express = require('express');
const httpProxy = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 8001;

// Enable CORS
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date(),
        upstreams: {
            auth: 'http://localhost:3000',
            notification: 'http://localhost:8000',
            crisis: 'http://localhost:3002'
        }
    });
});

// Aggregated health check
app.get('/health/all', async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    
    const services = [
        { name: 'auth', url: 'http://localhost:3000/health' },
        { name: 'notification', url: 'http://localhost:8000/health' },
        { name: 'crisis', url: 'http://localhost:3002/health' }
    ];
    
    const health = {};
    
    for (const service of services) {
        try {
            const response = await fetch(service.url);
            const data = await response.json();
            health[service.name] = { status: 'healthy', data };
        } catch (error) {
            health[service.name] = { status: 'unhealthy', error: error.message };
        }
    }
    
    res.json({
        gateway: 'healthy',
        services: health,
        timestamp: new Date()
    });
});

// Proxy configuration
const { createProxyMiddleware } = httpProxy;

// Auth Service routes
app.use('/api/auth', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' }
}));

// Notification Service routes
app.use('/api/notifications', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '' }
}));

// Crisis Service routes
app.use('/api/crisis', createProxyMiddleware({
    target: 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/crisis': '/api/crisis' }
}));

// Emergency route (direct to crisis service)
app.use('/api/emergency', createProxyMiddleware({
    target: 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/emergency': '/api/crisis' }
}));

// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Serenity API Gateway',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            healthAll: '/health/all',
            auth: '/api/auth/*',
            notifications: '/api/notifications/*',
            crisis: '/api/crisis/*',
            emergency: '/api/emergency/*'
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Gateway error:', err);
    res.status(500).json({
        error: 'Internal gateway error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`All services health: http://localhost:${PORT}/health/all`);
});