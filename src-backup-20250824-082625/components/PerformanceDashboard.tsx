import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  version: string;
  _buildTimestamp: string;
  environment: 'development' | 'staging' | 'production';
  _uptime: string;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: string;
  };
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    version: '1.0.0',
    _buildTimestamp: new Date().toISOString(),
    environment: import.meta.env.MODE as 'development' | 'staging' | 'production',
    _uptime: '0s'
  });
  
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const _updateMetrics = () => {
      const now = Date.now();
      const uptimeMs = now - startTime;
      const uptimeSeconds = Math.floor(uptimeMs / 1000);
      const uptimeMinutes = Math.floor(uptimeSeconds / 60);
      const uptimeHours = Math.floor(uptimeMinutes / 60);

      let uptimeString = '';
      if (uptimeHours > 0) {
        uptimeString = `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`;
      } else if (uptimeMinutes > 0) {
        uptimeString = `${uptimeMinutes}m ${uptimeSeconds % 60}s`;
      } else {
        uptimeString = `${uptimeSeconds}s`;
      }

      // Try to get memory info if available (performance.memory is non-standard)
      let memoryInfo = undefined;
      if ('memory' in performance && (performance as any).memory) {
        const mem = (performance as any).memory;
        memoryInfo = {
          used: Math.round(mem.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(mem.totalJSHeapSize / 1024 / 1024), // MB
          percentage: `${Math.round((mem.usedJSHeapSize / mem.totalJSHeapSize) * 100)}%`
        };
      }

      setMetrics(prev => ({
        ...prev,
        _uptime: uptimeString,
        _buildTimestamp: import.meta.env.BUILD_TIME || new Date().toISOString(),
        memoryUsage: memoryInfo
      }));
    };

    // Update immediately
    _updateMetrics();
    
    // Update every second
    const _interval = setInterval(_updateMetrics, 1000);
    
    return () => clearInterval(_interval);
  }, [startTime]);

  const getEnvironmentColor = (_env: string) => {
    switch (_env) {
      case 'production':
        return '#ef4444'; // red-500
      case 'staging':
        return '#f59e0b'; // amber-500
      case 'development':
      default:
        return '#10b981'; // emerald-500
    }
  };

  const getEnvironmentBgColor = (_env: string) => {
    switch (_env) {
      case 'production':
        return '#fef2f2'; // red-50
      case 'staging':
        return '#fffbeb'; // amber-50
      case 'development':
      default:
        return '#f0fdf4'; // emerald-50
    }
  };

  return (
    <div style={{
      position: 'fixed',
      _top: '10px',
      _right: '10px',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      _fontFamily: 'monospace',
      _boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      zIndex: 9999,
      minWidth: '200px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getEnvironmentColor(metrics.environment)
        }}></div>
        <strong style={{ fontSize: '14px' }}>Performance Dashboard</strong>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Version:</span>
          <span style={{ fontWeight: 'bold' }}>{metrics.version}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Environment:</span>
          <span style={{
            backgroundColor: getEnvironmentBgColor(metrics.environment),
            color: getEnvironmentColor(metrics.environment),
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {metrics.environment}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Uptime:</span>
          <span style={{ fontWeight: 'bold', color: '#059669' }}>{metrics._uptime}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Build:</span>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>
            {new Date(metrics._buildTimestamp).toLocaleTimeString()}
          </span>
        </div>

        {metrics.memoryUsage && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Memory:</span>
            <span style={{ fontSize: '10px' }}>
              {metrics.memoryUsage.used}MB / {metrics.memoryUsage.total}MB ({metrics.memoryUsage.percentage})
            </span>
          </div>
        )}
      </div>

      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '10px',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        Serenity Recovery Platform
      </div>
    </div>
  );
};

export default PerformanceDashboard;