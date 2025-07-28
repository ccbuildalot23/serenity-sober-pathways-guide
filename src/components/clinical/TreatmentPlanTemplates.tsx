import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Target, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TreatmentPlan {
  id: string;
  patient_id: string;
  provider_id: string;
  plan_type: string;
  goals: any[];
  interventions: any[];
  timeline_weeks: number;
  status: string;
  effectiveness_rating?: number;
}

const treatmentTemplates = [
  {
    id: 'substance-abuse-basic',
    name: 'Substance Abuse - Basic Recovery',
    description: 'Comprehensive treatment plan for substance use disorder',
    plan_type: 'substance_abuse',
    timeline_weeks: 12,
    goals: [
      { id: 1, title: 'Achieve initial sobriety', target_weeks: 2, priority: 'high' },
      { id: 2, title: 'Develop coping strategies', target_weeks: 4, priority: 'high' },
      { id: 3, title: 'Build support network', target_weeks: 6, priority: 'medium' },
      { id: 4, title: 'Prevent relapse', target_weeks: 12, priority: 'high' }
    ],
    interventions: [
      { type: 'therapy', frequency: 'weekly', description: 'Individual CBT sessions' },
      { type: 'group', frequency: 'bi-weekly', description: 'Group therapy sessions' },
      { type: 'medication', frequency: 'as-needed', description: 'Medication-assisted treatment if appropriate' },
      { type: 'skills', frequency: 'daily', description: 'Daily coping skills practice' }
    ]
  },
  {
    id: 'mental-health-comprehensive',
    name: 'Mental Health - Comprehensive Care',
    description: 'Integrated treatment for mental health conditions',
    plan_type: 'mental_health',
    timeline_weeks: 16,
    goals: [
      { id: 1, title: 'Stabilize mood symptoms', target_weeks: 4, priority: 'high' },
      { id: 2, title: 'Improve daily functioning', target_weeks: 8, priority: 'medium' },
      { id: 3, title: 'Enhance coping skills', target_weeks: 12, priority: 'high' },
      { id: 4, title: 'Maintain progress', target_weeks: 16, priority: 'medium' }
    ],
    interventions: [
      { type: 'therapy', frequency: 'weekly', description: 'Individual therapy (CBT/DBT)' },
      { type: 'assessment', frequency: 'monthly', description: 'Progress assessments' },
      { type: 'psychoeducation', frequency: 'bi-weekly', description: 'Educational sessions' },
      { type: 'skills', frequency: 'daily', description: 'Mindfulness and coping practices' }
    ]
  },
  {
    id: 'crisis-intervention',
    name: 'Crisis Intervention',
    description: 'Short-term intensive support for crisis situations',
    plan_type: 'crisis',
    timeline_weeks: 6,
    goals: [
      { id: 1, title: 'Ensure immediate safety', target_weeks: 1, priority: 'critical' },
      { id: 2, title: 'Stabilize crisis', target_weeks: 2, priority: 'high' },
      { id: 3, title: 'Develop safety plan', target_weeks: 3, priority: 'high' },
      { id: 4, title: 'Connect to ongoing support', target_weeks: 6, priority: 'medium' }
    ],
    interventions: [
      { type: 'crisis', frequency: 'daily', description: 'Daily safety check-ins' },
      { type: 'therapy', frequency: 'twice-weekly', description: 'Crisis counseling sessions' },
      { type: 'support', frequency: 'as-needed', description: '24/7 crisis line access' },
      { type: 'coordination', frequency: 'weekly', description: 'Care coordination meetings' }
    ]
  }
];

const TreatmentPlanTemplates: React.FC = () => {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<typeof treatmentTemplates[0] | null>(null);
  const [patientId, setPatientId] = useState('');
  const [customizations, setCustomizations] = useState({
    timeline_weeks: 12,
    additional_goals: '',
    additional_interventions: '',
    notes: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePlan = async () => {
    if (!selectedTemplate || !patientId) {
      toast.error('Please select a template and enter patient ID');
      return;
    }

    setIsCreating(true);
    try {
      const planData = {
        patient_id: patientId,
        provider_id: user!.id,
        plan_type: selectedTemplate.plan_type,
        timeline_weeks: customizations.timeline_weeks,
        status: 'active',
        goals: [
          ...selectedTemplate.goals,
          ...(customizations.additional_goals ? 
            customizations.additional_goals.split('\n').map((goal, index) => ({
              id: selectedTemplate.goals.length + index + 1,
              title: goal.trim(),
              target_weeks: customizations.timeline_weeks,
              priority: 'medium'
            })) : [])
        ],
        interventions: [
          ...selectedTemplate.interventions,
          ...(customizations.additional_interventions ?
            customizations.additional_interventions.split('\n').map(intervention => ({
              type: 'custom',
              frequency: 'as-needed',
              description: intervention.trim()
            })) : [])
        ]
      };

      const { data, error } = await supabase
        .from('treatment_plans')
        .insert(planData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Treatment plan created successfully');
      setSelectedTemplate(null);
      setPatientId('');
      setCustomizations({
        timeline_weeks: 12,
        additional_goals: '',
        additional_interventions: '',
        notes: ''
      });

    } catch (error) {
      console.error('Error creating treatment plan:', error);
      toast.error('Failed to create treatment plan');
    } finally {
      setIsCreating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Treatment Plan Templates</h1>
          <p className="text-muted-foreground">Create evidence-based treatment plans</p>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {treatmentTemplates.map((template) => (
          <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <FileText className="h-6 w-6 text-primary" />
                <Badge variant="outline">{template.timeline_weeks}w</Badge>
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    Goals ({template.goals.length})
                  </h4>
                  <div className="space-y-1">
                    {template.goals.slice(0, 2).map((goal) => (
                      <div key={goal.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">{goal.title}</span>
                        <Badge variant={getPriorityColor(goal.priority)}>
                          {goal.priority}
                        </Badge>
                      </div>
                    ))}
                    {template.goals.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{template.goals.length - 2} more goals
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Interventions ({template.interventions.length})
                  </h4>
                  <div className="space-y-1">
                    {template.interventions.slice(0, 2).map((intervention, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {intervention.description}
                      </div>
                    ))}
                    {template.interventions.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{template.interventions.length - 2} more interventions
                      </p>
                    )}
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Treatment Plan</DialogTitle>
                      <DialogDescription>
                        Customize the {selectedTemplate?.name} template for your patient
                      </DialogDescription>
                    </DialogHeader>
                    
                    {selectedTemplate && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="patient-id">Patient ID</Label>
                            <Input
                              id="patient-id"
                              value={patientId}
                              onChange={(e) => setPatientId(e.target.value)}
                              placeholder="Enter patient ID"
                            />
                          </div>
                          <div>
                            <Label htmlFor="timeline">Timeline (weeks)</Label>
                            <Input
                              id="timeline"
                              type="number"
                              value={customizations.timeline_weeks}
                              onChange={(e) => setCustomizations(prev => ({
                                ...prev,
                                timeline_weeks: parseInt(e.target.value) || 12
                              }))}
                              min="1"
                              max="52"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setSelectedTemplate(null)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreatePlan}
                            disabled={isCreating || !patientId}
                          >
                            {isCreating ? 'Creating...' : 'Create Plan'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
};

export default TreatmentPlanTemplates;