
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle } from 'lucide-react';

interface GroundingExerciseProps {
  onComplete: () => void;
}

const steps = [
  { instruction: "Name 5 things you can see", inputs: 5, placeholder: "What do you see?" },
  { instruction: "Name 4 things you can touch", inputs: 4, placeholder: "What can you touch?" },
  { instruction: "Name 3 things you can hear", inputs: 3, placeholder: "What do you hear?" },
  { instruction: "Name 2 things you can smell", inputs: 2, placeholder: "What do you smell?" },
  { instruction: "Name 1 thing you can taste", inputs: 1, placeholder: "What do you taste?" }
];

const GroundingExercise: React.FC<GroundingExerciseProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentInputs, setCurrentInputs] = useState<string[]>([]);

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...currentInputs];
    newInputs[index] = value;
    setCurrentInputs(newInputs);
  };

  const handleStepComplete = () => {
    const validResponses = currentInputs.filter(input => input.trim() !== '');
    
    if (validResponses.length > 0) {
      setResponses([...responses, ...validResponses]);
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        setCurrentInputs([]);
      } else {
        onComplete();
      }
    }
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (currentStep >= steps.length) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">Well Done!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium">You did great. You're present and safe.</p>
          <p className="text-sm text-gray-600">
            You've successfully completed the grounding exercise. Take a moment to notice how you feel.
          </p>
          <Button onClick={onComplete} className="w-full">Continue</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">5-4-3-2-1 Grounding</CardTitle>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Breathing animation circle */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 opacity-60 animate-pulse" />
        </div>
        
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">{currentStepData.instruction}</h3>
          <p className="text-sm text-gray-600">Take your time... you're doing well</p>
        </div>

        <div className="space-y-3">
          {Array.from({ length: currentStepData.inputs }, (_, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <Input
                placeholder={currentStepData.placeholder}
                value={currentInputs[index] || ''}
                onChange={(e) => handleInputChange(index, e.target.value)}
                className="flex-1"
              />
            </div>
          ))}
        </div>

        <Button 
          onClick={handleStepComplete}
          className="w-full mt-6"
          disabled={currentInputs.filter(input => input.trim()).length === 0}
        >
          {currentStep < steps.length - 1 ? 'Next Step' : 'Complete Exercise'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GroundingExercise;
