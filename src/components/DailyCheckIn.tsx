
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, ArrowRight, Battery, Sunrise } from 'lucide-react';

interface ClinicalAssessment {
  phq2Score: number;
  gad2Score: number;
  phq2Responses: number[];
  gad2Responses: number[];
}

interface MoodData {
  mood: number;
  energy: number;
  hope: number;
}

interface CBTThoughtRecord {
  situation: string;
  automaticThoughts: string;
  emotions: { emotion: string; intensity: number }[];
  physicalSensations: string[];
  evidenceFor: string;
  evidenceAgainst: string;
  balancedReframe: string;
}

const DailyCheckIn = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Clinical assessment state
  const [phq2Responses, setPhq2Responses] = useState<number[]>([]);
  const [gad2Responses, setGad2Responses] = useState<number[]>([]);
  
  // Mood tracking state
  const [moodData, setMoodData] = useState<MoodData>({
    mood: 5,
    energy: 5,
    hope: 5
  });
  
  // CBT Thought Record state
  const [cbtRecord, setCbtRecord] = useState<CBTThoughtRecord>({
    situation: '',
    automaticThoughts: '',
    emotions: [],
    physicalSensations: [],
    evidenceFor: '',
    evidenceAgainst: '',
    balancedReframe: ''
  });
  
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [emotionIntensity, setEmotionIntensity] = useState([5]);
  const [reflection, setReflection] = useState<string>('');

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

  const emotionOptions = [
    'Sad', 'Angry', 'Anxious', 'Ashamed', 'Guilty', 'Hopeless', 
    'Frustrated', 'Lonely', 'Disappointed', 'Overwhelmed', 'Worried', 'Fearful'
  ];

  const physicalSensationOptions = [
    'Tight chest', 'Headache', 'Muscle tension', 'Racing heart', 
    'Stomach ache', 'Shallow breathing', 'Sweating', 'Trembling', 
    'Fatigue', 'Dizziness', 'Nausea', 'Hot flashes'
  ];

  const getBatteryIcon = (level: number) => {
    const percentage = (level / 10) * 100;
    return (
      <div className="relative">
        <Battery className="w-6 h-6" />
        <div 
          className="absolute bottom-1 left-1 bg-green-500 rounded-sm transition-all duration-300"
          style={{ width: `${percentage * 0.4}%`, height: '60%' }}
        />
      </div>
    );
  };

  const getHopeGradient = (level: number) => {
    const colors = [
      '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af',
      '#d1d5db', '#fbbf24', '#f59e0b', '#d97706', '#fbbf24'
    ];
    return colors[Math.floor(level) - 1] || colors[4];
  };

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

  const handleMoodChange = (field: keyof MoodData, value: number) => {
    setMoodData(prev => ({ ...prev, [field]: value }));
  };

  const addEmotion = () => {
    if (selectedEmotion && !cbtRecord.emotions.some(e => e.emotion === selectedEmotion)) {
      setCbtRecord(prev => ({
        ...prev,
        emotions: [...prev.emotions, { emotion: selectedEmotion, intensity: emotionIntensity[0] }]
      }));
      setSelectedEmotion('');
      setEmotionIntensity([5]);
    }
  };

  const removeEmotion = (emotion: string) => {
    setCbtRecord(prev => ({
      ...prev,
      emotions: prev.emotions.filter(e => e.emotion !== emotion)
    }));
  };

  const togglePhysicalSensation = (sensation: string) => {
    setCbtRecord(prev => ({
      ...prev,
      physicalSensations: prev.physicalSensations.includes(sensation)
        ? prev.physicalSensations.filter(s => s !== sensation)
        : [...prev.physicalSensations, sensation]
    }));
  };

  const handleSubmit = () => {
    const clinicalAssessment = calculateClinicalScores();
    
    const checkIn = {
      date: new Date().toISOString(),
      moodData,
      reflection,
      clinicalAssessment,
      cbtRecord
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
      setMoodData({ mood: 5, energy: 5, hope: 5 });
      setPhq2Responses([]);
      setGad2Responses([]);
      setCbtRecord({
        situation: '',
        automaticThoughts: '',
        emotions: [],
        physicalSensations: [],
        evidenceFor: '',
        evidenceAgainst: '',
        balancedReframe: ''
      });
      setCurrentStep(1);
    }, 3000);
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return phq2Responses.length === 2;
      case 2: return gad2Responses.length === 2;
      case 3: return true; // mood tracking
      case 4: return cbtRecord.situation.trim().length > 0;
      case 5: return cbtRecord.automaticThoughts.trim().length > 0;
      case 6: return cbtRecord.emotions.length > 0;
      case 7: return cbtRecord.physicalSensations.length > 0;
      case 8: return cbtRecord.evidenceFor.trim().length > 0 && cbtRecord.evidenceAgainst.trim().length > 0;
      case 9: return cbtRecord.balancedReframe.trim().length > 0;
      case 10: return reflection.trim().length > 0;
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

  const totalSteps = 10;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold serenity-navy text-center mb-2">
            Daily Check-In
          </h3>
          <div className="flex justify-center space-x-2 mb-4">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index + 1}
                className={`w-2 h-2 rounded-full ${
                  index + 1 <= currentStep ? 'bg-serenity-navy' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="text-center text-sm text-gray-600">
            Step {currentStep} of {totalSteps}
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

        {/* Mood & Energy Tracking */}
        {currentStep === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-4">How are you feeling today?</h4>
            </div>
            
            {/* Mood Scale */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl mb-2">{moodEmojis[Math.floor(moodData.mood) - 1]}</div>
                <div className="text-sm font-medium serenity-navy">Mood: {moodLabels[Math.floor(moodData.mood) - 1]}</div>
              </div>
              <Slider
                value={[moodData.mood]}
                onValueChange={(value) => handleMoodChange('mood', value[0])}
                min={1}
                max={10}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>😢 Very Low</span>
                <span>✨ Incredible</span>
              </div>
            </div>

            {/* Energy Scale */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">{getBatteryIcon(moodData.energy)}</div>
                <div className="text-sm font-medium serenity-navy">Energy Level: {moodData.energy.toFixed(1)}/10</div>
              </div>
              <Slider
                value={[moodData.energy]}
                onValueChange={(value) => handleMoodChange('energy', value[0])}
                min={1}
                max={10}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Empty</span>
                <span>Full</span>
              </div>
            </div>

            {/* Hope Scale */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Sunrise className="w-6 h-6" style={{ color: getHopeGradient(moodData.hope) }} />
                </div>
                <div className="text-sm font-medium serenity-navy">Hope Level: {moodData.hope.toFixed(1)}/10</div>
              </div>
              <Slider
                value={[moodData.hope]}
                onValueChange={(value) => handleMoodChange('hope', value[0])}
                min={1}
                max={10}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Dark</span>
                <span>Bright</span>
              </div>
            </div>
          </div>
        )}

        {/* CBT Step 1 - Situation */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-2">CBT Thought Record - Situation</h4>
              <p className="text-sm text-gray-600">Describe what happened that triggered difficult feelings</p>
            </div>
            
            <div>
              <Textarea
                value={cbtRecord.situation}
                onChange={(e) => setCbtRecord(prev => ({ ...prev, situation: e.target.value }))}
                placeholder="Describe the situation in detail. What happened? Where were you? Who was involved?"
                className="w-full h-32 resize-none"
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">{cbtRecord.situation.length}/500 characters</div>
            </div>
          </div>
        )}

        {/* CBT Step 2 - Automatic Thoughts */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-2">Automatic Thoughts</h4>
              <p className="text-sm text-gray-600">What went through your mind? What did you think?</p>
            </div>
            
            <div>
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">💭</span>
                <label className="text-sm font-medium text-gray-700">Your thoughts:</label>
              </div>
              <Textarea
                value={cbtRecord.automaticThoughts}
                onChange={(e) => setCbtRecord(prev => ({ ...prev, automaticThoughts: e.target.value }))}
                placeholder="What thoughts automatically came to mind? Try to capture them exactly as they occurred."
                className="w-full h-32 resize-none"
              />
            </div>
          </div>
        )}

        {/* CBT Step 3 - Emotions */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-2">Emotions</h4>
              <p className="text-sm text-gray-600">What emotions did you feel and how intense were they?</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedEmotion} onValueChange={setSelectedEmotion}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select an emotion" />
                  </SelectTrigger>
                  <SelectContent>
                    {emotionOptions.map((emotion) => (
                      <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addEmotion} disabled={!selectedEmotion}>Add</Button>
              </div>
              
              {selectedEmotion && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Intensity (1-10):</label>
                  <Slider
                    value={emotionIntensity}
                    onValueChange={setEmotionIntensity}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600">{emotionIntensity[0]}/10</div>
                </div>
              )}
              
              <div className="space-y-2">
                {cbtRecord.emotions.map((emotion, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center justify-between p-2">
                    <span>{emotion.emotion} ({emotion.intensity}/10)</span>
                    <button 
                      onClick={() => removeEmotion(emotion.emotion)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CBT Step 4 - Physical Sensations */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-2">Physical Sensations</h4>
              <p className="text-sm text-gray-600">What did you notice in your body?</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {physicalSensationOptions.map((sensation) => (
                <button
                  key={sensation}
                  onClick={() => togglePhysicalSensation(sensation)}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    cbtRecord.physicalSensations.includes(sensation)
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {sensation}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CBT Step 5 - Evidence Examination */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-2">Evidence Examination</h4>
              <p className="text-sm text-gray-600">Let's examine the evidence for and against your thoughts</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Evidence FOR this thought:</label>
                <Textarea
                  value={cbtRecord.evidenceFor}
                  onChange={(e) => setCbtRecord(prev => ({ ...prev, evidenceFor: e.target.value }))}
                  placeholder="What evidence supports this thought? What facts back it up?"
                  className="w-full h-24 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Evidence AGAINST this thought:</label>
                <Textarea
                  value={cbtRecord.evidenceAgainst}
                  onChange={(e) => setCbtRecord(prev => ({ ...prev, evidenceAgainst: e.target.value }))}
                  placeholder="What evidence contradicts this thought? What doesn't fit?"
                  className="w-full h-24 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* CBT Step 6 - Balanced Reframe */}
        {currentStep === 9 && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium serenity-navy mb-2">Balanced Reframe</h4>
              <p className="text-sm text-gray-600">What would be a more balanced, realistic thought?</p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-200">
                <p className="text-sm text-blue-700 font-medium">💡 Helpful prompt:</p>
                <p className="text-sm text-blue-600">What would you tell a friend in this situation?</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">A more balanced, realistic thought might be:</label>
                <Textarea
                  value={cbtRecord.balancedReframe}
                  onChange={(e) => setCbtRecord(prev => ({ ...prev, balancedReframe: e.target.value }))}
                  placeholder="Considering all the evidence, what's a more balanced way to think about this situation?"
                  className="w-full h-32 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Final Reflection */}
        {currentStep === 10 && (
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium serenity-navy mb-4 text-center">
                Final Reflection
              </label>
              <p className="text-sm text-gray-600 text-center mb-4">
                How are you feeling after working through this thought record?
              </p>
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Reflect on what you learned from this exercise and how you're feeling now..."
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
            {currentStep < totalSteps ? (
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
