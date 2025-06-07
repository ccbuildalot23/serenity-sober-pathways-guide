
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, Heart, ArrowRight, Save } from 'lucide-react';

interface ReframingExercise {
  id: string;
  situation: string;
  selfTalk: string;
  friendAdvice: string;
  reframedThought: string;
  timestamp: Date;
}

const FriendReframing: React.FC = () => {
  const [currentExercise, setCurrentExercise] = useState<ReframingExercise>({
    id: '',
    situation: '',
    selfTalk: '',
    friendAdvice: '',
    reframedThought: '',
    timestamp: new Date()
  });
  
  const [savedExercises, setSavedExercises] = useState<ReframingExercise[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Situation', description: 'Describe what happened' },
    { title: 'Self-Talk', description: 'What are you telling yourself?' },
    { title: 'Friend\'s Perspective', description: 'What would you tell a friend?' },
    { title: 'Reframe', description: 'Apply that compassion to yourself' }
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
    const newExercise = {
      ...currentExercise,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    setSavedExercises([newExercise, ...savedExercises]);
    
    // Reset form
    setCurrentExercise({
      id: '',
      situation: '',
      selfTalk: '',
      friendAdvice: '',
      reframedThought: '',
      timestamp: new Date()
    });
    setCurrentStep(0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold flex items-center justify-center space-x-2">
          <Users className="w-6 h-6 text-blue-600" />
          <span>Friend Perspective Exercise</span>
        </h3>
        <p className="text-gray-600 mt-2">
          Practice self-compassion by imagining what you'd tell a friend
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2 mb-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentStep
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-6 h-1 mx-2 ${
                  index < currentStep ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <p className="text-gray-600">{steps[currentStep].description}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {currentStep === 0 && (
            <div>
              <Label htmlFor="situation">What situation is bothering you?</Label>
              <Textarea
                id="situation"
                placeholder="Describe the situation that's causing you distress..."
                value={currentExercise.situation}
                onChange={(e) => setCurrentExercise({...currentExercise, situation: e.target.value})}
                className="mt-1"
                rows={4}
              />
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <Label htmlFor="selfTalk">What are you telling yourself about this situation?</Label>
              <Textarea
                id="selfTalk"
                placeholder="What thoughts are going through your mind? What are you saying to yourself?"
                value={currentExercise.selfTalk}
                onChange={(e) => setCurrentExercise({...currentExercise, selfTalk: e.target.value})}
                className="mt-1"
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-2">
                Be honest about your inner critic. What harsh things are you telling yourself?
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Imagine your best friend came to you with this exact situation and said:</strong>
                </p>
                <p className="italic text-blue-700">"{currentExercise.selfTalk}"</p>
              </div>
              
              <div>
                <Label htmlFor="friendAdvice">What would you tell your friend?</Label>
                <Textarea
                  id="friendAdvice"
                  placeholder="What compassionate, supportive advice would you give to a friend facing this same situation?"
                  value={currentExercise.friendAdvice}
                  onChange={(e) => setCurrentExercise({...currentExercise, friendAdvice: e.target.value})}
                  className="mt-1"
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Think about how you would be kind, understanding, and encouraging to a friend.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Your Self-Talk:</h4>
                  <p className="text-sm text-red-700 italic">"{currentExercise.selfTalk}"</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Friend's Perspective:</h4>
                  <p className="text-sm text-green-700 italic">"{currentExercise.friendAdvice}"</p>
                </div>
              </div>

              <div className="flex items-center justify-center my-4">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>

              <div>
                <Label htmlFor="reframedThought">Now, apply that same compassion to yourself:</Label>
                <Textarea
                  id="reframedThought"
                  placeholder="Rewrite your thoughts using the same kindness you'd show a friend..."
                  value={currentExercise.reframedThought}
                  onChange={(e) => setCurrentExercise({...currentExercise, reframedThought: e.target.value})}
                  className="mt-1"
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-2">
                  You deserve the same compassion you would give to others.
                </p>
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
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Exercise
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Exercises */}
      {savedExercises.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <span>Your Compassion Practice</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedExercises.slice(0, 3).map((exercise) => (
                <div key={exercise.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-800 mb-1">
                    {exercise.situation.substring(0, 100)}...
                  </p>
                  <p className="text-xs text-gray-500">
                    {exercise.timestamp.toLocaleDateString()}
                  </p>
                </div>
              ))}
              {savedExercises.length > 3 && (
                <p className="text-sm text-gray-500 text-center">
                  And {savedExercises.length - 3} more exercises...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FriendReframing;
