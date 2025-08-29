/**
 * Health Check API Endpoint
 * Provides comprehensive health status for the application
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    environment: process.env.VERCEL_ENV || 'development',
    checks: {}
  };

  try {
    // Check 1: Basic API response
    checks.checks.api = {
      status: 'healthy',
      responseTime: Date.now() - startTime
    };

    // Check 2: Environment variables
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );
    
    checks.checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'degraded',
      missingVars: missingEnvVars.length,
      details: missingEnvVars.length > 0 ? 'Missing environment variables' : 'All required variables present'
    };

    // Check 3: Supabase connectivity (if configured)
    if (process.env.VITE_SUPABASE_URL) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || ''}`
          },
          // Add timeout using setTimeout instead of AbortSignal for Node compatibility
        });
        
        checks.checks.database = {
          status: response.ok ? 'healthy' : 'degraded',
          responseTime: Date.now() - startTime,
          statusCode: response.status
        };
      } catch (error) {
        checks.checks.database = {
          status: 'unhealthy',
          error: 'Connection failed',
          details: error.message
        };
        checks.status = 'degraded';
      }
    } else {
      checks.checks.database = {
        status: 'unknown',
        details: 'Database URL not configured'
      };
    }

    // Check 4: Memory usage
    const memUsage = process.memoryUsage();
    const memLimit = 512 * 1024 * 1024; // 512MB typical Vercel limit
    const memPercentage = (memUsage.heapUsed / memLimit) * 100;
    
    checks.checks.memory = {
      status: memPercentage < 80 ? 'healthy' : memPercentage < 90 ? 'degraded' : 'unhealthy',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      percentage: Math.round(memPercentage) + '%'
    };

    // Check 5: Response time
    const totalResponseTime = Date.now() - startTime;
    checks.checks.performance = {
      status: totalResponseTime < 1000 ? 'healthy' : totalResponseTime < 3000 ? 'degraded' : 'unhealthy',
      responseTime: totalResponseTime + 'ms'
    };

    // Determine overall health status
    const allChecks = Object.values(checks.checks);
    if (allChecks.some(check => check.status === 'unhealthy')) {
      checks.status = 'unhealthy';
    } else if (allChecks.some(check => check.status === 'degraded')) {
      checks.status = 'degraded';
    }

    // Set appropriate status code
    const statusCode = checks.status === 'healthy' ? 200 : 
                       checks.status === 'degraded' ? 200 : 503;

    // Add metadata
    checks.metadata = {
      totalChecks: Object.keys(checks.checks).length,
      healthyChecks: allChecks.filter(c => c.status === 'healthy').length,
      degradedChecks: allChecks.filter(c => c.status === 'degraded').length,
      unhealthyChecks: allChecks.filter(c => c.status === 'unhealthy').length,
      responseTime: Date.now() - startTime + 'ms'
    };

    // Return health status
    return res.status(statusCode).json(checks);

  } catch (error) {
    // Handle unexpected errors
    console.error('Health check error:', error);
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error.message,
      responseTime: Date.now() - startTime + 'ms'
    });
  }
}