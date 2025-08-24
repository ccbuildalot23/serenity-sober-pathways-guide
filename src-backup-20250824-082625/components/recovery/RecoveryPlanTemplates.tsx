import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecoveryPlan } from '@/hooks/useRecoveryPlan';
import { RecoveryPlanTemplate } from '@/services/recoveryPlanService';
import { Target, Clock, CheckCircle, Star } from 'lucide-react';
import { format, addWeeks } from 'date-fns';

export const RecoveryPlanTemplates: React.FC = () => {
  const { templates, _loading, createPlanFromTemplate } = useRecoveryPlan();
  const [selectedTemplate, setSelectedTemplate] = useState<RecoveryPlanTemplate | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isCreating, setIsCreating] = useState(false);

  const handleUseTemplate = async (_template: RecoveryPlanTemplate) => {
    setIsCreating(true);
    
    const targetDate = addWeeks(new Date(startDate), _template.estimated_duration_weeks || 12);
    
    try {
      await createPlanFromTemplate(_template.id, {
        title: customTitle || _template.title,
        _start_date: startDate,
        _target_completion_date: format(targetDate, 'yyyy-MM-dd')
      });
      
      setSelectedTemplate(null);
      setCustomTitle('');
    } catch (_error) {
      console._error('Error creating plan from _template:', _error);
    } finally {
      setIsCreating(false);
    }
  };

  if (_loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const categorizedTemplates = templates.reduce((acc, _template) => {
    if (!acc[_template.category]) {
      acc[_template.category] = [];
    }
    acc[_template.category].push(_template);
    return acc;
  }, {} as Record<string, RecoveryPlanTemplate[]>);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Evidence-Based Recovery Templates</h2>
        <p className="text-muted-foreground">
          Choose from professionally designed recovery plans based on proven methodologies
        </p>
      </div>

      {Object.entries(categorizedTemplates).map(([category, categoryTemplates]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-lg font-medium capitalize">{category} Recovery</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTemplates.map((_template) => (
              <Card key={_template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {_template.title}
                        {_template.evidence_based_source && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Evidence-Based
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {_template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{_template.estimated_duration_weeks} weeks</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="h-4 w-4" />
                      <span>{_template.template_data?.goals?.length || 0} goals</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>{_template.template_data?.milestones?.length || 0} milestones</span>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full" 
                        onClick={() => setSelectedTemplate(_template)}
                      >
                        Use This Template
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Customize Your Plan</DialogTitle>
                        <DialogDescription>
                          Personalize this recovery plan _template to fit your needs
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="plan-title">Plan Title (_Optional)</Label>
                          <Input
                            id="plan-title"
                            placeholder={_template.title}
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Start Date</Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Target Completion</Label>
                          <div className="text-sm text-muted-foreground">
                            {format(addWeeks(new Date(startDate), _template.estimated_duration_weeks || 12), 'MMM d, yyyy')}
                            <span className="ml-1">({_template.estimated_duration_weeks || 12} weeks from start)</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleUseTemplate(_template)}
                            disabled={isCreating}
                            className="flex-1"
                          >
                            {isCreating ? 'Creating...' : 'Create Plan'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedTemplate(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecoveryPlanTemplates;