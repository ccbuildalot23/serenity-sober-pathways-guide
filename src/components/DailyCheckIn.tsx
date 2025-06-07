
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ClinicalAssessment {
  phq2Score: number;
  gad2Score: number;
  phq2Responses: number[];
  gad2Responses: number[];
}

const DailyCheckIn = () => {
  const [mood, setMood] = useState<number[]>([5]);
  const [reflection, setReflection] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Clinical assessment state
  const [phq2Responses, setPhq2Responses] = useState<number[]>([]);
  const [gad2Responses, setGad2Responses] = useState<number[]>([]);

  const moodEmojis = ['😢', '😟', '😐', '🙂', '😊', '😃', '🤗', '😍', '🥳', '✨'];
  const moodLabels = ['Very Low', 'Low', 'Below Average', 'Okay', 'Good', 'Great', 'Excellent', 'Amazing', 'Fantastic', 'Incredible'];

  const responseOptions = [
    { value: 0, label: "Not at all" },
    { value: 1, label: "Several days" },
    { value: 2, label: "More than half the days" },
    { value: 3, label: "Nearly every day" }
  ];

  const phq2Questions = [
    "Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?",
    "Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?"
  ];

  const gad2Questions = [
    "Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?",
    "Over the last 2 weeks, how often have you been bothered by not being able to stop or control worrying?"
  ];

  const calculateClinicalScores = (): ClinicalAssessment => {
    const phq2Score = phq2Responses.reduce((sum, score) => sum + score, 0);
    const gad2Score = gad2Responses.reduce((sum, score) => sum + score, 0);
    
    return {
      phq2Score,
      gad2Score,
      phq2Responses,
      gad2Responses
    };
  };

  const getClinicalInterpretation = (phq2Score: number, gad2Score: number) => {
    const interpretations = [];
    
    if (phq2Score >= 3) {
      interpretations.push({
        type: 'Depression',
        level: 'Screening Recommended',
        color: 'text-yellow-600',
        message: 'Your responses suggest you may benefit from speaking with a healthcare provider about depression.'
      });
    }
    
    if (gad2Score >= 3) {
      interpretations.push({
        type: 'Anxiety',
        level: 'Screening Recommended', 
        color: 'text-yellow-600',
        message: 'Your responses suggest you may benefit from speaking with a healthcare provider about anxiety.'
      });
    }

    if (interpretations.length === 0) {
      interpretations.push({
        type: 'Overall',
        level: 'Low Risk',
        color: 'serenity-emerald',
        message: 'Your responses suggest low risk for depression and anxiety symptoms.'
      });
    }

    return interpretations;
  };

  const handlePhq2Response = (questionIndex: number, value: string) => {
    const newResponses = [...phq2Responses];
    newResponses[questionIndex] = parseInt(value);
    setPhq2Responses(newResponses);
  };

  const handleGad2Response = (questionIndex: number, value: string) => {
    const newResponses = [...gad2Responses];
    newResponses[questionIndex] = parseInt(value);
    setGad2Responses(newResponses);
  };

  const handleSubmit = () => {
    const clinicalAssessment = calculateClinicalScores();
    
    const checkIn = {
      date: new Date().toISOString(),
      mood: mood[0],
      reflection: reflection,
      clinicalAssessment: clinicalAssessment
    };

    // Save to localStorage for demo
    const existingEntries = JSON.parse(localStorage.getItem('checkIns') || '[]');
    existingEntries.push(checkIn);
    localStorage.setItem('checkIns', JSON.stringify(existingEntries));

    setIsSubmitted(true);
    console.log('Check-in saved:', checkIn);
    
    // Reset form after a moment
    setTimeout(() => {
      setIsSubmitted(false);
      setReflection('');
      setMood([5]);
      setPhq2Responses([]);
      setGad2Responses([]);
      setCurrentStep(1);
    }, 3000);
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return phq2Responses.length === 2;
      case 2: return gad2Responses.length === 2;
      case 3: return true; // mood step
      case 4: return reflection.trim().length > 0;
      default: return false;
    }
  };

  if (isSubmitted) {
    const { phq2Score, gad2Score } = calculateClinicalScores();
    const interpretations = getClinicalInterpretation(phq2Score, gad2Score);
    
    return (
      <Card className="p-6 text-center animate-scale-in">
        <div className="text-6xl mb-4">✨</div>
        <h3 className="text-xl font-semibold serenity-navy mb-4">Check-in Complete!</h3>
        
        <div className="space-y-4 mb-4">
          <div className="text-sm text-gray-600">
            <div>PHQ-2 Score: {phq2Score}/6</div>
            <div>GAD-2 Score: {gad2Score}/6</div>
          </div>
          
          {interpretations.map((interp, index) => (
            <div key={index} className={`p-3 rounded-lg bg-gray-50 border-l-4 border-${interp.type.toLowerCase() === 'overall' ? 'green' : 'yellow'}-500`}>
              <div className={`font-medium ${interp.color}`}>{interp.type}: {interp.level}</div>
              <div className="text-sm text-gray-600 mt-1">{interp.message}</div>
            </div>
          ))}
        </div>
        
        <p className="text-gray-600">Thank you for taking time to reflect on your wellbeing.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold serenity-navy text-center mb-2">
            Daily Check-In
          </h3>
          <div className="flex justify-center space-x-2 mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  step <= currentStep ? 'bg-serenity-navy' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="text-center text-sm text-gray-600">
            Step {currentStep} of 4
          </div>
        </div>

        {/* PHQ-2 Depression Screening */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-2">Depression Screening (PHQ-2)</h4>
              <p className="text-sm text-gray-600">Please answer based on the last 2 weeks</p>
            </div>
            
            {phq2Questions.map((question, index) => (
              <div key={index} className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {index + 1}. {question}
                </label>
                <RadioGroup
                  value={phq2Responses[index]?.toString() || ""}
                  onValueChange={(value) => handlePhq2Response(index, value)}
                >
                  {responseOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value.toString()} id={`phq2-${index}-${option.value}`} />
                      <Label htmlFor={`phq2-${index}-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        )}

        {/* GAD-2 Anxiety Screening */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-2">Anxiety Screening (GAD-2)</h4>
              <p className="text-sm text-gray-600">Please answer based on the last 2 weeks</p>
            </div>
            
            {gad2Questions.map((question, index) => (
              <div key={index} className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {index + 1}. {question}
                </label>
                <RadioGroup
                  value={gad2Responses[index]?.toString() || ""}
                  onValueChange={(value) => handleGad2Response(index, value)}
                >
                  {responseOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value.toString()} id={`gad2-${index}-${option.value}`} />
                      <Label htmlFor={`gad2-${index}-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        )}

        {/* Mood Slider */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-4">How are you feeling today?</h4>
            </div>
            
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{moodEmojis[mood[0] - 1]}</div>
              <div className="text-lg font-medium serenity-navy">{moodLabels[mood[0] - 1]}</div>
            </div>

            <Slider
              value={mood}
              onValueChange={setMood}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        )}

        {/* Reflection */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium serenity-navy mb-4 text-center">
                What's on your mind today?
              </label>
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Share your thoughts, challenges, or victories from today..."
                className="w-full h-32 resize-none"
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 && (
            <Button 
              onClick={() => setCurrentStep(currentStep - 1)}
              variant="outline"
              className="px-6"
            >
              Back
            </Button>
          )}
          
          <div className="flex-1 flex justify-end">
            {currentStep < 4 ? (
              <Button 
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-serenity-navy hover:bg-blue-700 text-white px-6"
                disabled={!canProceedToNext()}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                className="bg-serenity-navy hover:bg-blue-700 text-white px-6"
                disabled={!canProceedToNext()}
              >
                Complete Check-In
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="p-4">
        <h4 className="font-semibold serenity-navy mb-3">This Week</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold serenity-emerald">5</div>
            <div className="text-xs text-gray-600">Check-ins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-500">7.2</div>
            <div className="text-xs text-gray-600">Avg Mood</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">3</div>
            <div className="text-xs text-gray-600">Streak</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DailyCheckIn;
