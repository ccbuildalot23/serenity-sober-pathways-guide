import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import logger from '../services/loggerService';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  Download,
  MapPin,
  GraduationCap,
  Shield,
  Clock
} from 'lucide-react';

const RegulatoryCompliance = () => {
  const [selectedState, setSelectedState] = useState('california');

  // Mock data for demonstration
  const complianceStatus = {
    overallScore: 85,
    documentationComplete: 78,
    credentialsValid: 95,
    ceCreditsComplete: 72,
    stateComplianceScore: 88
  };

  const stateRegulations = {
    california: {
      requirements: [
        { name: 'SUD Counselor License', status: 'valid', expiry: '2024-12-15' },
        { name: 'Continuing Education (40 hrs)', status: 'pending', completed: 28, required: 40 },
        { name: 'Background Check', status: 'valid', expiry: '2025-06-01' },
        { name: 'Documentation Standards', status: 'compliant', lastReview: '2024-01-15' }
      ],
      specificGuidelines: [
        'Minimum 40 hours CE every 2 years',
        'Documentation must include treatment goals within 30 days',
        'Group therapy sessions require licensed supervision',
        'Telehealth requires patient consent and secure platform'
      ]
    },
    florida: {
      requirements: [
        { name: 'LCADC License', status: 'valid', expiry: '2025-03-20' },
        { name: 'Continuing Education (30 hrs)', status: 'complete', completed: 32, required: 30 },
        { name: 'Ethics Training', status: 'valid', expiry: '2024-08-10' },
        { name: 'State Reporting Compliance', status: 'compliant', lastReview: '2024-02-01' }
      ],
      specificGuidelines: [
        'Minimum 30 hours CE every 2 years',
        'Mandatory ethics training every 2 years',
        'Client records must be maintained for 7 years',
        'Supervision requirements for unlicensed staff'
      ]
    }
  };

  const pendingTasks = [
    { id: 1, task: 'Complete Ethics CE Module', deadline: '2024-03-15', priority: 'high' },
    { id: 2, task: 'Submit Q1 Compliance Report', deadline: '2024-04-01', priority: 'medium' },
    { id: 3, task: 'Renew Professional License', deadline: '2024-12-15', priority: 'low' },
    { id: 4, task: 'Update Emergency Procedures', deadline: '2024-02-28', priority: 'high' }
  ];

  const generateDocumentation = () => {
    // Mock documentation generation
    logger.debug('Generating automated documentation...', { component: 'RegulatoryCompliance' });
  };

  const downloadComplianceReport = () => {
    // Mock report download
    logger.debug('Downloading compliance report...', { component: 'RegulatoryCompliance' });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Regulatory Compliance</h1>
            <p className="text-muted-foreground mt-2">
              Stay compliant with state regulations and professional standards
            </p>
          </div>
          <Button onClick={downloadComplianceReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Compliance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <p className="text-2xl font-bold text-foreground">{complianceStatus.overallScore}%</p>
                </div>
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <Progress value={complianceStatus.overallScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Documentation</p>
                  <p className="text-2xl font-bold text-foreground">{complianceStatus.documentationComplete}%</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <Progress value={complianceStatus.documentationComplete} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Credentials</p>
                  <p className="text-2xl font-bold text-foreground">{complianceStatus.credentialsValid}%</p>
                </div>
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <Progress value={complianceStatus.credentialsValid} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CE Credits</p>
                  <p className="text-2xl font-bold text-foreground">{complianceStatus.ceCreditsComplete}%</p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <Progress value={complianceStatus.ceCreditsComplete} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">State Compliance</p>
                  <p className="text-2xl font-bold text-foreground">{complianceStatus.stateComplianceScore}%</p>
                </div>
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <Progress value={complianceStatus.stateComplianceScore} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="documentation" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
            <TabsTrigger value="state-guidance">State Guidance</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="continuing-ed">Continuing Ed</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>

          {/* Automated Documentation */}
          <TabsContent value="documentation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Automated Documentation Generator
                </CardTitle>
                <CardDescription>
                  Generate compliant treatment notes and documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Treatment Notes Template</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Generate SOAP notes with required compliance elements
                      </p>
                      <Button onClick={generateDocumentation} className="w-full">
                        Generate Notes
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Assessment Documentation</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Auto-format assessment results for clinical records
                      </p>
                      <Button onClick={generateDocumentation} className="w-full">
                        Generate Assessment
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Progress Reports</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Create patient progress summaries for review
                      </p>
                      <Button onClick={generateDocumentation} className="w-full">
                        Generate Report
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Discharge Planning</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Complete discharge documentation with aftercare plans
                      </p>
                      <Button onClick={generateDocumentation} className="w-full">
                        Generate Plan
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* State-Specific Guidance */}
          <TabsContent value="state-guidance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  State-Specific Regulatory Guidance
                </CardTitle>
                <CardDescription>
                  Access regulations and requirements by state
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(stateRegulations).map((state) => (
                    <Button
                      key={state}
                      variant={selectedState === state ? "default" : "outline"}
                      onClick={() => setSelectedState(state)}
                      className="capitalize"
                    >
                      {state}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Requirements Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {stateRegulations[selectedState].requirements.map((req, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{req.name}</p>
                            {req.expiry && (
                              <p className="text-sm text-muted-foreground">Expires: {req.expiry}</p>
                            )}
                            {req.completed !== undefined && (
                              <p className="text-sm text-muted-foreground">
                                {req.completed}/{req.required} hours completed
                              </p>
                            )}
                          </div>
                          <Badge variant={
                            req.status === 'valid' || req.status === 'complete' || req.status === 'compliant' 
                              ? 'default' 
                              : 'secondary'
                          }>
                            {req.status}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>State Guidelines</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {stateRegulations[selectedState].specificGuidelines.map((guideline, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{guideline}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scope Verification */}
          <TabsContent value="credentials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Scope of Practice Verification
                </CardTitle>
                <CardDescription>
                  Verify provider credentials and scope limitations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All credentials verified and current. Next verification due in 6 months.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">Current Credentials</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Licensed Clinical Social Worker</span>
                          <Badge variant="default">Valid</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Certified Addiction Counselor</span>
                          <Badge variant="default">Valid</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Trauma-Informed Care Certified</span>
                          <Badge variant="default">Valid</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">Practice Scope</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Individual Therapy</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Group Therapy</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Substance Use Treatment</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">Prescription Authority (Not Authorized)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Continuing Education */}
          <TabsContent value="continuing-ed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Continuing Education Tracker
                </CardTitle>
                <CardDescription>
                  Track CE credits and manage renewal requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <h4 className="text-2xl font-bold text-primary">28</h4>
                      <p className="text-sm text-muted-foreground">Hours Completed</p>
                      <Progress value={70} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <h4 className="text-2xl font-bold text-primary">12</h4>
                      <p className="text-sm text-muted-foreground">Hours Remaining</p>
                      <Progress value={30} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <h4 className="text-2xl font-bold text-primary">8</h4>
                      <p className="text-sm text-muted-foreground">Months Until Renewal</p>
                      <Progress value={67} className="mt-2" />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming CE Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Ethics in Practice (4 hours)</p>
                          <p className="text-sm text-muted-foreground">Due: March 15, 2024</p>
                        </div>
                        <Badge variant="destructive">Urgent</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Trauma-Informed Care Update (6 hours)</p>
                          <p className="text-sm text-muted-foreground">Due: June 30, 2024</p>
                        </div>
                        <Badge variant="secondary">Upcoming</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Cultural Competency (2 hours)</p>
                          <p className="text-sm text-muted-foreground">Due: September 15, 2024</p>
                        </div>
                        <Badge variant="outline">Future</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Checklist */}
          <TabsContent value="checklist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance Checklist Dashboard
                </CardTitle>
                <CardDescription>
                  Monitor missing requirements and pending tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You have 2 high-priority compliance tasks requiring immediate attention.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{task.task}</p>
                            <p className="text-sm text-muted-foreground">Due: {task.deadline}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={
                                task.priority === 'high' ? 'destructive' : 
                                task.priority === 'medium' ? 'secondary' : 'outline'
                              }
                            >
                              {task.priority}
                            </Badge>
                            <Button size="sm">Complete</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RegulatoryCompliance;