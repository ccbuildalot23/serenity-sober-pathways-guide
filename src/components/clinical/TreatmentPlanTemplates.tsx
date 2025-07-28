import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Calendar, 
  Target, 
  Clock,
  CheckCircle,
  ArrowRight,
  Download,
  Copy
} from 'lucide-react';

interface TreatmentTemplate {
  id: string;
  name: string;
  description: string;
  phases: string[];
  duration: string;
}

interface Props {
  templates: TreatmentTemplate[];
}

const TreatmentPlanTemplates: React.FC<Props> = ({ templates }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templateDetails = {
    'dual-diagnosis': {
      objectives: [
        'Achieve and maintain sobriety from substances',
        'Stabilize mental health symptoms',
        'Develop integrated coping strategies',
        'Build sustainable recovery support network'
      ],
      interventions: [
        'Motivational Interviewing',
        'Cognitive Behavioral Therapy',
        'Medication Management',
        'Group Therapy',
        'Family Therapy',
        'Relapse Prevention Training'
      ],
      outcomes: [
        'Reduction in substance use frequency',
        'Improvement in mental health scores (PHQ-9, GAD-7)',
        'Increased treatment engagement',
        'Enhanced quality of life measures'
      ]
    },
    'depression-sud': {
      objectives: [
        'Reduce depressive symptoms to subclinical levels',
        'Achieve 30+ days continuous sobriety',
        'Develop mood regulation skills',
        'Establish medication compliance'
      ],
      interventions: [
        'Antidepressant medication optimization',
        'CBT for depression and addiction',
        'Behavioral activation',
        'Mindfulness-based interventions',
        'Peer support groups',
        'Crisis safety planning'
      ],
      outcomes: [
        'PHQ-9 score reduction by 50%',
        'Zero substance use episodes',
        'Improved sleep quality',
        'Return to functional activities'
      ]
    },
    'anxiety-sud': {
      objectives: [
        'Reduce anxiety symptoms and panic episodes',
        'Develop healthy anxiety management techniques',
        'Eliminate substance use as coping mechanism',
        'Build confidence in sober anxiety management'
      ],
      interventions: [
        'Exposure and Response Prevention',
        'Anxiety management training',
        'Relaxation techniques',
        'SMART Recovery principles',
        'Trauma-informed care (if applicable)',
        'Medication evaluation'
      ],
      outcomes: [
        'GAD-7 score reduction by 40%',
        'Decreased panic attack frequency',
        'Improved anxiety tolerance',
        'Sustained recovery engagement'
      ]
    }
  };

  const handleExportPlan = (templateId: string) => {
    // In a real implementation, this would generate a PDF or document
    console.log('Exporting treatment plan:', templateId);
  };

  const handleCopyPlan = (templateId: string) => {
    // In a real implementation, this would copy to clipboard or create new instance
    console.log('Copying treatment plan template:', templateId);
  };

  if (selectedTemplate) {
    const template = templates.find(t => t.id === selectedTemplate);
    const details = templateDetails[selectedTemplate as keyof typeof templateDetails];
    
    if (!template || !details) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{template.name}</h2>
            <p className="text-muted-foreground">{template.description}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setSelectedTemplate(null)}
          >
            Back to Templates
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Treatment Objectives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {details.objectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{objective}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Treatment Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {template.phases.map((phase, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{phase}</span>
                    {index < template.phases.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Duration: {template.duration}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="interventions">
          <TabsList>
            <TabsTrigger value="interventions">Interventions</TabsTrigger>
            <TabsTrigger value="outcomes">Outcome Measures</TabsTrigger>
          </TabsList>
          
          <TabsContent value="interventions">
            <Card>
              <CardHeader>
                <CardTitle>Evidence-Based Interventions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {details.interventions.map((intervention, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <span className="font-medium">{intervention}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="outcomes">
            <Card>
              <CardHeader>
                <CardTitle>Outcome Measurement Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {details.outcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3">
          <Button 
            onClick={() => handleExportPlan(selectedTemplate)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Plan
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleCopyPlan(selectedTemplate)}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Use Template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Evidence-Based Treatment Plan Templates</CardTitle>
          <p className="text-muted-foreground">
            Structured treatment plans for co-occurring disorders based on clinical best practices
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{template.duration}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.phases.map((phase, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {phase}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      View Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TreatmentPlanTemplates;