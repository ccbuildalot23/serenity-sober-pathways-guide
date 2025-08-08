
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Calendar, Heart, Brain, Lightbulb, CheckCircle } from 'lucide-react';

interface ThoughtRecord {
  _situation: string;
  _datetime: string;
  _emotion: string;
  _emotionIntensity: number;
  _automaticThought: string;
  _thoughtIntensity: number;
  _evidence: string;
  _balancedThought: string;
  _newEmotionIntensity: number;
}

const ThoughtRecordBuilder: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [_record, setRecord] = useState<ThoughtRecord>({
    _situation: '',
    _datetime: '',
    _emotion: '',
    _emotionIntensity: 5,
    _automaticThought: '',
    _thoughtIntensity: 5,
    _evidence: '',
    _balancedThought: '',
    _newEmotionIntensity: 5
  });

  const steps = [
    { title: 'Situation', icon: Calendar, description: 'What happened?' },
    { title: 'Emotion', icon: Heart, description: 'How did you feel?' },
    { title: 'Thoughts', icon: Brain, description: 'What went through your mind?' },
    { title: 'Evidence', icon: Lightbulb, description: 'What supports or challenges this thought?' },
    { title: 'Reframe', icon: CheckCircle, description: 'What\'s a more balanced perspective?' }
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
    // Save to local storage or database
    console.log('Saving thought _record:', _record);
    // Reset form
    setRecord({
      _situation: '',
      _datetime: '',
      _emotion: '',
      _emotionIntensity: 5,
      _automaticThought: '',
      _thoughtIntensity: 5,
      _evidence: '',
      _balancedThought: '',
      _newEmotionIntensity: 5
    });
    setCurrentStep(0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Thought Record Builder</h3>
          <p className="text-gray-600">Step-by-step guided thought analysis</p>
        </div>
        <Badge variant="outline">
          Step {currentStep + 1} of {steps.length}
        </Badge>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center space-x-2 mb-6">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          return (
            <div key={index} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index <= currentStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 h-1 mx-2 ${
                    index < currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {React.createElement(steps[currentStep].icon, { className: "w-5 h-5" })}
            <span>{steps[currentStep].title}</span>
          </CardTitle>
          <p className="text-gray-600">{steps[currentStep].description}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="_situation">Describe the _situation</Label>
                <Textarea
                  id="_situation"
                  placeholder="What happened? Where were you? Who was involved?"
                  value={_record._situation}
                  onChange={(e) => setRecord({..._record, _situation: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="_datetime">Date and Time</Label>
                <Input
                  id="_datetime"
                  type="_datetime-local"
                  value={_record._datetime}
                  onChange={(e) => setRecord({..._record, _datetime: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="_emotion">Primary _emotion</Label>
                <Input
                  id="_emotion"
                  placeholder="e.g., anxious, sad, angry, frustrated"
                  value={_record._emotion}
                  onChange={(e) => setRecord({..._record, _emotion: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Emotion intensity (1-10)</Label>
                <div className="mt-2">
                  <Slider
                    value={[_record._emotionIntensity]}
                    onValueChange={(value) => setRecord({..._record, _emotionIntensity: value[0]})}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Mild (1)</span>
                    <span className="font-medium">{_record._emotionIntensity}</span>
                    <span>Intense (10)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="_automaticThought">Automatic thought</Label>
                <Textarea
                  id="_automaticThought"
                  placeholder="What thoughts went through your mind? What were you telling yourself?"
                  value={_record._automaticThought}
                  onChange={(e) => setRecord({..._record, _automaticThought: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>How much do you believe this thought? (1-10)</Label>
                <div className="mt-2">
                  <Slider
                    value={[_record._thoughtIntensity]}
                    onValueChange={(value) => setRecord({..._record, _thoughtIntensity: value[0]})}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Don't believe (1)</span>
                    <span className="font-medium">{_record._thoughtIntensity}</span>
                    <span>Completely believe (10)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="_evidence">Evidence examination</Label>
                <Textarea
                  id="_evidence"
                  placeholder="What _evidence supports this thought? What _evidence challenges it? What would you tell a friend in this _situation?"
                  value={_record._evidence}
                  onChange={(e) => setRecord({..._record, _evidence: e.target.value})}
                  className="mt-1"
                  rows={6}
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="_balancedThought">Balanced thought</Label>
                <Textarea
                  id="_balancedThought"
                  placeholder="Based on the _evidence, what's a more balanced, realistic perspective?"
                  value={_record._balancedThought}
                  onChange={(e) => setRecord({..._record, _balancedThought: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>How intense is the _emotion now? (1-10)</Label>
                <div className="mt-2">
                  <Slider
                    value={[_record._newEmotionIntensity]}
                    onValueChange={(value) => setRecord({..._record, _newEmotionIntensity: value[0]})}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Mild (1)</span>
                    <span className="font-medium">{_record._newEmotionIntensity}</span>
                    <span>Intense (10)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button onClick={handleSave}>Save Record</Button>
            ) : (
              <Button onClick={handleNext}>Next</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThoughtRecordBuilder;
