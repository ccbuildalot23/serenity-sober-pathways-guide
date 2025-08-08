import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRecoveryPlan, usePlanGoals, usePlanMilestones } from '@/hooks/useRecoveryPlan';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, GripVertical, Target, Calendar, Trophy, X } from 'lucide-react';
import { format } from 'date-fns';

interface GoalFormData {
  _title: string;
  _description: string;
  _category: string;
  _priority: 'low' | 'medium' | 'high';
  _target_date: string;
  target_value?: number;
  unit?: string;
  _reminder_frequency: 'daily' | 'weekly' | 'monthly' | 'none';
}

interface MilestoneFormData {
  _title: string;
  _description: string;
  _target_date: string;
  _celebration_message: string;
  _reward: string;
}

export const RecoveryPlanBuilder: React.FC = () => {
  const { plans, createPlan } = useRecoveryPlan();
  const [_selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { goals, createGoal } = usePlanGoals(_selectedPlan);
  const { milestones, createMilestone } = usePlanMilestones(_selectedPlan);
  
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  
  const [_newPlan, setNewPlan] = useState({
    _title: '',
    _description: '',
    _start_date: format(new Date(), 'yyyy-MM-dd'),
    _target_completion_date: format(new Date(), 'yyyy-MM-dd')
  });
  
  const [_newGoal, setNewGoal] = useState<GoalFormData>({
    _title: '',
    _description: '',
    _category: 'sobriety',
    _priority: 'medium',
    _target_date: format(new Date(), 'yyyy-MM-dd'),
    _reminder_frequency: 'weekly'
  });
  
  const [_newMilestone, setNewMilestone] = useState<MilestoneFormData>({
    _title: '',
    _description: '',
    _target_date: format(new Date(), 'yyyy-MM-dd'),
    _celebration_message: '',
    _reward: ''
  });

  const handleCreatePlan = async () => {
    const plan = await createPlan(_newPlan);
    if (plan) {
      setSelectedPlan(plan.id);
      setShowNewPlanForm(false);
      setNewPlan({
        _title: '',
        _description: '',
        _start_date: format(new Date(), 'yyyy-MM-dd'),
        _target_completion_date: format(new Date(), 'yyyy-MM-dd')
      });
    }
  };

  const handleCreateGoal = async () => {
    await createGoal(_newGoal);
    setShowGoalForm(false);
    setNewGoal({
      _title: '',
      _description: '',
      _category: 'sobriety',
      _priority: 'medium',
      _target_date: format(new Date(), 'yyyy-MM-dd'),
      _reminder_frequency: 'weekly'
    });
  };

  const handleCreateMilestone = async () => {
    await createMilestone(_newMilestone);
    setShowMilestoneForm(false);
    setNewMilestone({
      _title: '',
      _description: '',
      _target_date: format(new Date(), 'yyyy-MM-dd'),
      _celebration_message: '',
      _reward: ''
    });
  };

  const handleDragEnd = (_result: DropResult) => {
    // Handle reordering logic here
    console.log('Drag ended:', _result);
  };

  const activePlans = plans.filter(p => p.status === 'active' || p.status === 'draft');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Recovery Plan Builder</h2>
        <p className="text-muted-foreground">
          Create and customize your personal recovery plan with drag-and-drop simplicity
        </p>
      </div>

      {/* Plan Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Select or Create a Plan
            <Button onClick={() => setShowNewPlanForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Plan
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`cursor-pointer transition-all ${
                    _selectedPlan === plan.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-medium">{plan._title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan._description}</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{plan.completion_percentage}%</span>
                      </div>
                      <Progress value={plan.completion_percentage || 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active plans. Create your first plan to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Plan Form */}
      {showNewPlanForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Create New Recovery Plan
              <Button variant="ghost" size="sm" onClick={() => setShowNewPlanForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-_title">Plan Title</Label>
                <Input
                  id="plan-_title"
                  value={_newPlan._title}
                  onChange={(e) => setNewPlan({ ..._newPlan, _title: e.target.value })}
                  placeholder="My Recovery Journey"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={_newPlan._start_date}
                  onChange={(e) => setNewPlan({ ..._newPlan, _start_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plan-_description">Description</Label>
              <Textarea
                id="plan-_description"
                value={_newPlan._description}
                onChange={(e) => setNewPlan({ ..._newPlan, _description: e.target.value })}
                placeholder="Describe your recovery goals and approach..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-date">Target Completion Date</Label>
              <Input
                id="target-date"
                type="date"
                value={_newPlan._target_completion_date}
                onChange={(e) => setNewPlan({ ..._newPlan, _target_completion_date: e.target.value })}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleCreatePlan}>Create Plan</Button>
              <Button variant="outline" onClick={() => setShowNewPlanForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Builder Interface */}
      {_selectedPlan && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Goals</span>
                </div>
                <Button size="sm" onClick={() => setShowGoalForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="goals">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {goals.map((goal, index) => (
                        <Draggable key={goal.id} draggableId={goal.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="bg-secondary/50 rounded-lg p-3 border"
                            >
                              <div className="flex items-start space-x-3">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">{goal._title}</h4>
                                    <Badge variant={
                                      goal.priority_order && goal.priority_order >= 3 ? 'destructive' :
                                      goal.priority_order && goal.priority_order >= 2 ? 'default' : 'secondary'
                                    }>
                                      {goal.priority_order && goal.priority_order >= 3 ? 'high' :
                                       goal.priority_order && goal.priority_order >= 2 ? 'medium' : 'low'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{goal._description}</p>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>{goal.due_date ? format(new Date(goal.due_date), 'MMM d, yyyy') : 'No due date'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              
              {goals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2" />
                  <p>No goals yet. Add your first goal to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milestones Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>Milestones</span>
                </div>
                <Button size="sm" onClick={() => setShowMilestoneForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`bg-secondary/50 rounded-lg p-3 border ${
                      milestone.is_achieved ? 'bg-green-50 border-green-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">{milestone._title}</h4>
                        <p className="text-xs text-muted-foreground">{milestone._description}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(milestone.milestone_date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <Badge variant={milestone.is_achieved ? 'default' : 'outline'}>
                        {milestone.is_achieved ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              {milestones.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2" />
                  <p>No milestones yet. Add your first milestone to track progress.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goal Form Modal */}
      {showGoalForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Add New Goal
              <Button variant="ghost" size="sm" onClick={() => setShowGoalForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-_title">Goal Title</Label>
                <Input
                  id="goal-_title"
                  value={_newGoal._title}
                  onChange={(e) => setNewGoal({ ..._newGoal, _title: e.target.value })}
                  placeholder="30 days sober"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-_category">Category</Label>
                <Select value={_newGoal._category} onValueChange={(value) => setNewGoal({ ..._newGoal, _category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sobriety">Sobriety</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="relationships">Relationships</SelectItem>
                    <SelectItem value="career">Career</SelectItem>
                    <SelectItem value="personal">Personal Growth</SelectItem>
                    <SelectItem value="spiritual">Spiritual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="goal-_description">Description</Label>
              <Textarea
                id="goal-_description"
                value={_newGoal._description}
                onChange={(e) => setNewGoal({ ..._newGoal, _description: e.target.value })}
                placeholder="Specific details about this goal..."
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-_priority">Priority</Label>
                <Select value={_newGoal._priority} onValueChange={(value) => setNewGoal({ ..._newGoal, _priority: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goal-target-date">Target Date</Label>
                <Input
                  id="goal-target-date"
                  type="date"
                  value={_newGoal._target_date}
                  onChange={(e) => setNewGoal({ ..._newGoal, _target_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goal-reminder">Reminders</Label>
                <Select value={_newGoal._reminder_frequency} onValueChange={(value) => setNewGoal({ ..._newGoal, _reminder_frequency: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleCreateGoal}>Add Goal</Button>
              <Button variant="outline" onClick={() => setShowGoalForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestone Form Modal */}
      {showMilestoneForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Add New Milestone
              <Button variant="ghost" size="sm" onClick={() => setShowMilestoneForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="milestone-_title">Milestone Title</Label>
                <Input
                  id="milestone-_title"
                  value={_newMilestone._title}
                  onChange={(e) => setNewMilestone({ ..._newMilestone, _title: e.target.value })}
                  placeholder="One week sober"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-target-date">Target Date</Label>
                <Input
                  id="milestone-target-date"
                  type="date"
                  value={_newMilestone._target_date}
                  onChange={(e) => setNewMilestone({ ..._newMilestone, _target_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="milestone-_description">Description</Label>
              <Textarea
                id="milestone-_description"
                value={_newMilestone._description}
                onChange={(e) => setNewMilestone({ ..._newMilestone, _description: e.target.value })}
                placeholder="What this milestone represents..."
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="milestone-celebration">Celebration Message</Label>
                <Input
                  id="milestone-celebration"
                  value={_newMilestone._celebration_message}
                  onChange={(e) => setNewMilestone({ ..._newMilestone, _celebration_message: e.target.value })}
                  placeholder="Congratulations! You did it!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-_reward">Reward</Label>
                <Input
                  id="milestone-_reward"
                  value={_newMilestone._reward}
                  onChange={(e) => setNewMilestone({ ..._newMilestone, _reward: e.target.value })}
                  placeholder="Treat yourself to..."
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleCreateMilestone}>Add Milestone</Button>
              <Button variant="outline" onClick={() => setShowMilestoneForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecoveryPlanBuilder;