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
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen'
];

const options = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' }
];

interface Props {
  onComplete?: (score: number) => void;
}

const GAD7Assessment: React.FC<Props> = ({ onComplete }) => {
  const [responses, setResponses] = useState<number[]>(Array(7).fill(-1));
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
    let severity = 'minimal';
    
    if (score >= 15) severity = 'severe';
    else if (score >= 10) severity = 'moderate';
    else if (score >= 5) severity = 'mild';

    const obs = assessmentToObservation(user?.id || 'anonymous', 'gad7', score);
    await log('gad7_completed', { 
      score, 
      severity,
      fhir: obs 
    });

    if (score >= 15) {
      toast.warning('Severe anxiety indicated - clinical evaluation recommended');
      escalateCrisis('high');
    } else if (score >= 10) {
      toast.warning('Moderate anxiety indicated - follow-up recommended');
    }

    onComplete?.(score);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isComplete = responses.every(v => v > -1);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>GAD-7 Anxiety Assessment</CardTitle>
        <p className="text-sm text-muted-foreground">
          Over the last 2 weeks, how often have you been bothered by the following problems?
        </p>
        <Progress value={progress} className="w-full" />
        <p className="text-xs text-muted-foreground">
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <p className="font-medium text-lg">
            {questions[currentQuestion]}
          </p>
          <RadioGroup
            value={responses[currentQuestion] >= 0 ? String(responses[currentQuestion]) : ''}
            onValueChange={(v) => handleSelect(currentQuestion, Number(v))}
            className="space-y-2"
          >
            {options.map((opt) => (
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
              Current Score: {responses.reduce((sum, v) => sum + (v > -1 ? v : 0), 0)}/21
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GAD7Assessment;