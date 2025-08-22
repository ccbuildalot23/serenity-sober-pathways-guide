#!/usr/bin/env node

/**
 * Health check script for the API Gateway
 * Used by Docker health checks and monitoring systems
 */

const http = require('http');

const options = {
  hostname: process.env.HEALTH_CHECK_HOST || 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000')
};

const healthCheck = () => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const healthData = JSON.parse(data);
          
          if (res.statusCode === 200 && healthData.status === 'healthy') {
            console.log('✅ Health check passed:', healthData);
            resolve(true);
          } else {
            console.error('❌ Health check failed:', {
              statusCode: res.statusCode,
              status: healthData.status || 'unknown',
              data: healthData
            });
            reject(new Error(`Health check failed with status ${res.statusCode}`));
          }
        } catch (error) {
          console.error('❌ Health check response parsing failed:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Health check request failed:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      const error = new Error('Health check timed out');
      console.error('❌ Health check timed out');
      reject(error);
    });

    req.setTimeout(options.timeout);
    req.end();
  });
};

// Run health check
healthCheck()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Health check failed:', error.message);
    process.exit(1);
  });