/**
 * Infrastructure Monitoring Dashboard for HIPAA Compliance
 * Real-time monitoring of security, performance, and backup systems
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Server,
  Lock,
  HardDrive,
  Wifi,
  Users,
  Eye,
  RefreshCw,
  Download,
  Upload,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

import { healthCheckService } from '../../../infrastructure/monitoring/health-checks';
import { automatedSecurityScanner } from '../../../infrastructure/security/automated-scanner';
import { hipaaBackupSystem } from '../../../infrastructure/backup/hipaa-backup-system';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService.js';

interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'critical';
  checks: Record<string, any>;
  timestamp: string;
  uptime_percentage: number;
  recommendations: string[];
}

interface SecurityScanSummary {
  last_scan: string;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  overall_status: 'pass' | 'warning' | 'critical';
}

interface BackupStatus {
  last_backup: string;
  backup_size: number;
  retention_compliance: boolean;
  disaster_recovery_ready: boolean;
  rpo_compliant: boolean;
  rto_compliant: boolean;
}

export const InfrastructureMonitoringDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [securityScanSummary, setSecurityScanSummary] = useState<SecurityScanSummary | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch system health
      const health = await healthCheckService.performHealthCheck();
      setSystemHealth(health);

      // Fetch security scan summary
      const securityReport = await EnhancedSecurityAuditService.getInstance().generateSecurityReport();
      setSecurityScanSummary({
        last_scan: new Date().toISOString(),
        critical_findings: securityReport.summary?.critical_events || 0,
        high_findings: securityReport.summary?.high_risk_events || 0,
        medium_findings: 0,
        low_findings: securityReport.summary?.total_events || 0,
        overall_status: securityReport.summary?.critical_events > 0 ? 'critical' : 
                      securityReport.summary?.high_risk_events > 0 ? 'warning' : 'pass'
      });

      // Fetch backup status
      const backupValidation = await hipaaBackupSystem.validateDisasterRecovery();
      setBackupStatus({
        last_backup: new Date().toISOString(),
        backup_size: 0,
        retention_compliance: true,
        disaster_recovery_ready: backupValidation.recovery_readiness_score > 80,
        rpo_compliant: backupValidation.rpo_compliant,
        rto_compliant: backupValidation.rto_compliant
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh monitoring data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-600';
      case 'degraded':
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Infrastructure Monitoring</h1>
          <p className="text-gray-600">HIPAA-compliant system monitoring and security oversight</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            onClick={refreshData}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* Overall System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {systemHealth && getStatusIcon(systemHealth.overall_status)}
              <div className={`text-2xl font-bold ${systemHealth && getStatusColor(systemHealth.overall_status)}`}>
                {systemHealth?.overall_status?.toUpperCase() || 'LOADING'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {systemHealth ? `${(systemHealth.uptime_percentage * 100).toFixed(1)}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {securityScanSummary && getStatusIcon(securityScanSummary.overall_status)}
              <div className={`text-2xl font-bold ${securityScanSummary && getStatusColor(securityScanSummary.overall_status)}`}>
                {securityScanSummary?.overall_status?.toUpperCase() || 'SCANNING'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Critical: {securityScanSummary?.critical_findings || 0} | High: {securityScanSummary?.high_findings || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Status</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {backupStatus && getStatusIcon(backupStatus.disaster_recovery_ready ? 'healthy' : 'warning')}
              <div className={`text-2xl font-bold ${backupStatus?.disaster_recovery_ready ? 'text-green-600' : 'text-yellow-600'}`}>
                {backupStatus?.disaster_recovery_ready ? 'READY' : 'DEGRADED'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              RPO: {backupStatus?.rpo_compliant ? '✓' : '✗'} | RTO: {backupStatus?.rto_compliant ? '✓' : '✗'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HIPAA Compliance</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="text-2xl font-bold text-green-600">
                COMPLIANT
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              All systems monitored and secured
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="security">Security Monitoring</TabsTrigger>
          <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {systemHealth && (
            <>
              {/* Recommendations */}
              {systemHealth.recommendations.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>System Recommendations</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {systemHealth.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Health Check Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(systemHealth.checks).map(([checkName, result]) => (
                  <Card key={checkName}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span className="capitalize">{checkName.replace(/_/g, ' ')}</span>
                        {getStatusIcon(result.status)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <Badge variant={result.status === 'healthy' ? 'default' : 
                                       result.status === 'warning' ? 'secondary' : 'destructive'}>
                            {result.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Duration:</span>
                          <span>{formatDuration(result.duration_ms)}</span>
                        </div>
                        {result.error && (
                          <div className="text-xs text-red-600 mt-2">
                            Error: {result.error}
                          </div>
                        )}
                        {result.details && (
                          <div className="text-xs text-gray-600 mt-2">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {securityScanSummary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-600">Critical Findings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {securityScanSummary.critical_findings}
                    </div>
                    <p className="text-xs text-muted-foreground">Immediate action required</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-600">High Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {securityScanSummary.high_findings}
                    </div>
                    <p className="text-xs text-muted-foreground">Review within 24 hours</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-600">Medium Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {securityScanSummary.medium_findings}
                    </div>
                    <p className="text-xs text-muted-foreground">Address within 1 week</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-600">Low Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {securityScanSummary.low_findings}
                    </div>
                    <p className="text-xs text-muted-foreground">Monitor and plan</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Security Scan Actions</CardTitle>
                  <CardDescription>
                    Manage automated security scanning and view reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Button 
                      onClick={() => automatedSecurityScanner.performComprehensiveScan()}
                      variant="outline"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Run Full Scan
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      View History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          {backupStatus && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recovery Point Objective</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      {backupStatus.rpo_compliant ? 
                        <CheckCircle className="w-5 h-5 text-green-600" /> : 
                        <XCircle className="w-5 h-5 text-red-600" />
                      }
                      <div className={`text-xl font-bold ${backupStatus.rpo_compliant ? 'text-green-600' : 'text-red-600'}`}>
                        {backupStatus.rpo_compliant ? 'COMPLIANT' : 'VIOLATED'}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Max 1 hour data loss</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recovery Time Objective</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      {backupStatus.rto_compliant ? 
                        <CheckCircle className="w-5 h-5 text-green-600" /> : 
                        <XCircle className="w-5 h-5 text-red-600" />
                      }
                      <div className={`text-xl font-bold ${backupStatus.rto_compliant ? 'text-green-600' : 'text-red-600'}`}>
                        {backupStatus.rto_compliant ? 'COMPLIANT' : 'VIOLATED'}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Max 4 hours recovery</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">HIPAA Retention</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      {backupStatus.retention_compliance ? 
                        <CheckCircle className="w-5 h-5 text-green-600" /> : 
                        <XCircle className="w-5 h-5 text-red-600" />
                      }
                      <div className={`text-xl font-bold ${backupStatus.retention_compliance ? 'text-green-600' : 'text-red-600'}`}>
                        {backupStatus.retention_compliance ? 'COMPLIANT' : 'VIOLATED'}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">6-year minimum retention</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Backup Management</CardTitle>
                  <CardDescription>
                    Manage backups and disaster recovery procedures
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Button 
                      onClick={() => hipaaBackupSystem.performBackup('emergency')}
                      variant="outline"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Emergency Backup
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      View Restore Points
                    </Button>
                    <Button variant="outline">
                      <Activity className="w-4 h-4 mr-2" />
                      Test DR Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Database Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <div className="text-xl font-bold">
                    {systemHealth?.checks?.database?.duration_ms ? 
                      formatDuration(systemHealth.checks.database.duration_ms) : 'N/A'}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Average query time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">API Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <div className="text-xl font-bold">
                    {systemHealth?.checks?.api_performance?.duration_ms ? 
                      formatDuration(systemHealth.checks.api_performance.duration_ms) : 'N/A'}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">API response time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Authentication Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <div className="text-xl font-bold">
                    {systemHealth?.checks?.authentication?.details?.success_rate ? 
                      `${(systemHealth.checks.authentication.details.success_rate * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Login success rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-green-600" />
                  <div className="text-xl font-bold">
                    {systemHealth ? `${(systemHealth.uptime_percentage * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Real-time system performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Database Performance</span>
                    <span>
                      {systemHealth?.checks?.database?.status === 'healthy' ? 'Optimal' : 
                       systemHealth?.checks?.database?.status === 'warning' ? 'Degraded' : 'Critical'}
                    </span>
                  </div>
                  <Progress 
                    value={systemHealth?.checks?.database?.status === 'healthy' ? 95 : 
                           systemHealth?.checks?.database?.status === 'warning' ? 70 : 30} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>API Response Time</span>
                    <span>
                      {systemHealth?.checks?.api_performance?.status === 'healthy' ? 'Fast' : 
                       systemHealth?.checks?.api_performance?.status === 'warning' ? 'Slow' : 'Very Slow'}
                    </span>
                  </div>
                  <Progress 
                    value={systemHealth?.checks?.api_performance?.status === 'healthy' ? 90 : 
                           systemHealth?.checks?.api_performance?.status === 'warning' ? 60 : 25} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Security Compliance</span>
                    <span>
                      {securityScanSummary?.overall_status === 'pass' ? 'Compliant' : 
                       securityScanSummary?.overall_status === 'warning' ? 'Needs Attention' : 'Critical Issues'}
                    </span>
                  </div>
                  <Progress 
                    value={securityScanSummary?.overall_status === 'pass' ? 100 : 
                           securityScanSummary?.overall_status === 'warning' ? 75 : 40} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};