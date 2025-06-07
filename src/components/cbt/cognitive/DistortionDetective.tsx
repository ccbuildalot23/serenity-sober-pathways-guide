
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react';

interface DistortionExample {
  id: string;
  thought: string;
  distortion: string;
  explanation: string;
  options: string[];
}

const DistortionDetective: React.FC = () => {
  const [currentExample, setCurrentExample] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>([]);

  const distortionExamples: DistortionExample[] = [
    {
      id: '1',
      thought: "I relapsed once, so I'll never be able to stay sober.",
      distortion: 'All-or-Nothing Thinking',
      explanation: 'This is black-and-white thinking. One setback doesn\'t erase all progress or predict the future.',
      options: ['All-or-Nothing Thinking', 'Mental Filter', 'Fortune Telling', 'Catastrophizing']
    },
    {
      id: '2',
      thought: "My sponsor hasn't called me back yet. They must think I'm a hopeless case.",
      distortion: 'Mind Reading',
      explanation: 'This assumes you know what others are thinking without evidence. There could be many reasons for not calling back.',
      options: ['Mind Reading', 'Personalization', 'Emotional Reasoning', 'Labeling']
    },
    {
      id: '3',
      thought: "I made one mistake in my recovery plan. I'm a complete failure.",
      distortion: 'Labeling',
      explanation: 'This takes one specific event and creates a global label about yourself as a person.',
      options: ['Magnification', 'Labeling', 'Should Statements', 'Disqualifying the Positive']
    },
    {
      id: '4',
      thought: "I feel anxious about going to the meeting, so something bad must be going to happen.",
      distortion: 'Emotional Reasoning',
      explanation: 'This assumes that because you feel something, it must be true. Feelings aren\'t facts.',
      options: ['Emotional Reasoning', 'Fortune Telling', 'Catastrophizing', 'Mental Filter']
    },
    {
      id: '5',
      thought: "If I can't handle this stress perfectly, I'm weak and will definitely relapse.",
      distortion: 'Catastrophizing',
      explanation: 'This jumps to the worst possible outcome and assumes you can\'t handle challenges.',
      options: ['All-or-Nothing Thinking', 'Catastrophizing', 'Should Statements', 'Personalization']
    }
  ];

  const handleAnswer = () => {
    const isCorrect = selectedAnswer === distortionExamples[currentExample].distortion;
    if (isCorrect) {
      setScore(score + 1);
    }
    
    const newCompleted = [...completed];
    newCompleted[currentExample] = isCorrect;
    setCompleted(newCompleted);
    
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentExample < distortionExamples.length - 1) {
      setCurrentExample(currentExample + 1);
      setSelectedAnswer('');
      setShowResult(false);
    }
  };

  const handleRestart = () => {
    setCurrentExample(0);
    setSelectedAnswer('');
    setShowResult(false);
    setScore(0);
    setCompleted([]);
  };

  const example = distortionExamples[currentExample];
  const isLastExample = currentExample === distortionExamples.length - 1;
  const isCorrect = selectedAnswer === example.distortion;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Cognitive Distortion Detective</h3>
          <p className="text-gray-600">Identify thinking patterns that fuel distress</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline">
            {currentExample + 1} of {distortionExamples.length}
          </Badge>
          <Badge variant="secondary">
            Score: {score}/{distortionExamples.length}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Identify the Cognitive Distortion</span>
            {completed[currentExample] !== undefined && (
              completed[currentExample] ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <p className="text-lg font-medium text-blue-900">
              "{example.thought}"
            </p>
          </div>

          {!showResult ? (
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Which cognitive distortion is this an example of?
              </Label>
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {example.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <Button 
                onClick={handleAnswer} 
                disabled={!selectedAnswer}
                className="w-full"
              >
                Check Answer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <div className="flex items-center space-x-2 mb-2">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    {isCorrect ? 'Correct!' : 'Not quite right'}
                  </span>
                </div>
                <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  The correct answer is: <strong>{example.distortion}</strong>
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Explanation:</h4>
                <p className="text-sm text-gray-700">{example.explanation}</p>
              </div>

              {isLastExample ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">Exercise Complete!</h3>
                    <p className="text-gray-600">
                      Final Score: {score}/{distortionExamples.length}
                    </p>
                  </div>
                  <Button onClick={handleRestart} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : (
                <Button onClick={handleNext} className="w-full">
                  Next Example
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distortion Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Common Cognitive Distortions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><strong>All-or-Nothing:</strong> Black and white thinking</div>
            <div><strong>Mental Filter:</strong> Focusing only on negatives</div>
            <div><strong>Mind Reading:</strong> Assuming others' thoughts</div>
            <div><strong>Fortune Telling:</strong> Predicting negative outcomes</div>
            <div><strong>Catastrophizing:</strong> Imagining worst-case scenarios</div>
            <div><strong>Emotional Reasoning:</strong> Feelings = facts</div>
            <div><strong>Labeling:</strong> Global judgments from specific events</div>
            <div><strong>Should Statements:</strong> Rigid expectations</div>
            <div><strong>Personalization:</strong> Taking responsibility for everything</div>
            <div><strong>Disqualifying Positive:</strong> Dismissing good experiences</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DistortionDetective;
