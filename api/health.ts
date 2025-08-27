import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Health check endpoint for monitoring
 * Provides system status without exposing sensitive information
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'up' | 'down';
    auth: 'up' | 'down';
    storage: 'up' | 'down';
  };
  responseTime: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VITE_APP_VERSION || '1.0.0',
    services: {
      database: 'up',
      auth: 'up',
      storage: 'up'
    },
    responseTime: 0
  };

  try {
    // Check database connectivity
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      // Simple query to test database connection
      const { error: dbError } = await Promise.race([
        supabase.from('profiles').select('count').limit(1).single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 5000)
        )
      ]);

      if (dbError) {
        health.services.database = 'down';
        health.status = 'degraded';
      }

      // Check auth service
      const { error: authError } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
      ]);

      if (authError) {
        health.services.auth = 'down';
        health.status = 'degraded';
      }
    } else {
      // If environment variables are not set, mark as unhealthy
      health.status = 'unhealthy';
      health.services.database = 'down';
      health.services.auth = 'down';
    }

    // Calculate response time
    health.responseTime = Date.now() - startTime;

    // Determine overall health status
    const servicesDown = Object.values(health.services).filter(s => s === 'down').length;
    if (servicesDown === 0) {
      health.status = 'healthy';
    } else if (servicesDown >= 2) {
      health.status = 'unhealthy';
    }

    // Set appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 503 : 500;

    // Add cache headers to prevent excessive checks
    res.setHeader('Cache-Control', 'no-cache, max-age=0');
    res.setHeader('X-Health-Check', 'true');

    return res.status(statusCode).json(health);

  } catch (error) {
    // If there's an unexpected error, return unhealthy status
    health.status = 'unhealthy';
    health.responseTime = Date.now() - startTime;
    
    return res.status(500).json({
      ...health,
      error: 'Health check failed'
    });
  }
}