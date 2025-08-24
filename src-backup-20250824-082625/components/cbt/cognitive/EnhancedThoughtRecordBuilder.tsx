import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, Download, Share2, Lightbulb, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSkillSession } from '@/hooks/useSkillSession';
import { toast } from 'sonner';

interface ThoughtRecordTemplate {
  id: string;
  _name: string;
  scenario: string;
  automaticThoughtExample: string;
  _balancedThoughtExample: string;
  _category: string;
}

interface ThoughtRecordData {
  _situation: string;
  _automaticThoughts: string;
  emotions: string[];
  physicalSensations: string[];
  _evidenceFor: string;
  _evidenceAgainst: string;
  _balancedReframe: string;
}

const EnhancedThoughtRecordBuilder: React.FC = () => {
  const { user } = useAuth();
  const { recordSkillSession } = useSkillSession();
  const [templates, setTemplates] = useState<ThoughtRecordTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ThoughtRecordTemplate | null>(null);
  const [thoughtRecord, setThoughtRecord] = useState<ThoughtRecordData>({
    _situation: '',
    _automaticThoughts: '',
    emotions: [],
    physicalSensations: [],
    _evidenceFor: '',
    _evidenceAgainst: '',
    _balancedReframe: ''
  });
  const [_currentStep, setCurrentStep] = useState(0);
  const [completedRecords, setCompletedRecords] = useState(0);
  const [_effectivenessRating, setEffectivenessRating] = useState<number | null>(null);

  const emotionOptions = [
    'Angry', 'Anxious', 'Sad', 'Frustrated', 'Lonely', 'Guilty', 
    'Ashamed', 'Hopeless', 'Overwhelmed', 'Disappointed'
  ];

  const sensationOptions = [
    'Tight chest', 'Racing heart', 'Muscle tension', 'Nausea',
    'Headache', 'Sweating', 'Shaking', 'Dizziness', 'Fatigue'
  ];

  const steps = [
    'Choose Template', 'Describe Situation', 'Identify Thoughts', 
    'Recognize Emotions', 'Examine Evidence', 'Create Balance', 'Rate Effectiveness'
  ];

  useEffect(() => {
    loadTemplates();
    loadProgress();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, _error } = await supabase
        .from('thought_record_templates')
        .select('*')
        .order('_category', { ascending: true });

      if (_error) throw _error;
      if (data) {
        setTemplates(data.map(template => ({
          id: template.id,
          _name: template._name,
          scenario: template.scenario,
          automaticThoughtExample: template.automatic_thought_example,
          _balancedThoughtExample: template.balanced_thought_example,
          _category: template._category
        })));
      }
    } catch (_error) {
      console._error('Error loading templates:', _error);
    }
  };

  const loadProgress = async () => {
    if (!user) return;

    try {
      const { data, _error } = await supabase
        .from('thought_records')
        .select('*')
        .eq('user_id', user.id);

      if (_error) throw _error;
      setCompletedRecords(data?.length || 0);
    } catch (_error) {
      console._error('Error loading progress:', _error);
    }
  };

  const handleTemplateSelect = (template: ThoughtRecordTemplate) => {
    setSelectedTemplate(template);
    setThoughtRecord(prev => ({
      ...prev,
      _situation: template.scenario,
      _automaticThoughts: template.automaticThoughtExample
    }));
    setCurrentStep(1);
  };

  const toggleEmotion = (emotion: string) => {
    setThoughtRecord(prev => ({
      ...prev,
      emotions: prev.emotions.includes(emotion)
        ? prev.emotions.filter(e => e !== emotion)
        : [...prev.emotions, emotion]
    }));
  };

  const toggleSensation = (sensation: string) => {
    setThoughtRecord(prev => ({
      ...prev,
      physicalSensations: prev.physicalSensations.includes(sensation)
        ? prev.physicalSensations.filter(s => s !== sensation)
        : [...prev.physicalSensations, sensation]
    }));
  };

  const handleNext = () => {
    if (_currentStep < steps.length - 1) {
      setCurrentStep(_currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (_currentStep > 0) {
      setCurrentStep(_currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const { _error } = await supabase
        .from('thought_records')
        .insert({
          user_id: user.id,
          _situation: thoughtRecord._situation,
          _automatic_thoughts: thoughtRecord._automaticThoughts,
          emotions: thoughtRecord.emotions,
          _physical_sensations: thoughtRecord.physicalSensations,
          _evidence_for: thoughtRecord._evidenceFor,
          _evidence_against: thoughtRecord._evidenceAgainst,
          _balanced_reframe: thoughtRecord._balancedReframe
        });

      if (_error) throw _error;

      // Record skill session
      await recordSkillSession({
        skillCategory: 'cognitive',
        _skillName: 'Thought Record',
        _moduleType: 'cognitive_restructuring',
        _effectivenessRating: _effectivenessRating || undefined,
        _realWorldApplied: true
      });

      toast.success('Thought record saved!', {
        description: 'Great work on challenging your thoughts.'
      });

      // Reset form
      setThoughtRecord({
        _situation: '',
        _automaticThoughts: '',
        emotions: [],
        physicalSensations: [],
        _evidenceFor: '',
        _evidenceAgainst: '',
        _balancedReframe: ''
      });
      setCurrentStep(0);
      setSelectedTemplate(null);
      setEffectivenessRating(null);
      loadProgress();

    } catch (_error) {
      console._error('Error saving thought record:', _error);
      toast._error('Failed to save thought record');
    }
  };

  const exportToPDF = () => {
    const printContent = `
      Thought Record - ${new Date().toLocaleDateString()}
      
      Situation: ${thoughtRecord._situation}
      
      Automatic Thoughts: ${thoughtRecord._automaticThoughts}
      
      Emotions: ${thoughtRecord.emotions.join(', ')}
      
      Physical Sensations: ${thoughtRecord.physicalSensations.join(', ')}
      
      Evidence For: ${thoughtRecord._evidenceFor}
      
      Evidence Against: ${thoughtRecord._evidenceAgainst}
      
      Balanced Reframe: ${thoughtRecord._balancedReframe}
    `;
    
    const _blob = new Blob([printContent], { type: 'text/plain' });
    const url = URL.createObjectURL(_blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thought-record-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const renderStepContent = () => {
    switch (_currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-3">Choose a Template or Start Fresh</h3>
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  className="p-4 h-auto text-left"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setCurrentStep(1);
                  }}
                >
                  <div>
                    <div className="font-medium">Start with Blank Template</div>
                    <div className="text-sm text-gray-600">Create your own thought record from scratch</div>
                  </div>
                </Button>
                
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="p-4 h-auto text-left"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{template._name}</span>
                        <Badge variant="secondary">{template._category}</Badge>
                      </div>
                      <div className="text-sm text-gray-600">{template.scenario}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Describe the _situation that triggered your thoughts:
              </label>
              <Textarea
                value={thoughtRecord._situation}
                onChange={(e) => setThoughtRecord(prev => ({ ...prev, _situation: e.target.value }))}
                placeholder="What was happening when you had these thoughts? Be specific about time, place, and people involved."
                className="min-h-[100px]"
              />
            </div>
            {selectedTemplate && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Template Example</span>
                </div>
                <p className="text-sm text-blue-700">{selectedTemplate.scenario}</p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                What automatic thoughts went through your mind?
              </label>
              <Textarea
                value={thoughtRecord._automaticThoughts}
                onChange={(e) => setThoughtRecord(prev => ({ ...prev, _automaticThoughts: e.target.value }))}
                placeholder="What specific thoughts did you have? Write them exactly as they occurred to you."
                className="min-h-[100px]"
              />
            </div>
            {selectedTemplate && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Template Example</span>
                </div>
                <p className="text-sm text-blue-700">"{selectedTemplate.automaticThoughtExample}"</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">
                What emotions did you feel? (Select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {emotionOptions.map((emotion) => (
                  <Button
                    key={emotion}
                    variant={thoughtRecord.emotions.includes(emotion) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleEmotion(emotion)}
                  >
                    {emotion}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-3">
                What physical sensations did you notice?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {sensationOptions.map((sensation) => (
                  <Button
                    key={sensation}
                    variant={thoughtRecord.physicalSensations.includes(sensation) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSensation(sensation)}
                  >
                    {sensation}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-[#1E3A8A] mb-2">
                Let's examine the evidence for and against this thought
              </h3>
              <p className="text-sm text-[#1E3A8A] mb-4">
                This step helps you pause and look at the thought objectively. What makes it feel true? What makes you think it might not be the whole story?
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[#1E3A8A] mb-2">
                Evidence FOR this thought:
              </label>
              <p className="text-xs text-[#1E3A8A] mb-1">
                What facts or experiences support the thought?
              </p>
              <p className="text-xs text-gray-500 mb-3">
                e.g., "I messed up yesterday," "Someone was upset with me."
              </p>
              <Textarea
                value={thoughtRecord._evidenceFor}
                onChange={(e) => setThoughtRecord(prev => ({ ...prev, _evidenceFor: e.target.value }))}
                placeholder="What facts or experiences support this thought?"
                className="min-h-[80px]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[#1E3A8A] mb-2">
                Evidence AGAINST this thought:
              </label>
              <p className="text-xs text-[#1E3A8A] mb-1">
                What shows this thought might be too harsh or incomplete?
              </p>
              <p className="text-xs text-gray-500 mb-3">
                e.g., "I've made it through worse," "I reached out for help," "People still care."
              </p>
              <Textarea
                value={thoughtRecord._evidenceAgainst}
                onChange={(e) => setThoughtRecord(prev => ({ ...prev, _evidenceAgainst: e.target.value }))}
                placeholder="What facts or experiences contradict this thought? What would you tell a friend?"
                className="min-h-[80px]"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Create a more balanced, realistic thought:
              </label>
              <Textarea
                value={thoughtRecord._balancedReframe}
                onChange={(e) => setThoughtRecord(prev => ({ ...prev, _balancedReframe: e.target.value }))}
                placeholder="Based on the evidence, what's a more balanced way to think about this _situation?"
                className="min-h-[100px]"
              />
            </div>
            
            {selectedTemplate && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Template Example</span>
                </div>
                <p className="text-sm text-green-700">"{selectedTemplate._balancedThoughtExample}"</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-red-800 mb-2">Original Thought:</h4>
                <p className="text-sm text-red-700 italic">"{thoughtRecord._automaticThoughts}"</p>
              </div>
              <div>
                <h4 className="font-medium text-green-800 mb-2">Balanced Thought:</h4>
                <p className="text-sm text-green-700 italic">"{thoughtRecord._balancedReframe}"</p>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-3">
                How helpful was this thought record exercise? (1-10)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                  <Button
                    key={rating}
                    variant={_effectivenessRating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEffectivenessRating(rating)}
                  >
                    {rating}
                  </Button>
                ))}
              </div>
              {_effectivenessRating && (
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(_effectivenessRating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {_effectivenessRating}/10 - {_effectivenessRating >= 8 ? 'Excellent!' : _effectivenessRating >= 6 ? 'Good work!' : 'Keep practicing!'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Your Progress Summary:</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p>• Completed thought records: {completedRecords + 1}</p>
                <p>• Emotions identified: {thoughtRecord.emotions.length}</p>
                <p>• Physical sensations noted: {thoughtRecord.physicalSensations.length}</p>
                <p>• Balanced reframe created: ✓</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-[#1E3A8A]">
            Enhanced Thought Record Builder
          </CardTitle>
          <div className="flex gap-2">
            {_currentStep === steps.length - 1 && (
              <>
                <Button variant="outline" size="sm" onClick={exportToPDF}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Step {_currentStep + 1} of {steps.length}: {steps[_currentStep]}</span>
            <span>Completed Records: {completedRecords}</span>
          </div>
          <Progress value={(_currentStep / (steps.length - 1)) * 100} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {renderStepContent()}
        
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={_currentStep === 0}
          >
            Previous
          </Button>
          
          {_currentStep === steps.length - 1 ? (
            <Button
              onClick={handleSave}
              disabled={!_effectivenessRating}
              className="bg-[#10B981] hover:bg-[#059669]"
            >
              Save Thought Record
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={
                (_currentStep === 1 && !thoughtRecord._situation) ||
                (_currentStep === 2 && !thoughtRecord._automaticThoughts) ||
                (_currentStep === 5 && !thoughtRecord._balancedReframe)
              }
              className="bg-[#1E3A8A] hover:bg-[#1E40AF]"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedThoughtRecordBuilder;
