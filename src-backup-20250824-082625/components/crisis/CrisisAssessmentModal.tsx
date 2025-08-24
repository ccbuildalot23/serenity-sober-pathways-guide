// Hope Check-In - We're here to help, not judge
// Simple questions to understand how to best support you right now

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Phone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface HopeCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckInComplete: (needLevel: 'reaching_out' | 'needing_support' | 'needing_help_now' | 'emergency') => void;
}

// Compassionate questions focused on getting help, not assessment
const checkInQuestions = [
  {
    id: 'how_are_you',
    question: "First, we're so glad you're here. How are you feeling right now?",
    options: [
      { value: 'struggling', label: "I'm really struggling", emoji: "💙" },
      { value: 'scared', label: "I'm scared", emoji: "🫂" },
      { value: 'numb', label: "I feel numb", emoji: "🤍" },
      { value: 'overwhelmed', label: "Everything feels too much", emoji: "💜" }
    ]
  },
  {
    id: 'what_helps',
    question: "What usually helps you feel a little safer?",
    options: [
      { value: 'talk', label: "Talking to someone who gets it", emoji: "💬" },
      { value: 'breathe', label: "Breathing exercises", emoji: "🌊" },
      { value: 'distract', label: "Distracting myself", emoji: "🎯" },
      { value: 'unsure', label: "I don't know right now", emoji: "❓" }
    ]
  },
  {
    id: 'support_now',
    question: "What kind of support would help most right now?",
    options: [
      { value: 'listen', label: "Someone to listen", level: 'needing_support' },
      { value: 'tools', label: "Coping tools", level: 'reaching_out' },
      { value: 'crisis', label: "Crisis support", level: 'needing_help_now' },
      { value: 'immediate', label: "I need help immediately", level: 'emergency' }
    ]
  }
];

const HopeCheckInModal: React.FC<HopeCheckInModalProps> = ({
  isOpen,
  onClose,
  onCheckInComplete
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswerSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Auto-advance for better flow
    setTimeout(() => {
      if (currentQuestion < checkInQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        // Determine support level from final answer
        const finalAnswer = checkInQuestions[2].options.find(opt => opt.value === value);
        const needLevel = (finalAnswer as any)?.level || 'needing_support';
        onCheckInComplete(needLevel);
      }
    }, 500);
  };

  const currentQ = checkInQuestions[currentQuestion];
  
  // Emergency hotline quick access
  const call988 = () => {
    window.location.href = 'tel:988';
    toast.success("Calling 988", {
      description: "You're being so brave right now",
      duration: 3000
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-gray-900 text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            Let's Check In Together
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Always-visible 988 button */}
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <strong className="text-red-400">Need immediate help?</strong>
                <p className="text-xs text-gray-400 mt-1">988 is always here</p>
              </div>
              <Button
                onClick={call988}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-6"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call 988
              </Button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center space-x-2">
            {checkInQuestions.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  index <= currentQuestion ? 'bg-purple-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Question */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-purple-400" />
              {currentQ.question}
            </h3>

            <div className="grid gap-3">
              {currentQ.options.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => handleAnswerSelect(currentQ.id, option.value)}
                  variant="outline"
                  className="h-auto py-4 px-4 justify-start text-left border-gray-700 hover:bg-gray-800 hover:border-purple-600 transition-all"
                >
                  <span className="mr-3 text-xl">
                    {'emoji' in option ? option.emoji : '💜'}
                  </span>
                  <span className="text-sm">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Encouraging message */}
          <p className="text-xs text-center text-gray-400">
            There's no wrong answer. We're just here to help.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Backward compatibility
export default HopeCheckInModal;
export { HopeCheckInModal as CrisisAssessmentModal };