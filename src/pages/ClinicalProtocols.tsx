import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, 
  FileText, 
  TrendingUp, 
  Download, 
  ClipboardCheck,
  Brain,
  Heart,
  Activity,
  BarChart3,
  Shield,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import PHQ2Assessment from '@/components/assessments/PHQ2Assessment';
import GAD2Assessment from '@/components/assessments/GAD2Assessment';
import CSSRSAssessment from '@/components/assessments/CSSRSAssessment';

// Full assessment components
import PHQ9Assessment from '@/components/assessments/PHQ9Assessment';
import GAD7Assessment from '@/components/assessments/GAD7Assessment';
import AUDITAssessment from '@/components/assessments/AUDITAssessment';
import TreatmentPlanTemplates from '@/components/clinical/TreatmentPlanTemplates';
import OutcomeMeasurementDashboard from '@/components/clinical/OutcomeMeasurementDashboard';

const ClinicalProtocols = () => {
  const [activeTab, setActiveTab] = useState('assessments');
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);

  const assessmentTools = [
    {
      id: 'phq9',
      name: 'PHQ-9',
      description: 'Depression Assessment',
      category: 'mood',
      evidenceLevel: 'Level A',
      duration: '5-10 minutes',
      icon: Brain,
      component: PHQ9Assessment
    },
    {
      id: 'gad7',
      name: 'GAD-7',
      description: 'Anxiety Assessment',
      category: 'anxiety',
      evidenceLevel: 'Level A',
      duration: '5-10 minutes',
      icon: Heart,
      component: GAD7Assessment
    },
    {
      id: 'audit',
      name: 'AUDIT',
      description: 'Alcohol Use Disorders Identification Test',
      category: 'substance',
      evidenceLevel: 'Level A',
      duration: '10-15 minutes',
      icon: Activity,
      component: AUDITAssessment
    },
    {
      id: 'phq2',
      name: 'PHQ-2',
      description: 'Depression Screening',
      category: 'screening',
      evidenceLevel: 'Level A',
      duration: '2-3 minutes',
      icon: Brain,
      component: PHQ2Assessment
    },
    {
      id: 'gad2',
      name: 'GAD-2',
      description: 'Anxiety Screening',
      category: 'screening',
      evidenceLevel: 'Level A',
      duration: '2-3 minutes',
      icon: Heart,
      component: GAD2Assessment
    },
    {
      id: 'cssrs',
      name: 'C-SSRS',
      description: 'Suicide Risk Assessment',
      category: 'risk',
      evidenceLevel: 'Level A',
      duration: '5-10 minutes',
      icon: AlertTriangle,
      component: CSSRSAssessment
    }
  ];

  const treatmentTemplates = [
    {
      id: 'dual-diagnosis',
      name: 'Dual Diagnosis Treatment Plan',
      description: 'Integrated treatment for substance use and mental health disorders',
      phases: ['Assessment', 'Stabilization', 'Integration', 'Maintenance'],
      duration: '12-24 weeks'
    },
    {
      id: 'depression-sud',
      name: 'Depression + Substance Use',
      description: 'Co-occurring depression and substance use disorder treatment',
      phases: ['Detox Support', 'CBT Integration', 'Relapse Prevention', 'Long-term Recovery'],
      duration: '16-20 weeks'
    },
    {
      id: 'anxiety-sud',
      name: 'Anxiety + Substance Use',
      description: 'Treatment plan for anxiety disorders with substance use',
      phases: ['Anxiety Management', 'Substance Use Treatment', 'Coping Skills', 'Maintenance'],
      duration: '12-16 weeks'
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'mood': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'anxiety': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'substance': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'screening': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'risk': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const renderAssessment = () => {
    const tool = assessmentTools.find(t => t.id === selectedAssessment);
    if (!tool) return null;
    
    const AssessmentComponent = tool.component;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <tool.icon className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">{tool.name}</h3>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setSelectedAssessment(null)}
          >
            Back to Tools
          </Button>
        </div>
        <AssessmentComponent onComplete={(score) => {
          console.log(`${tool.name} completed with score:`, score);
          setSelectedAssessment(null);
        }} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Stethoscope className="w-8 h-8 text-primary" />
                Clinical Protocols Dashboard
              </h1>
              <p className="mt-2 text-muted-foreground">
                Evidence-based assessments and treatment planning for co-occurring disorders
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                HIPAA Compliant
              </Badge>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assessments" className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Assessments
            </TabsTrigger>
            <TabsTrigger value="screening" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Screening
            </TabsTrigger>
            <TabsTrigger value="treatment" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Treatment Plans
            </TabsTrigger>
            <TabsTrigger value="outcomes" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Outcomes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assessments" className="space-y-6">
            {selectedAssessment ? (
              renderAssessment()
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assessmentTools.filter(tool => tool.category !== 'screening').map((tool) => (
                    <Card key={tool.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <tool.icon className="w-6 h-6 text-primary" />
                            <div>
                              <CardTitle className="text-lg">{tool.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{tool.description}</p>
                            </div>
                          </div>
                          <Badge className={getCategoryColor(tool.category)}>
                            {tool.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Evidence Level:</span>
                            <span className="font-medium">{tool.evidenceLevel}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">{tool.duration}</span>
                          </div>
                          <Button 
                            className="w-full" 
                            onClick={() => setSelectedAssessment(tool.id)}
                          >
                            Start Assessment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="screening" className="space-y-6">
            {selectedAssessment ? (
              renderAssessment()
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Screening Instruments</CardTitle>
                    <p className="text-muted-foreground">
                      Rapid screening tools for initial assessment and triage
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assessmentTools.filter(tool => tool.category === 'screening' || tool.category === 'risk').map((tool) => (
                        <Card key={tool.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <tool.icon className="w-5 h-5 text-primary" />
                              <div>
                                <h4 className="font-medium">{tool.name}</h4>
                                <p className="text-sm text-muted-foreground">{tool.description}</p>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => setSelectedAssessment(tool.id)}
                            >
                              Start Screening
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="treatment" className="space-y-6">
            <TreatmentPlanTemplates templates={treatmentTemplates} />
          </TabsContent>

          <TabsContent value="outcomes" className="space-y-6">
            <OutcomeMeasurementDashboard />
          </TabsContent>
        </Tabs>

        {/* HIPAA Compliance Notice */}
        <div className="mt-8 p-4 bg-muted rounded-lg border">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">
                HIPAA Compliant Clinical Documentation
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                All assessment data is encrypted at rest and in transit. Clinical documentation 
                follows evidence-based protocols. All access is logged for audit compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalProtocols;