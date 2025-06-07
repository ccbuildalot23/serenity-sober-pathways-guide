
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Phone, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface CrisisAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssessmentComplete: (riskLevel: 'low' | 'moderate' | 'high' | 'severe') => void;
}

// Columbia Suicide Severity Rating Scale (C-SSRS) questions
const assessmentQuestions = [
  {
    id: 'ideation',
    question: 'In the past 24 hours, have you had thoughts about wanting to hurt yourself or end your life?',
    options: [
      { value: '0', label: 'No', points: 0 },
      { value: '1', label: 'Sometimes', points: 2 },
      { value: '2', label: 'Often', points: 4 },
      { value: '3', label: 'Almost constantly', points: 6 }
    ]
  },
  {
    id: 'plan',
    question: 'Do you have a specific plan for how you would hurt yourself?',
    options: [
      { value: '0', label: 'No plan', points: 0 },
      { value: '1', label: 'Vague plan', points: 3 },
      { value: '2', label: 'Specific plan', points: 6 }
    ]
  },
  {
    id: 'intent',
    question: 'How likely are you to act on these thoughts in the next 24 hours?',
    options: [
      { value: '0', label: 'Not at all likely', points: 0 },
      { value: '1', label: 'Somewhat likely', points: 4 },
      { value: '2', label: 'Very likely', points: 8 }
    ]
  }
];

const CrisisAssessmentModal: React.FC<CrisisAssessmentModalProps> = ({
  isOpen,
  onClose,
  onAssessmentComplete
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [totalScore, setTotalScore] = useState(0);

  const handleAnswerSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < assessmentQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Calculate final score and determine risk level
      let score = 0;
      Object.entries(answers).forEach(([questionId, value]) => {
        const question = assessmentQuestions.find(q => q.id === questionId);
        const option = question?.options.find(opt => opt.value === value);
        if (option) score += option.points;
      });

      setTotalScore(score);
      
      let riskLevel: 'low' | 'moderate' | 'high' | 'severe';
      if (score <= 2) riskLevel = 'low';
      else if (score <= 6) riskLevel = 'moderate';
      else if (score <= 12) riskLevel = 'high';
      else riskLevel = 'severe';

      onAssessmentComplete(riskLevel);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const currentQ = assessmentQuestions[currentQuestion];
  const currentAnswer = answers[currentQ.id];
  const canProceed = !!currentAnswer;

  // Emergency hotline quick access
  const callEmergency = () => {
    window.open('tel:988', '_self');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Crisis Safety Assessment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Emergency Contact Banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-red-800">
                <strong>Emergency Help Available 24/7</strong>
              </div>
              <Button
                onClick={callEmergency}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-xs px-3 py-1"
              >
                <Phone className="w-3 h-3 mr-1" />
                Call 988
              </Button>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {assessmentQuestions.length}
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-2 ml-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / assessmentQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {currentQ.question}
            </h3>

            <RadioGroup 
              value={currentAnswer || ''} 
              onValueChange={(value) => handleAnswerSelect(currentQ.id, value)}
              className="space-y-3"
            >
              {currentQ.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label 
                    htmlFor={option.value}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Navigation */}
          <div className="flex justify-between space-x-3">
            <Button
              onClick={handlePrevious}
              variant="outline"
              disabled={currentQuestion === 0}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {currentQuestion === assessmentQuestions.length - 1 ? 'Complete Assessment' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrisisAssessmentModal;
