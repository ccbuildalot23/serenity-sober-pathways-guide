import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Shield,
  Zap,
  Users,
  Database,
  Bell,
  Download,
  Activity,
  BarChart3,
  Settings,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { integrationTestingService, type TestResult } from '@/services/integrationTestingService';
import { performanceOptimizationService } from '@/services/performanceOptimizationService';
import { securityAuditService, type SecurityAuditReport } from '@/services/securityAuditService';

export function ComprehensiveIntegrationTestDashboard() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [securityReport, setSecurityReport] = useState<SecurityAuditReport | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isRunningSecurityAudit, setIsRunningSecurityAudit] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to test results
    const unsubscribe = integrationTestingService.subscribeToResults(setTestResults);
    
    // Load initial data
    loadPerformanceMetrics();
    
    return unsubscribe;
  }, []);

  const loadPerformanceMetrics = async () => {
    try {
      const metrics = performanceOptimizationService.getPerformanceMetrics();
      const bundleAnalysis = await performanceOptimizationService.analyzeBundleSize();
      const cacheStats = performanceOptimizationService.getCacheStats();
      
      setPerformanceMetrics({
        ...metrics,
        bundleAnalysis,
        cacheStats
      });
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  };

  const runAllIntegrationTests = async () => {
    setIsRunningTests(true);
    try {
      toast({
        title: 'Integration Tests Started',
        description: 'Running comprehensive integration tests...',
      });
      
      await integrationTestingService.runAllTests();
      
      toast({
        title: 'Integration Tests Complete',
        description: 'All integration tests have finished',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Test Execution Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const runSecurityAudit = async () => {
    setIsRunningSecurityAudit(true);
    try {
      toast({
        title: 'Security Audit Started',
        description: 'Running comprehensive security audit...',
      });
      
      const report = await securityAuditService.runSecurityAudit();
      setSecurityReport(report);
      
      toast({
        title: 'Security Audit Complete',
        description: `Compliance Score: ${report.complianceScore}%`,
        variant: report.complianceScore >= 80 ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Security Audit Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsRunningSecurityAudit(false);
    }
  };

  const clearAllResults = () => {
    integrationTestingService.clearResults();
    setSecurityReport(null);
    performanceOptimizationService.clearCache();
    loadPerformanceMetrics();
    
    toast({
      title: 'Results Cleared',
      description: 'All test results and caches have been cleared',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTestProgress = () => {
    if (testResults.length === 0) return 0;
    const completed = testResults.filter(r => r.status === 'passed' || r.status === 'failed').length;
    return (completed / testResults.length) * 100;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-6 h-6" />
                Comprehensive Integration Testing
              </CardTitle>
              <CardDescription>
                End-to-end testing, performance optimization, and security auditing
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={clearAllResults}
                disabled={isRunningTests || isRunningSecurityAudit}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Results
              </Button>
              <Button 
                onClick={runSecurityAudit}
                disabled={isRunningTests || isRunningSecurityAudit}
                variant="secondary"
              >
                <Shield className="w-4 h-4 mr-2" />
                {isRunningSecurityAudit ? 'Running...' : 'Security Audit'}
              </Button>
              <Button 
                onClick={runAllIntegrationTests}
                disabled={isRunningTests || isRunningSecurityAudit}
              >
                <Play className="w-4 h-4 mr-2" />
                {isRunningTests ? 'Running...' : 'Run All Tests'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="user-flows">User Flows</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Integration Tests</p>
                    <p className="text-2xl font-bold">
                      {testResults.filter(r => r.status === 'passed').length}/{testResults.length}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <Progress value={getTestProgress()} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Security Score</p>
                    <p className="text-2xl font-bold">
                      {securityReport ? `${securityReport.complianceScore}%` : 'N/A'}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
                {securityReport && (
                  <Progress value={securityReport.complianceScore} className="mt-2" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Bundle Size</p>
                    <p className="text-2xl font-bold">
                      {performanceMetrics?.bundleAnalysis ? 
                        formatBytes(performanceMetrics.bundleAnalysis.totalSize) : 
                        'Loading...'
                      }
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {testResults.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No test results yet. Run integration tests to see results.
                    </p>
                  ) : (
                    testResults.map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <p className="font-medium">{result.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.duration ? formatDuration(result.duration) : 'No duration'} • 
                              {result.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          result.status === 'passed' ? 'default' : 
                          result.status === 'failed' ? 'destructive' : 
                          'secondary'
                        }>
                          {result.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-flows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Flow Testing</CardTitle>
              <CardDescription>
                End-to-end testing of critical user journeys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'new-user-onboarding', name: 'New User Onboarding', icon: <Users className="w-5 h-5" /> },
                  { id: 'crisis-intervention', name: 'Crisis Intervention', icon: <AlertTriangle className="w-5 h-5" /> },
                  { id: 'data-export-flow', name: 'Data Export Flow', icon: <Download className="w-5 h-5" /> },
                  { id: 'notification-system', name: 'Notification System', icon: <Bell className="w-5 h-5" /> }
                ].map((flow) => {
                  const result = testResults.find(r => r.id === flow.id);
                  return (
                    <div key={flow.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {flow.icon}
                          <h3 className="font-medium">{flow.name}</h3>
                        </div>
                        {result && getStatusIcon(result.status)}
                      </div>
                      {result && (
                        <div className="text-sm text-muted-foreground">
                          {result.error ? (
                            <Alert variant="destructive" className="mt-2">
                              <AlertDescription>{result.error}</AlertDescription>
                            </Alert>
                          ) : (
                            <p>✓ Test completed successfully</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Testing</CardTitle>
              <CardDescription>
                Verify all external integrations and connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'supabase-connections', name: 'Supabase Database', icon: <Database className="w-5 h-5" /> },
                  { id: 'notification-system', name: 'Notification System', icon: <Bell className="w-5 h-5" /> }
                ].map((integration) => {
                  const result = testResults.find(r => r.id === integration.id);
                  return (
                    <div key={integration.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {integration.icon}
                          <h3 className="font-medium">{integration.name}</h3>
                        </div>
                        {result && getStatusIcon(result.status)}
                      </div>
                      {result?.details && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <pre className="text-xs bg-muted p-2 rounded">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Application performance analysis and optimization recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performanceMetrics ? (
                <div className="space-y-6">
                  {/* Loading Performance */}
                  <div>
                    <h3 className="font-semibold mb-3">Loading Performance</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {performanceMetrics.paint?.firstContentfulPaint ? 
                            formatDuration(performanceMetrics.paint.firstContentfulPaint) : 
                            'N/A'
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">First Contentful Paint</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {performanceMetrics.navigation?.domContentLoadedEventEnd ? 
                            formatDuration(performanceMetrics.navigation.domContentLoadedEventEnd - 
                              performanceMetrics.navigation.domContentLoadedEventStart) : 
                            'N/A'
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">DOM Content Loaded</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{performanceMetrics.resources?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Resources Loaded</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {formatBytes(performanceMetrics.bundleAnalysis?.totalSize || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Bundle Size</p>
                      </div>
                    </div>
                  </div>

                  {/* Bundle Analysis */}
                  {performanceMetrics.bundleAnalysis?.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Optimization Recommendations</h3>
                      <div className="space-y-2">
                        {performanceMetrics.bundleAnalysis.recommendations.map((rec: string, index: number) => (
                          <Alert key={index}>
                            <Zap className="h-4 w-4" />
                            <AlertDescription>{rec}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cache Statistics */}
                  <div>
                    <h3 className="font-semibold mb-3">Cache Statistics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{performanceMetrics.cacheStats?.apiCacheSize || 0}</p>
                        <p className="text-sm text-muted-foreground">API Cache Entries</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{performanceMetrics.cacheStats?.imageCacheSize || 0}</p>
                        <p className="text-sm text-muted-foreground">Image Cache Entries</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {formatBytes(performanceMetrics.cacheStats?.totalMemoryUsage || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Memory Usage</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Loading performance metrics...
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Audit Results</CardTitle>
              <CardDescription>
                Comprehensive security assessment and compliance check
              </CardDescription>
            </CardHeader>
            <CardContent>
              {securityReport ? (
                <div className="space-y-6">
                  {/* Security Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{securityReport.summary.passed}</p>
                      <p className="text-sm text-muted-foreground">Passed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">{securityReport.summary.failed}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-500">{securityReport.summary.critical}</p>
                      <p className="text-sm text-muted-foreground">Critical</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-orange-500">{securityReport.summary.high}</p>
                      <p className="text-sm text-muted-foreground">High</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-500">{securityReport.complianceScore}%</p>
                      <p className="text-sm text-muted-foreground">Compliance</p>
                    </div>
                  </div>

                  {/* Security Tests */}
                  <div>
                    <h3 className="font-semibold mb-3">Security Tests</h3>
                    <div className="space-y-2">
                      {securityReport.tests.map((test) => (
                        <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(test.status)}
                            <div>
                              <p className="font-medium">{test.name}</p>
                              <p className="text-sm text-muted-foreground">{test.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              test.severity === 'critical' ? 'destructive' :
                              test.severity === 'high' ? 'destructive' :
                              test.severity === 'medium' ? 'default' :
                              'secondary'
                            }>
                              {test.severity}
                            </Badge>
                            <Badge variant={test.status === 'passed' ? 'default' : 'destructive'}>
                              {test.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {securityReport.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Security Recommendations</h3>
                      <div className="space-y-2">
                        {securityReport.recommendations.map((rec, index) => (
                          <Alert key={index} variant={rec.includes('CRITICAL') ? 'destructive' : 'default'}>
                            <Shield className="h-4 w-4" />
                            <AlertDescription>{rec}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No security audit results yet.
                  </p>
                  <Button onClick={runSecurityAudit} disabled={isRunningSecurityAudit}>
                    <Shield className="w-4 h-4 mr-2" />
                    Run Security Audit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}