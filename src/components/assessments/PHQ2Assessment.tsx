import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuditLogger } from '@/hooks/useAuditLogger';
import { escalateCrisis } from '@/services/crisisEscalationService';
import { useAuth } from '@/contexts/AuthContext';
import { assessmentToObservation } from '@/fhir/convertAssessment';
import { toast } from 'sonner';

const questions = [
  'Over the last 2 weeks, how often have you had little interest or pleasure in doing things?',
  'Over the last 2 weeks, how often have you felt down, depressed, or hopeless?'
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

const PHQ2Assessment: React.FC<Props> = ({ onComplete }) => {
  const [responses, setResponses] = useState<number[]>(Array(2).fill(-1));
  const { log } = useAuditLogger();
  const { user } = useAuth();

  const handleSelect = (index: number, value: number) => {
    const r = [...responses];
    r[index] = value;
    setResponses(r);
  };

  const handleSubmit = async () => {
    const score = responses.reduce((sum, v) => sum + (v > -1 ? v : 0), 0);
    const flag = score >= 3;
    const obs = assessmentToObservation(user?.id || 'anonymous', 'phq2', score);
    await log('phq2_completed', { score, flag, fhir: obs });
    if (flag) {
      toast.warning('PHQ‑9 recommended based on your responses');
      escalateCrisis('high');
    }
    onComplete?.(score);
  };

  const completeEnabled = responses.every((v) => v > -1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>PHQ-2 Depression Screening</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, idx) => (
          <div key={idx} className="space-y-2">
            <p className="font-medium">{q}</p>
            <RadioGroup
              value={responses[idx] >= 0 ? String(responses[idx]) : ''}
              onValueChange={(v) => handleSelect(idx, Number(v))}
              className="space-y-1"
            >
              {options.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(opt.value)} id={`${idx}-${opt.value}`} />
                  <Label htmlFor={`${idx}-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
        <Button disabled={!completeEnabled} onClick={handleSubmit}>Complete</Button>
      </CardContent>
    </Card>
  );
};

export default PHQ2Assessment;
