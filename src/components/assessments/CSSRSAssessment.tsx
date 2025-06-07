import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuditLogger } from '@/hooks/useAuditLogger';
import { escalateCrisis } from '@/services/crisisEscalationService';
import { toast } from 'sonner';

const questions = [
  {
    id: 'ideation',
    text: 'In the past month, have you wished you were dead or wished you could go to sleep and not wake up?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Yes' }
    ]
  },
  {
    id: 'plan',
    text: 'Have you actually had any thoughts of killing yourself?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Yes' }
    ]
  },
  {
    id: 'intent',
    text: 'Have you thought about how you might do this?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Yes' }
    ]
  }
];

interface Props {
  onComplete?: (score: number) => void;
}

const CSSRSAssessment: React.FC<Props> = ({ onComplete }) => {
  const [responses, setResponses] = useState<number[]>(Array(questions.length).fill(-1));
  const { log } = useAuditLogger();

  const handleSelect = (index: number, value: number) => {
    const r = [...responses];
    r[index] = value;
    setResponses(r);
  };

  const handleSubmit = async () => {
    const score = responses.reduce((sum, v) => sum + (v > -1 ? v : 0), 0);
    const anyRisk = score > 0;
    await log('cssrs_completed', { score, anyRisk });
    if (anyRisk) {
      toast.error('Immediate safety support recommended');
      escalateCrisis(score >= 2 ? 'severe' : 'high');
    }
    onComplete?.(score);
  };

  const completeEnabled = responses.every((v) => v > -1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>C-SSRS Screening</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-2">
            <p className="font-medium">{q.text}</p>
            <RadioGroup
              value={responses[idx] >= 0 ? String(responses[idx]) : ''}
              onValueChange={(v) => handleSelect(idx, Number(v))}
              className="space-y-1"
            >
              {q.options.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(opt.value)} id={`${q.id}-${opt.value}`} />
                  <Label htmlFor={`${q.id}-${opt.value}`}>{opt.label}</Label>
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

export default CSSRSAssessment;
