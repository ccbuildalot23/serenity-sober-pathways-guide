import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Link, 
  DollarSign, 
  FileText, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Download,
  Calendar,
  Clock,
  Activity
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'pending';
  lastSync: string;
  description: string;
}

interface BillingCode {
  code: string;
  description: string;
  rate: number;
  frequency: 'monthly' | 'per-session' | 'one-time';
  requirements: string[];
}

interface RevenueData {
  month: string;
  traditionalRevenue: number;
  digitalHealthRevenue: number;
  retentionBonus: number;
}

const PracticeManagement: React.FC = () => {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'simplepractice',
      name: 'SimplePractice',
      status: 'disconnected',
      lastSync: 'Never',
      description: 'Practice management and EHR integration'
    },
    {
      id: 'therapynotes',
      name: 'TherapyNotes',
      status: 'disconnected',
      lastSync: 'Never',
      description: 'Clinical documentation and billing'
    },
    {
      id: 'epic',
      name: 'Epic MyChart',
      status: 'pending',
      lastSync: '2 hours ago',
      description: 'Hospital system integration'
    }
  ]);

  const [billingCodes] = useState<BillingCode[]>([
    {
      code: 'CPT 99490',
      description: 'Chronic Care Management (first 20 minutes)',
      rate: 62.35,
      frequency: 'monthly',
      requirements: ['20+ minutes patient contact', 'Care plan development', 'Medication management']
    },
    {
      code: 'CPT 99487',
      description: 'Complex Chronic Care Management (first 60 minutes)',
      rate: 152.75,
      frequency: 'monthly',
      requirements: ['60+ minutes patient contact', 'Multiple chronic conditions', 'Care coordination']
    },
    {
      code: 'CPT 99489',
      description: 'Complex CCM additional 30 minutes',
      rate: 108.25,
      frequency: 'per-session',
      requirements: ['Additional 30 minutes beyond initial hour', 'Complex care coordination']
    }
  ]);

  const [revenueData] = useState<RevenueData[]>([
    { month: 'Jan', traditionalRevenue: 15000, digitalHealthRevenue: 3200, retentionBonus: 1800 },
    { month: 'Feb', traditionalRevenue: 16200, digitalHealthRevenue: 4100, retentionBonus: 2300 },
    { month: 'Mar', traditionalRevenue: 15800, digitalHealthRevenue: 4800, retentionBonus: 2700 },
    { month: 'Apr', traditionalRevenue: 17500, digitalHealthRevenue: 5400, retentionBonus: 3100 },
    { month: 'May', traditionalRevenue: 18200, digitalHealthRevenue: 6200, retentionBonus: 3600 },
    { month: 'Jun', traditionalRevenue: 19000, digitalHealthRevenue: 7100, retentionBonus: 4200 }
  ]);

  const [patientEngagement] = useState({
    totalPatients: 124,
    activeEngagement: 89,
    highRisk: 12,
    billableMinutes: 2847,
    completedAssessments: 156,
    averageEngagementScore: 7.8
  });

  const handleConnect = async (integrationId: string) => {
    toast({
      title: "Starting OAuth Flow",
      description: `Redirecting to ${integrationId} authentication...`,
    });

    // Simulate OAuth flow
    setTimeout(() => {
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, status: 'connected', lastSync: 'Just now' }
            : integration
        )
      );
      toast({
        title: "Integration Connected",
        description: `Successfully connected to ${integrationId}`,
      });
    }, 2000);
  };

  const generateBillingReport = () => {
    const totalBillable = billingCodes.reduce((sum, code) => 
      sum + (code.rate * Math.floor(Math.random() * 10 + 1)), 0
    );
    
    toast({
      title: "Billing Report Generated",
      description: `Potential monthly revenue: $${totalBillable.toFixed(2)}`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'default';
      case 'pending': return 'secondary';
      case 'disconnected': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'disconnected': return <AlertCircle className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Practice Management Integration</h1>
        <p className="text-muted-foreground">
          Connect your practice management systems and optimize revenue through digital health programs
        </p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="billing">Billing Codes</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Tracking</TabsTrigger>
          <TabsTrigger value="engagement">Patient Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Practice Management Systems
                </CardTitle>
                <CardDescription>
                  Connect your existing practice management and EHR systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{integration.name}</h3>
                          <p className="text-sm text-muted-foreground">{integration.description}</p>
                          <p className="text-xs text-muted-foreground">Last sync: {integration.lastSync}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={getStatusColor(integration.status)} className="flex items-center gap-1">
                          {getStatusIcon(integration.status)}
                          {integration.status}
                        </Badge>
                        {integration.status === 'disconnected' && (
                          <Button onClick={() => handleConnect(integration.id)}>
                            <Link className="w-4 h-4 mr-2" />
                            Connect
                          </Button>
                        )}
                        {integration.status === 'connected' && (
                          <Button variant="outline">
                            <Settings className="w-4 h-4 mr-2" />
                            Configure
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h3 className="font-semibold">Manual Integration Setup</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="api-key">API Key</Label>
                      <Input id="api-key" placeholder="Enter your API key" />
                    </div>
                    <div>
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input id="webhook-url" placeholder="https://your-system.com/webhook" />
                    </div>
                  </div>
                  <Button variant="outline">
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Automated Billing Code Generator
                </CardTitle>
                <CardDescription>
                  Generate CPT codes based on patient engagement and care activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {billingCodes.map((code, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{code.code}</h3>
                          <p className="text-muted-foreground">{code.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">${code.rate}</p>
                          <p className="text-sm text-muted-foreground">{code.frequency}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <Label className="text-sm font-medium">Requirements:</Label>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {code.requirements.map((req, reqIndex) => (
                            <li key={reqIndex} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm">Generate Code</Button>
                        <Button size="sm" variant="outline">View Documentation</Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Monthly Billing Report</h3>
                    <p className="text-sm text-muted-foreground">Generate comprehensive billing reports</p>
                  </div>
                  <Button onClick={generateBillingReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$30,300</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+12.5%</span> from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Digital Health Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$7,100</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+23.4%</span> growth rate
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Retention Bonus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$4,200</div>
                  <p className="text-xs text-muted-foreground">
                    From improved patient outcomes
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Monthly revenue analysis across different service types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {revenueData.map((data, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{data.month}</span>
                        <span>${(data.traditionalRevenue + data.digitalHealthRevenue + data.retentionBonus).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div 
                          className="bg-blue-500 rounded-sm"
                          style={{ 
                            width: `${(data.traditionalRevenue / (data.traditionalRevenue + data.digitalHealthRevenue + data.retentionBonus)) * 100}%`
                          }}
                        />
                        <div 
                          className="bg-green-500 rounded-sm"
                          style={{ 
                            width: `${(data.digitalHealthRevenue / (data.traditionalRevenue + data.digitalHealthRevenue + data.retentionBonus)) * 100}%`
                          }}
                        />
                        <div 
                          className="bg-purple-500 rounded-sm"
                          style={{ 
                            width: `${(data.retentionBonus / (data.traditionalRevenue + data.digitalHealthRevenue + data.retentionBonus)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-6 mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                    Traditional Services
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-sm" />
                    Digital Health
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                    Retention Bonus
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement">
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{patientEngagement.totalPatients}</div>
                  <Progress value={75} className="mt-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{patientEngagement.activeEngagement}</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((patientEngagement.activeEngagement / patientEngagement.totalPatients) * 100)}% of total patients
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">High Risk Patients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{patientEngagement.highRisk}</div>
                  <p className="text-xs text-muted-foreground">Require immediate attention</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Patient Engagement Reports</CardTitle>
                <CardDescription>Documentation for care navigation and outcome tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Billable Minutes This Month</span>
                      <span className="font-semibold">{patientEngagement.billableMinutes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Completed Assessments</span>
                      <span className="font-semibold">{patientEngagement.completedAssessments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Engagement Score</span>
                      <span className="font-semibold">{patientEngagement.averageEngagementScore}/10</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Button className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Export Engagement Report
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Report
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Activity className="w-4 h-4 mr-2" />
                      View Patient Trends
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Care Navigation Documentation</CardTitle>
                <CardDescription>Generate reports for insurance and care coordination</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="report-type">Report Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly Summary</SelectItem>
                          <SelectItem value="quarterly">Quarterly Review</SelectItem>
                          <SelectItem value="annual">Annual Report</SelectItem>
                          <SelectItem value="custom">Custom Period</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="format">Export Format</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="hl7">HL7 FHIR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Add any additional context for this report..."
                      className="mt-1"
                    />
                  </div>
                  
                  <Button>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Documentation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PracticeManagement;