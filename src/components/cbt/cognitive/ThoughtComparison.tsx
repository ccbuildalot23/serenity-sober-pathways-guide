
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Scale, Lightbulb, CheckCircle } from 'lucide-react';

interface ThoughtComparison {
  id: string;
  unhelpfulThought: string;
  balancedThought: string;
  evidence: string[];
  benefits: string[];
  timestamp: Date;
}

const ThoughtComparison: React.FC = () => {
  const [comparison, setComparison] = useState<ThoughtComparison>({
    id: '',
    unhelpfulThought: '',
    balancedThought: '',
    evidence: [],
    benefits: [],
    timestamp: new Date()
  });

  const [currentEvidence, setCurrentEvidence] = useState('');
  const [currentBenefit, setCurrentBenefit] = useState('');
  const [savedComparisons, setSavedComparisons] = useState<ThoughtComparison[]>([]);

  const addEvidence = () => {
    if (currentEvidence.trim()) {
      setComparison({
        ...comparison,
        evidence: [...comparison.evidence, currentEvidence.trim()]
      });
      setCurrentEvidence('');
    }
  };

  const addBenefit = () => {
    if (currentBenefit.trim()) {
      setComparison({
        ...comparison,
        benefits: [...comparison.benefits, currentBenefit.trim()]
      });
      setCurrentBenefit('');
    }
  };

  const removeEvidence = (index: number) => {
    const newEvidence = comparison.evidence.filter((_, i) => i !== index);
    setComparison({ ...comparison, evidence: newEvidence });
  };

  const removeBenefit = (index: number) => {
    const newBenefits = comparison.benefits.filter((_, i) => i !== index);
    setComparison({ ...comparison, benefits: newBenefits });
  };

  const handleSave = () => {
    const newComparison = {
      ...comparison,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    setSavedComparisons([newComparison, ...savedComparisons]);
    
    // Reset form
    setComparison({
      id: '',
      unhelpfulThought: '',
      balancedThought: '',
      evidence: [],
      benefits: [],
      timestamp: new Date()
    });
  };

  const isComplete = comparison.unhelpfulThought && comparison.balancedThought;

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold flex items-center justify-center space-x-2">
          <Scale className="w-6 h-6 text-purple-600" />
          <span>Side-by-Side Thought Comparison</span>
        </h3>
        <p className="text-gray-600 mt-2">
          Compare unhelpful thoughts with balanced alternatives
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unhelpful Thought */}
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-800 flex items-center space-x-2">
              <span>😰</span>
              <span>Unhelpful Thought</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Label htmlFor="unhelpfulThought">What's the negative thought?</Label>
            <Textarea
              id="unhelpfulThought"
              placeholder="Write the thought that's causing distress..."
              value={comparison.unhelpfulThought}
              onChange={(e) => setComparison({...comparison, unhelpfulThought: e.target.value})}
              className="mt-1"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Balanced Thought */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-800 flex items-center space-x-2">
              <span>🌱</span>
              <span>Balanced Thought</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Label htmlFor="balancedThought">What's a more balanced perspective?</Label>
            <Textarea
              id="balancedThought"
              placeholder="Write a more realistic, helpful way to think about this..."
              value={comparison.balancedThought}
              onChange={(e) => setComparison({...comparison, balancedThought: e.target.value})}
              className="mt-1"
              rows={4}
            />
          </CardContent>
        </Card>
      </div>

      {/* Evidence Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span>Supporting Evidence</span>
          </CardTitle>
          <p className="text-gray-600">What evidence supports the balanced thought?</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Textarea
              placeholder="Add evidence that supports your balanced thought..."
              value={currentEvidence}
              onChange={(e) => setCurrentEvidence(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button onClick={addEvidence} disabled={!currentEvidence.trim()}>
              Add
            </Button>
          </div>
          
          {comparison.evidence.length > 0 && (
            <div className="space-y-2">
              {comparison.evidence.map((evidence, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm flex-1">{evidence}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEvidence(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowRight className="w-5 h-5 text-green-500" />
            <span>Benefits of Balanced Thinking</span>
          </CardTitle>
          <p className="text-gray-600">How does the balanced thought help you?</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Textarea
              placeholder="How does thinking this way benefit you or your recovery?"
              value={currentBenefit}
              onChange={(e) => setCurrentBenefit(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button onClick={addBenefit} disabled={!currentBenefit.trim()}>
              Add
            </Button>
          </div>
          
          {comparison.benefits.length > 0 && (
            <div className="space-y-2">
              {comparison.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-green-50 rounded">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm flex-1">{benefit}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBenefit(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="text-center">
        <Button onClick={handleSave} disabled={!isComplete} size="lg">
          Save Comparison
        </Button>
      </div>

      {/* Saved Comparisons */}
      {savedComparisons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Thought Comparisons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {savedComparisons.slice(0, 3).map((comp) => (
                <div key={comp.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Badge variant="destructive" className="mb-2">Unhelpful</Badge>
                      <p className="text-gray-700">{comp.unhelpfulThought.substring(0, 100)}...</p>
                    </div>
                    <div>
                      <Badge variant="secondary" className="mb-2">Balanced</Badge>
                      <p className="text-gray-700">{comp.balancedThought.substring(0, 100)}...</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {comp.timestamp.toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ThoughtComparison;
