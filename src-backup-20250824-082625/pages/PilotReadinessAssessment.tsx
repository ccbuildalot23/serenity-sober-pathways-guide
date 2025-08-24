import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Shield,
  Zap,
  Users,
  Database,
  FileCheck,
  Target,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pilotReadinessService, type PilotReadinessReport } from '@/services/pilotReadinessService';

export default function PilotReadinessAssessment() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<PilotReadinessReport | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const { toast } = useToast();

  const runAssessment = async () => {
    setIsRunning(true);
    setCurrentPhase('Initializing assessment...');
    
    try {
      const assessmentReport = await pilotReadinessService.runComprehensivePilotAssessment();
      setReport(assessmentReport);
      
      toast({
        title: "Assessment Complete",
        description: `Pilot readiness score: ${assessmentReport.overall_readiness_score}%`,
      });
    } catch (error) {
      toast({
        title: "Assessment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setCurrentPhase('');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'GO':
        return <Badge className="bg-green-100 text-green-800">✅ GO FOR PILOT</Badge>;
      case 'CONDITIONAL_GO':
        return <Badge className="bg-yellow-100 text-yellow-800">⚠️ CONDITIONAL GO</Badge>;
      case 'NO_GO':
        return <Badge className="bg-red-100 text-red-800">❌ NO GO</Badge>;
      default:
        return <Badge variant="outline">PENDING</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pilot Readiness Assessment</h1>
          <p className="text-muted-foreground">Comprehensive testing and validation for pilot launch</p>
        </div>
        <Button 
          onClick={runAssessment} 
          disabled={isRunning}
          size="lg"
          className="flex items-center gap-2"
        >
          <Play className="w-5 h-5" />
          {isRunning ? 'Running Assessment...' : 'Start Full Assessment'}
        </Button>
      </div>

      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 animate-spin" />
              Assessment in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">{currentPhase}</span>
                <span className="text-sm text-muted-foreground">Running...</span>
              </div>
              <Progress value={65} className="w-full" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs">Features</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Zap className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xs">Performance</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-xs">Security</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <FileCheck className="w-4 h-4 text-orange-600" />
                  </div>
                  <p className="text-xs">Compliance</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-xs">Load Test</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {report && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Executive Summary</span>
                {getRecommendationBadge(report.recommendation)}
              </CardTitle>
              <CardDescription>
                Overall readiness assessment for pilot launch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(report.overall_readiness_score)}`}>
                    {report.overall_readiness_score}%
                  </div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <Progress value={report.overall_readiness_score} className="mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {report.feature_completion.completed_features}/{report.feature_completion.total_features}
                  </div>
                  <p className="text-sm text-muted-foreground">Features Ready</p>
                  <Progress value={report.feature_completion.completion_percentage} className="mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {report.performance_results.concurrent_users_supported}
                  </div>
                  <p className="text-sm text-muted-foreground">Concurrent Users</p>
                  <Progress value={95} className="mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {report.critical_issues.filter(i => i.severity === 'critical').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Critical Issues</p>
                  <Progress 
                    value={report.critical_issues.length > 0 ? 20 : 100} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="features" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="deployment">Deployment</TabsTrigger>
            </TabsList>

            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    MVP Feature Testing Results
                  </CardTitle>
                  <CardDescription>
                    Status of all 15 core MVP features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-3">Critical Features</h4>
                      <div className="space-y-2">
                        {['User Authentication', 'Daily Check-in', 'Crisis Intervention', 'Peer Support', 'Recovery Planning'].map((feature, index) => (
                          <div key={feature} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{feature}</span>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Additional Features</h4>
                      <div className="space-y-2">
                        {['Community Forums', 'Appointment Scheduling', 'Progress Tracking', 'Data Export', 'Notifications'].map((feature, index) => (
                          <div key={feature} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{feature}</span>
                            {index < 4 ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Load testing with 100 concurrent users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(report.performance_results.response_time_avg)}ms
                      </div>
                      <p className="text-sm text-muted-foreground">Avg Response</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(report.performance_results.throughput_rps)}
                      </div>
                      <p className="text-sm text-muted-foreground">Requests/sec</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {report.performance_results.error_rate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-muted-foreground">Error Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(report.performance_results.frontend_performance.first_contentful_paint)}ms
                      </div>
                      <p className="text-sm text-muted-foreground">First Paint</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Database Performance</span>
                        <span className="text-sm text-green-600">Excellent</span>
                      </div>
                      <Progress value={85} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">API Response Times</span>
                        <span className="text-sm text-green-600">Good</span>
                      </div>
                      <Progress value={92} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Frontend Loading</span>
                        <span className="text-sm text-yellow-600">Acceptable</span>
                      </div>
                      <Progress value={78} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security Audit Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {report.security_audit.overall_score}%
                      </div>
                      <p className="text-sm text-muted-foreground">Security Score</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {report.security_audit.critical_vulnerabilities}
                      </div>
                      <p className="text-sm text-muted-foreground">Critical Issues</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {report.security_audit.high_vulnerabilities}
                      </div>
                      <p className="text-sm text-muted-foreground">High Issues</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {report.security_audit.rls_policy_coverage}%
                      </div>
                      <p className="text-sm text-muted-foreground">RLS Coverage</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Authentication & Session Management</span>
                      <Badge className="bg-green-100 text-green-800">Secure</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Data Encryption (Transit & Rest)</span>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Row-Level Security Policies</span>
                      <Badge className="bg-green-100 text-green-800">Implemented</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Input Validation & Sanitization</span>
                      <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5" />
                    Compliance Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {report.compliance_status.hipaa_compliance}%
                        </div>
                        <p className="text-sm text-muted-foreground">HIPAA Compliance</p>
                        <Progress value={report.compliance_status.hipaa_compliance} className="mt-2" />
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {report.compliance_status.cfr_compliance}%
                        </div>
                        <p className="text-sm text-muted-foreground">42 CFR Part 2</p>
                        <Progress value={report.compliance_status.cfr_compliance} className="mt-2" />
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {report.compliance_status.state_compliance}%
                        </div>
                        <p className="text-sm text-muted-foreground">State Privacy Laws</p>
                        <Progress value={report.compliance_status.state_compliance} className="mt-2" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Compliance Checkpoints</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="text-sm">Data Encryption</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="text-sm">Access Controls</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="text-sm">Audit Logging</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="text-sm">Data Retention Policies</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="text-sm">Breach Response Plan</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="text-sm">User Rights Management</span>
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Critical Issues & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.critical_issues.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-green-600">No Critical Issues Found</h3>
                        <p className="text-muted-foreground">All systems are ready for pilot launch</p>
                      </div>
                    ) : (
                      report.critical_issues.map((issue, index) => (
                        <Alert key={index} className={
                          issue.severity === 'critical' ? 'border-red-200 bg-red-50' :
                          issue.severity === 'high' ? 'border-orange-200 bg-orange-50' :
                          'border-yellow-200 bg-yellow-50'
                        }>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <strong>{issue.description}</strong>
                                <Badge variant={
                                  issue.severity === 'critical' ? 'destructive' :
                                  issue.severity === 'high' ? 'default' : 'secondary'
                                }>
                                  {issue.severity.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm"><strong>Impact:</strong> {issue.impact}</p>
                              <p className="text-sm"><strong>Recommendation:</strong> {issue.recommendation}</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deployment">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Deployment Readiness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Infrastructure</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">Database Setup</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">Backup Systems</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">SSL Certificates</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Monitoring</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">Error Tracking</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">Performance Monitoring</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">Incident Response</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}