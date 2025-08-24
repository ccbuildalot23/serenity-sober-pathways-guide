
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar, CheckCircle, Plus } from 'lucide-react';

interface SMARTGoal {
  id: string;
  title: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timebound: string;
  progress: number;
  completed: boolean;
  createdDate: Date;
  targetDate: string;
}

const SMARTGoals: React.FC = () => {
  const [goals, setGoals] = useState<SMARTGoal[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [newGoal, setNewGoal] = useState<Partial<SMARTGoal>>({
    title: '',
    specific: '',
    measurable: '',
    achievable: '',
    relevant: '',
    timebound: '',
    progress: 0,
    completed: false,
    targetDate: ''
  });

  const steps = [
    {
      title: 'Goal Title',
      field: 'title',
      question: 'What is your goal?',
      placeholder: 'e.g., Attend AA meetings regularly'
    },
    {
      title: 'Specific',
      field: 'specific',
      question: 'What exactly will you accomplish?',
      placeholder: 'Be specific about what you will do, where, and how'
    },
    {
      title: 'Measurable',
      field: 'measurable',
      question: 'How will you measure progress?',
      placeholder: 'Define concrete criteria for measuring progress and success'
    },
    {
      title: 'Achievable',
      field: 'achievable',
      question: 'Is this goal realistic and attainable?',
      placeholder: 'Consider your current situation, resources, and constraints'
    },
    {
      title: 'Relevant',
      field: 'relevant',
      question: 'Why is this goal important to your recovery?',
      placeholder: 'Explain how this goal aligns with your recovery values and priorities'
    },
    {
      title: 'Time-bound',
      field: 'timebound',
      question: 'When will you achieve this goal?',
      placeholder: 'Set a realistic deadline and any interim milestones'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    if (newGoal.title && newGoal.specific) {
      const goal: SMARTGoal = {
        id: Date.now().toString(),
        title: newGoal.title,
        specific: newGoal.specific || '',
        measurable: newGoal.measurable || '',
        achievable: newGoal.achievable || '',
        relevant: newGoal.relevant || '',
        timebound: newGoal.timebound || '',
        progress: 0,
        completed: false,
        createdDate: new Date(),
        targetDate: newGoal.targetDate || ''
      };
      
      setGoals([goal, ...goals]);
      setNewGoal({
        title: '',
        specific: '',
        measurable: '',
        achievable: '',
        relevant: '',
        timebound: '',
        progress: 0,
        completed: false,
        targetDate: ''
      });
      setCurrentStep(0);
    }
  };

  const updateProgress = (goalId: string, progress: number) => {
    setGoals(goals.map(goal =>
      goal.id === goalId
        ? { ...goal, progress, completed: progress >= 100 }
        : goal
    ));
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold">SMART Goals Wizard</h3>
        <p className="text-gray-600">Create specific, measurable goals focused on recovery</p>
      </div>

      {/* Goal Creation Wizard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Create a SMART Goal</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
            <span className="text-sm text-gray-600">{currentStepData.title}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center space-x-2 mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {index < currentStep ? '✓' : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-1 mx-1 ${
                      index < currentStep ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div>
            <Label className="text-base font-medium">{currentStepData.question}</Label>
            {currentStep === 0 ? (
              <Input
                value={newGoal.title || ''}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                placeholder={currentStepData.placeholder}
                className="mt-2"
              />
            ) : currentStep === steps.length - 1 ? (
              <div className="space-y-3 mt-2">
                <Textarea
                  value={newGoal.timebound || ''}
                  onChange={(e) => setNewGoal({...newGoal, timebound: e.target.value})}
                  placeholder={currentStepData.placeholder}
                  rows={3}
                />
                <div>
                  <Label htmlFor="targetDate">Target completion date</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={newGoal.targetDate || ''}
                    onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              <Textarea
                value={(newGoal as any)[currentStepData.field] || ''}
                onChange={(e) => setNewGoal({...newGoal, [currentStepData.field]: e.target.value})}
                placeholder={currentStepData.placeholder}
                rows={3}
                className="mt-2"
              />
            )}
          </div>

          {/* SMART criteria explanation */}
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
              <div className={currentStep === 1 ? 'font-bold text-blue-800' : 'text-blue-600'}>
                <strong>S</strong>pecific: Clear and well-defined
              </div>
              <div className={currentStep === 2 ? 'font-bold text-blue-800' : 'text-blue-600'}>
                <strong>M</strong>easurable: Trackable progress
              </div>
              <div className={currentStep === 3 ? 'font-bold text-blue-800' : 'text-blue-600'}>
                <strong>A</strong>chievable: Realistic and attainable
              </div>
              <div className={currentStep === 4 ? 'font-bold text-blue-800' : 'text-blue-600'}>
                <strong>R</strong>elevant: Important to your recovery
              </div>
              <div className={currentStep === 5 ? 'font-bold text-blue-800' : 'text-blue-600'}>
                <strong>T</strong>ime-bound: Has a deadline
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            
            {isLastStep ? (
              <Button onClick={handleSave}>
                <Plus className="w-4 h-4 mr-2" />
                Create Goal
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goal List */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Recovery Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-lg">{goal.title}</h4>
                      <p className="text-sm text-gray-600">{goal.specific}</p>
                      {goal.targetDate && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={goal.completed ? "default" : "outline"}>
                        {goal.completed ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : null}
                        {goal.completed ? 'Completed' : `${goal.progress}%`}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Progress</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={goal.progress}
                          onChange={(e) => updateProgress(goal.id, parseInt(e.target.value))}
                          className="w-16"
                        />
                        <span className="text-sm">{goal.progress}%</span>
                      </div>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                    {goal.measurable && (
                      <div>
                        <strong>Measurable:</strong> {goal.measurable}
                      </div>
                    )}
                    {goal.relevant && (
                      <div>
                        <strong>Why it matters:</strong> {goal.relevant}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SMARTGoals;
