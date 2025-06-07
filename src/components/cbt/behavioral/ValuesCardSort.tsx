
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Star, RotateCcw, Save } from 'lucide-react';

interface Value {
  id: string;
  name: string;
  description: string;
  category: 'relationships' | 'personal-growth' | 'health' | 'spirituality' | 'contribution' | 'achievement';
}

const ValuesCardSort: React.FC = () => {
  const [selectedValues, setSelectedValues] = useState<Value[]>([]);
  const [topValues, setTopValues] = useState<Value[]>([]);
  const [step, setStep] = useState<'select' | 'prioritize' | 'complete'>('select');

  const allValues: Value[] = [
    // Relationships
    { id: '1', name: 'Family', description: 'Close relationships with family members', category: 'relationships' },
    { id: '2', name: 'Friendship', description: 'Deep, meaningful friendships', category: 'relationships' },
    { id: '3', name: 'Love', description: 'Intimate, romantic relationships', category: 'relationships' },
    { id: '4', name: 'Community', description: 'Being part of a supportive community', category: 'relationships' },

    // Personal Growth
    { id: '5', name: 'Learning', description: 'Continuous learning and education', category: 'personal-growth' },
    { id: '6', name: 'Creativity', description: 'Expressing creativity and imagination', category: 'personal-growth' },
    { id: '7', name: 'Independence', description: 'Self-reliance and autonomy', category: 'personal-growth' },
    { id: '8', name: 'Authenticity', description: 'Being true to yourself', category: 'personal-growth' },

    // Health
    { id: '9', name: 'Physical Health', description: 'Maintaining physical wellness', category: 'health' },
    { id: '10', name: 'Mental Health', description: 'Emotional and psychological wellbeing', category: 'health' },
    { id: '11', name: 'Recovery', description: 'Maintaining sobriety and healing', category: 'health' },
    { id: '12', name: 'Balance', description: 'Work-life balance and moderation', category: 'health' },

    // Spirituality
    { id: '13', name: 'Faith', description: 'Religious or spiritual beliefs', category: 'spirituality' },
    { id: '14', name: 'Purpose', description: 'Having a sense of life purpose', category: 'spirituality' },
    { id: '15', name: 'Mindfulness', description: 'Present-moment awareness', category: 'spirituality' },
    { id: '16', name: 'Inner Peace', description: 'Serenity and calm', category: 'spirituality' },

    // Contribution
    { id: '17', name: 'Service', description: 'Helping others and giving back', category: 'contribution' },
    { id: '18', name: 'Justice', description: 'Fairness and equality', category: 'contribution' },
    { id: '19', name: 'Environment', description: 'Protecting the environment', category: 'contribution' },
    { id: '20', name: 'Mentoring', description: 'Guiding and supporting others', category: 'contribution' },

    // Achievement
    { id: '21', name: 'Success', description: 'Professional and personal success', category: 'achievement' },
    { id: '22', name: 'Excellence', description: 'Striving for high standards', category: 'achievement' },
    { id: '23', name: 'Financial Security', description: 'Financial stability and freedom', category: 'achievement' },
    { id: '24', name: 'Recognition', description: 'Being acknowledged for achievements', category: 'achievement' }
  ];

  const categoryColors = {
    'relationships': 'bg-pink-100 text-pink-800 border-pink-200',
    'personal-growth': 'bg-blue-100 text-blue-800 border-blue-200',
    'health': 'bg-green-100 text-green-800 border-green-200',
    'spirituality': 'bg-purple-100 text-purple-800 border-purple-200',
    'contribution': 'bg-orange-100 text-orange-800 border-orange-200',
    'achievement': 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };

  const toggleValue = (value: Value) => {
    if (selectedValues.find(v => v.id === value.id)) {
      setSelectedValues(selectedValues.filter(v => v.id !== value.id));
    } else if (selectedValues.length < 10) {
      setSelectedValues([...selectedValues, value]);
    }
  };

  const moveToTop = (value: Value) => {
    if (topValues.length < 5 && !topValues.find(v => v.id === value.id)) {
      setTopValues([...topValues, value]);
    }
  };

  const removeFromTop = (value: Value) => {
    setTopValues(topValues.filter(v => v.id !== value.id));
  };

  const handleReset = () => {
    setSelectedValues([]);
    setTopValues([]);
    setStep('select');
  };

  const handleSave = () => {
    // Save to local storage or database
    console.log('Saving top values:', topValues);
    setStep('complete');
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold">Values Card Sort</h3>
        <p className="text-gray-600">Identify your core values to guide meaningful activities</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center space-x-2 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'select' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          1
        </div>
        <div className="w-8 h-1 bg-gray-200"></div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'prioritize' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          2
        </div>
        <div className="w-8 h-1 bg-gray-200"></div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'complete' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          3
        </div>
      </div>

      {step === 'select' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Step 1: Choose Your Values</span>
                <Badge variant="outline">
                  {selectedValues.length}/10 selected
                </Badge>
              </CardTitle>
              <p className="text-gray-600">
                Select up to 10 values that resonate most with you and your recovery journey.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allValues.map((value) => {
                  const isSelected = selectedValues.find(v => v.id === value.id);
                  return (
                    <div
                      key={value.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? `${categoryColors[value.category]} ring-2 ring-offset-2 ring-primary`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleValue(value)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{value.name}</h4>
                        {isSelected && <Heart className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-sm text-gray-600">{value.description}</p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {value.category.replace('-', ' ')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button 
                  onClick={() => setStep('prioritize')}
                  disabled={selectedValues.length === 0}
                >
                  Next: Prioritize
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {step === 'prioritize' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Selected Values</CardTitle>
                <p className="text-gray-600">Click to move to your top 5</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedValues.filter(v => !topValues.find(tv => tv.id === v.id)).map((value) => (
                    <div
                      key={value.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm ${categoryColors[value.category]}`}
                      onClick={() => moveToTop(value)}
                    >
                      <h4 className="font-medium">{value.name}</h4>
                      <p className="text-sm">{value.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Top 5 Values</span>
                  <Badge variant="outline">
                    {topValues.length}/5
                  </Badge>
                </CardTitle>
                <p className="text-gray-600">Your most important values</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topValues.map((value, index) => (
                    <div
                      key={value.id}
                      className="p-3 rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="default" className="w-6 h-6 rounded-full flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <h4 className="font-medium">{value.name}</h4>
                            <p className="text-sm text-gray-600">{value.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromTop(value)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {topValues.length < 5 && (
                    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                      Select {5 - topValues.length} more value{5 - topValues.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('select')}>
              Back
            </Button>
            <Button 
              onClick={handleSave}
              disabled={topValues.length !== 5}
            >
              <Save className="w-4 h-4 mr-2" />
              Complete
            </Button>
          </div>
        </>
      )}

      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-6 h-6 text-yellow-500" />
              <span>Your Core Values</span>
            </CardTitle>
            <p className="text-gray-600">
              Use these values to guide your activity choices and life decisions
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topValues.map((value, index) => (
                <div
                  key={value.id}
                  className="p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-lg">{value.name}</h4>
                      <p className="text-gray-600">{value.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Next Steps</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Use these values to evaluate activity choices</li>
                <li>• Schedule activities that align with your top values</li>
                <li>• Review this list monthly to stay connected to what matters most</li>
                <li>• Share these values with your support network</li>
              </ul>
            </div>
            
            <div className="flex justify-center mt-6">
              <Button onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ValuesCardSort;
