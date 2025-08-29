// Circuit Breaker Middleware for API Gateway
// Implements resilience patterns for microservice communication

const CircuitBreaker = require('opossum');

// Circuit breaker configurations per service
const circuitBreakerConfigs = {
  default: {
    timeout: 10000,           // 10 seconds timeout
    errorThresholdPercentage: 50, // Trip at 50% error rate
    resetTimeout: 30000,      // Try again after 30 seconds
    volumeThreshold: 10,      // Minimum 10 requests before calculating error rate
    // Fallback function
    fallback: (err, args) => ({
      error: 'Service temporarily unavailable',
      fallback: true,
      timestamp: new Date().toISOString()
    })
  },
  
  authService: {
    timeout: 5000,            // Auth should be fast
    errorThresholdPercentage: 30, // Lower tolerance for auth failures
    resetTimeout: 20000,
    volumeThreshold: 5,
    fallback: (err, args) => ({
      error: 'Authentication service unavailable',
      fallback: true,
      timestamp: new Date().toISOString()
    })
  },
  
  crisisService: {
    timeout: 15000,           // Crisis service needs more time
    errorThresholdPercentage: 70, // Higher tolerance - critical service
    resetTimeout: 10000,      // Quick recovery for crisis support
    volumeThreshold: 3,       // React quickly to failures
    fallback: async (err, args) => {
      // Emergency fallback for crisis support
      console.error('Crisis service down - activating emergency protocol');
      return {
        emergency: true,
        contacts: [
          { name: 'Emergency Services', number: '911' },
          { name: 'Crisis Hotline', number: '988' }
        ],
        message: 'Direct emergency support activated',
        timestamp: new Date().toISOString()
      };
    }
  },
  
  notificationService: {
    timeout: 8000,
    errorThresholdPercentage: 60,
    resetTimeout: 40000,
    volumeThreshold: 10,
    fallback: (err, args) => ({
      queued: true,
      message: 'Notification queued for retry',
      timestamp: new Date().toISOString()
    })
  }
};

// Circuit breaker instances
const circuitBreakers = new Map();

// Stats tracking
const stats = {
  requests: 0,
  failures: 0,
  fallbacks: 0,
  successes: 0,
  rejects: 0,
  timeouts: 0,
  cacheHits: 0
};

// Create or get circuit breaker for a service
function getCircuitBreaker(serviceName, customConfig = {}) {
  if (!circuitBreakers.has(serviceName)) {
    const config = {
      ...circuitBreakerConfigs.default,
      ...(circuitBreakerConfigs[serviceName] || {}),
      ...customConfig
    };
    
    // Create the circuit breaker
    const breaker = new CircuitBreaker(async function(request) {
      // The actual service call will be wrapped here
      return request();
    }, config);
    
    // Set up event listeners for monitoring
    breaker.on('open', () => {
      console.error(`Circuit breaker OPENED for ${serviceName}`);
      // Send alert to monitoring system
    });
    
    breaker.on('halfOpen', () => {
      console.log(`Circuit breaker HALF-OPEN for ${serviceName}`);
    });
    
    breaker.on('close', () => {
      console.log(`Circuit breaker CLOSED for ${serviceName}`);
    });
    
    breaker.on('fallback', (result) => {
      stats.fallbacks++;
      console.log(`Fallback triggered for ${serviceName}`);
    });
    
    breaker.on('success', () => {
      stats.successes++;
    });
    
    breaker.on('failure', () => {
      stats.failures++;
    });
    
    breaker.on('timeout', () => {
      stats.timeouts++;
    });
    
    breaker.on('reject', () => {
      stats.rejects++;
    });
    
    circuitBreakers.set(serviceName, breaker);
  }
  
  return circuitBreakers.get(serviceName);
}

// Express middleware
function circuitBreakerMiddleware(serviceName) {
  return async (req, res, next) => {
    stats.requests++;
    
    const breaker = getCircuitBreaker(serviceName);
    
    // Wrap the next middleware/route handler
    try {
      const result = await breaker.fire(async () => {
        // Create a promise that resolves when next() completes
        return new Promise((resolve, reject) => {
          // Store original methods
          const originalSend = res.send;
          const originalJson = res.json;
          const originalStatus = res.status;
          let statusCode = 200;
          
          // Override response methods to capture the response
          res.status = function(code) {
            statusCode = code;
            return originalStatus.call(this, code);
          };
          
          res.send = function(data) {
            res.send = originalSend;
            res.status = originalStatus;
            
            if (statusCode >= 500) {
              reject(new Error(`Service error: ${statusCode}`));
            } else {
              resolve(data);
            }
            
            return originalSend.call(this, data);
          };
          
          res.json = function(data) {
            res.json = originalJson;
            res.status = originalStatus;
            
            if (statusCode >= 500) {
              reject(new Error(`Service error: ${statusCode}`));
            } else {
              resolve(data);
            }
            
            return originalJson.call(this, data);
          };
          
          // Call the next middleware
          next();
        });
      });
      
      // If we get here, the circuit breaker succeeded
      // The response has already been sent by the wrapped handler
    } catch (error) {
      // Circuit breaker triggered or error occurred
      console.error(`Circuit breaker error for ${serviceName}:`, error);
      
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Service temporarily unavailable',
          service: serviceName,
          circuitBreaker: {
            state: breaker.state,
            stats: breaker.stats
          }
        });
      }
    }
  };
}

// Health check endpoint for circuit breakers
function getCircuitBreakerHealth() {
  const health = {
    overall: 'healthy',
    stats,
    breakers: {}
  };
  
  for (const [name, breaker] of circuitBreakers) {
    health.breakers[name] = {
      state: breaker.state,
      stats: breaker.stats,
      healthy: breaker.state !== 'open'
    };
    
    if (breaker.state === 'open') {
      health.overall = 'degraded';
    }
  }
  
  return health;
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down circuit breakers...');
  
  for (const [name, breaker] of circuitBreakers) {
    breaker.shutdown();
  }
  
  circuitBreakers.clear();
  console.log('Circuit breakers shut down successfully');
}

module.exports = {
  circuitBreakerMiddleware,
  getCircuitBreaker,
  getCircuitBreakerHealth,
  shutdown,
  stats
};