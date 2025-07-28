import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useSecureAuditLogger } from '@/hooks/useSecureAuditLogger';
import { escalateCrisis } from '@/services/crisisEscalationService';
import { useAuth } from '@/contexts/AuthContext';
import { assessmentToObservation } from '@/fhir/convertAssessment';
import { toast } from 'sonner';

const questions = [
  {
    text: 'How often do you have a drink containing alcohol?',
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Monthly or less' },
      { value: 2, label: '2-4 times a month' },
      { value: 3, label: '2-3 times a week' },
      { value: 4, label: '4 or more times a week' }
    ]
  },
  {
    text: 'How many drinks containing alcohol do you have on a typical day when you are drinking?',
    options: [
      { value: 0, label: '1 or 2' },
      { value: 1, label: '3 or 4' },
      { value: 2, label: '5 or 6' },
      { value: 3, label: '7 to 9' },
      { value: 4, label: '10 or more' }
    ]
  },
  {
    text: 'How often do you have six or more drinks on one occasion?',
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Less than monthly' },
      { value: 2, label: 'Monthly' },
      { value: 3, label: 'Weekly' },
      { value: 4, label: 'Daily or almost daily' }
    ]
  },
  {
    text: 'How often during the last year have you found that you were not able to stop drinking once you had started?',
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Less than monthly' },
      { value: 2, label: 'Monthly' },
      { value: 3, label: 'Weekly' },
      { value: 4, label: 'Daily or almost daily' }
    ]
  },
  {
    text: 'How often during the last year have you failed to do what was normally expected of you because of drinking?',
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Less than monthly' },
      { value: 2, label: 'Monthly' },
      { value: 3, label: 'Weekly' },
      { value: 4, label: 'Daily or almost daily' }
    ]
  },
  {
    text: 'How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?',
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Less than monthly' },
      { value: 2, label: 'Monthly' },
      { value: 3, label: 'Weekly' },
      { value: 4, label: 'Daily or almost daily' }
    ]
  },
  {
    text: 'How often during the last year have you had a feeling of guilt or remorse after drinking?',
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Less than monthly' },
      { value: 2, label: 'Monthly' },
      { value: 3, label: 'Weekly' },
      { value: 4, label: 'Daily or almost daily' }
    ]
  },
  {
    text: 'How often during the last year have you been unable to remember what happened the night before because of your drinking?',
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Less than monthly' },
      { value: 2, label: 'Monthly' },
      { value: 3, label: 'Weekly' },
      { value: 4, label: 'Daily or almost daily' }
    ]
  },
  {
    text: 'Have you or someone else been injured because of your drinking?',
    options: [
      { value: 0, label: 'No' },
      { value: 2, label: 'Yes, but not in the last year' },
      { value: 4, label: 'Yes, during the last year' }
    ]
  },
  {
    text: 'Has a relative, friend, doctor, or other health care worker been concerned about your drinking or suggested you cut down?',
    options: [
      { value: 0, label: 'No' },
      { value: 2, label: 'Yes, but not in the last year' },
      { value: 4, label: 'Yes, during the last year' }
    ]
  }
];

interface Props {
  onComplete?: (score: number) => void;
}

const AUDITAssessment: React.FC<Props> = ({ onComplete }) => {
  const [responses, setResponses] = useState<number[]>(Array(10).fill(-1));
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const { log } = useSecureAuditLogger();
  const { user } = useAuth();

  const handleSelect = (index: number, value: number) => {
    const r = [...responses];
    r[index] = value;
    setResponses(r);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    const score = responses.reduce((sum, v) => sum + (v > -1 ? v : 0), 0);
    let riskLevel = 'low';
    
    if (score >= 20) riskLevel = 'high';
    else if (score >= 16) riskLevel = 'very high';
    else if (score >= 8) riskLevel = 'medium';

    const obs = assessmentToObservation(user?.id || 'anonymous', 'audit', score);
    await log('audit_completed', { 
      score, 
      riskLevel,
      fhir: obs 
    });

    if (score >= 20) {
      toast.error('High risk alcohol use detected - immediate clinical evaluation recommended');
      escalateCrisis('high');
    } else if (score >= 16) {
      toast.warning('Very high risk alcohol use - comprehensive assessment recommended');
    } else if (score >= 8) {
      toast.warning('Medium risk alcohol use - brief intervention recommended');
    }

    onComplete?.(score);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isComplete = responses.every(v => v > -1);
  const currentQ = questions[currentQuestion];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AUDIT - Alcohol Use Disorders Identification Test</CardTitle>
        <p className="text-sm text-muted-foreground">
          Please answer each question about your alcohol use.
        </p>
        <Progress value={progress} className="w-full" />
        <p className="text-xs text-muted-foreground">
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <p className="font-medium text-lg">
            {currentQ.text}
          </p>
          <RadioGroup
            value={responses[currentQuestion] >= 0 ? String(responses[currentQuestion]) : ''}
            onValueChange={(v) => handleSelect(currentQuestion, Number(v))}
            className="space-y-2"
          >
            {currentQ.options.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem 
                  value={String(opt.value)} 
                  id={`q${currentQuestion}-${opt.value}`} 
                />
                <Label 
                  htmlFor={`q${currentQuestion}-${opt.value}`}
                  className="flex-1 cursor-pointer"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          
          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={responses[currentQuestion] === -1}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isComplete}
              className="bg-primary hover:bg-primary/90"
            >
              Complete Assessment
            </Button>
          )}
        </div>

        {/* Score Preview */}
        {responses.some(r => r >= 0) && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Current Score: {responses.reduce((sum, v) => sum + (v > -1 ? v : 0), 0)}/40
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AUDITAssessment;