
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Heart, Brain, Lightbulb, CheckCircle } from 'lucide-react';

interface ThoughtRecord {
  situation: string;
  datetime: string;
  emotion: string;
  emotionIntensity: number;
  automaticThought: string;
  thoughtIntensity: number;
  evidence: string;
  balancedThought: string;
  newEmotionIntensity: number;
}

const ThoughtRecordBuilder: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [record, setRecord] = useState<ThoughtRecord>({
    situation: '',
    datetime: '',
    emotion: '',
    emotionIntensity: 5,
    automaticThought: '',
    thoughtIntensity: 5,
    evidence: '',
    balancedThought: '',
    newEmotionIntensity: 5
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
    console.log('Saving thought record:', record);
    // Reset form
    setRecord({
      situation: '',
      datetime: '',
      emotion: '',
      emotionIntensity: 5,
      automaticThought: '',
      thoughtIntensity: 5,
      evidence: '',
      balancedThought: '',
      newEmotionIntensity: 5
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
                <Label htmlFor="situation">Describe the situation</Label>
                <Textarea
                  id="situation"
                  placeholder="What happened? Where were you? Who was involved?"
                  value={record.situation}
                  onChange={(e) => setRecord({...record, situation: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="datetime">Date and Time</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={record.datetime}
                  onChange={(e) => setRecord({...record, datetime: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="emotion">Primary emotion</Label>
                <Input
                  id="emotion"
                  placeholder="e.g., anxious, sad, angry, frustrated"
                  value={record.emotion}
                  onChange={(e) => setRecord({...record, emotion: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Emotion intensity (1-10)</Label>
                <div className="mt-2">
                  <Slider
                    value={[record.emotionIntensity]}
                    onValueChange={(value) => setRecord({...record, emotionIntensity: value[0]})}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Mild (1)</span>
                    <span className="font-medium">{record.emotionIntensity}</span>
                    <span>Intense (10)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="automaticThought">Automatic thought</Label>
                <Textarea
                  id="automaticThought"
                  placeholder="What thoughts went through your mind? What were you telling yourself?"
                  value={record.automaticThought}
                  onChange={(e) => setRecord({...record, automaticThought: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>How much do you believe this thought? (1-10)</Label>
                <div className="mt-2">
                  <Slider
                    value={[record.thoughtIntensity]}
                    onValueChange={(value) => setRecord({...record, thoughtIntensity: value[0]})}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Don't believe (1)</span>
                    <span className="font-medium">{record.thoughtIntensity}</span>
                    <span>Completely believe (10)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="evidence">Evidence examination</Label>
                <Textarea
                  id="evidence"
                  placeholder="What evidence supports this thought? What evidence challenges it? What would you tell a friend in this situation?"
                  value={record.evidence}
                  onChange={(e) => setRecord({...record, evidence: e.target.value})}
                  className="mt-1"
                  rows={6}
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="balancedThought">Balanced thought</Label>
                <Textarea
                  id="balancedThought"
                  placeholder="Based on the evidence, what's a more balanced, realistic perspective?"
                  value={record.balancedThought}
                  onChange={(e) => setRecord({...record, balancedThought: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>How intense is the emotion now? (1-10)</Label>
                <div className="mt-2">
                  <Slider
                    value={[record.newEmotionIntensity]}
                    onValueChange={(value) => setRecord({...record, newEmotionIntensity: value[0]})}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Mild (1)</span>
                    <span className="font-medium">{record.newEmotionIntensity}</span>
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
