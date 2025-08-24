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
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed. Or the opposite being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself'
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

const PHQ9Assessment: React.FC<Props> = ({ onComplete }) => {
  const [responses, setResponses] = useState<number[]>(Array(9).fill(-1));
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
    
    if (score >= 20) severity = 'severe';
    else if (score >= 15) severity = 'moderately severe';
    else if (score >= 10) severity = 'moderate';
    else if (score >= 5) severity = 'mild';

    const suicidalIdeation = responses[8] > 0;
    
    const obs = assessmentToObservation(user?.id || 'anonymous', 'phq9', score);
    await log('phq9_completed', { 
      score, 
      severity, 
      suicidalIdeation,
      fhir: obs 
    });

    if (suicidalIdeation) {
      toast.error('Immediate safety assessment required');
      escalateCrisis('severe');
    } else if (score >= 15) {
      toast.warning('Severe depression indicated - clinical evaluation recommended');
      escalateCrisis('high');
    } else if (score >= 10) {
      toast.warning('Moderate depression indicated - follow-up recommended');
    }

    onComplete?.(score);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isComplete = responses.every(v => v > -1);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>PHQ-9 Depression Assessment</CardTitle>
        <p className="text-sm text-muted-foreground">
          Over the last 2 weeks, how often have you been bothered by any of the following problems?
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
              Current Score: {responses.reduce((sum, v) => sum + (v > -1 ? v : 0), 0)}/27
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PHQ9Assessment;