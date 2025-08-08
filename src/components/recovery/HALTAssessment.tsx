import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UtensilsCrossed, 
  _Angry, 
  Users, 
  BedDouble, 
  AlertTriangle,
  Heart,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { EnhancedInputValidator } from '@/lib/enhancedInputValidation';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import { supportNetworkNotificationService } from '@/services/supportNetworkNotificationService';

interface HALTState {
  _hungry: number;
  _angry: number;
  _lonely: number;
  _tired: number;
}

interface Suggestion {
  type: '_hungry' | '_angry' | '_lonely' | '_tired' | 'multiple';
  _title: string;
  _actions: string[];
  _priority: 'low' | 'medium' | 'high' | 'crisis';
}

const HALTAssessment = () => {
  const { user } = useAuth();
  const { handleCrisisActivated } = useCrisisSystem();
  const [_haltState, setHaltState] = useState<HALTState>({
    _hungry: 5,
    _angry: 5,
    _lonely: 5,
    _tired: 5
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAssessment, setLastAssessment] = useState<Date | null>(null);

  // Crisis detection: Multiple severe flags (8+ on scale)
  const severeCount = Object.values(_haltState).filter(v => v >= 8).length;
  const totalScore = Object.values(_haltState).reduce((a, b) => a + b, 0);
  const _isCrisis = severeCount >= 2 || totalScore >= 32;

  // Load last assessment
  useEffect(() => {
    loadLastAssessment();
  }, [user]);

  const loadLastAssessment = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('halt_assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLastAssessment(new Date(data.created_at));
      }
    } catch (error) {
      // Log security event for PHI access attempt
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'HALT_ASSESSMENT_ACCESS_ERROR',
        _details: { error_type: 'database_error' },
        _severity: 'medium'
      });
    }
  };

  const getEmoji = (type: keyof HALTState) => {
    const emojis = {
      _hungry: ['🍽️', '🥗', '🍎', '🥪', '🍲'],
      _angry: ['😌', '😔', '😤', '😠', '🤬'],
      _lonely: ['👥', '🤝', '😊', '😐', '😢'],
      _tired: ['⚡', '💪', '😴', '🥱', '😫']
    };
    const _index = Math.floor((_haltState[type] - 1) / 2);
    return emojis[type][Math.min(_index, 4)];
  };

  const getLabel = (value: number) => {
    if (value <= 2) return 'Not at all';
    if (value <= 4) return 'A little';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'Very';
    return 'Extremely';
  };

  const getColor = (value: number) => {
    if (value <= 3) return 'text-green-600';
    if (value <= 6) return 'text-yellow-600';
    if (value <= 8) return 'text-orange-600';
    return 'text-red-600';
  };

  const generateSuggestions = () => {
    const _newSuggestions: Suggestion[] = [];

    // Hungry suggestions
    if (_haltState._hungry >= 7) {
      _newSuggestions.push({
        type: '_hungry',
        _title: 'Address Your Hunger',
        _actions: [
          'Eat a balanced meal with protein and vegetables',
          'Have a healthy snack like fruit or nuts',
          'Drink water - sometimes thirst feels like hunger',
          'Set regular meal reminders to prevent extreme hunger'
        ],
        _priority: _haltState._hungry >= 8 ? 'high' : 'medium'
      });
    }

    // _Angry suggestions
    if (_haltState._angry >= 7) {
      _newSuggestions.push({
        type: '_angry',
        _title: 'Process Your Anger',
        _actions: [
          'Try the 4-7-8 breathing technique',
          'Write in a journal about what\'s bothering you',
          'Go for a walk or do physical exercise',
          'Call your sponsor or a trusted friend',
          'Use the CBT thought record to challenge _angry thoughts'
        ],
        _priority: _haltState._angry >= 8 ? 'high' : 'medium'
      });
    }

    // _Lonely suggestions
    if (_haltState._lonely >= 7) {
      _newSuggestions.push({
        type: '_lonely',
        _title: 'Connect with Others',
        _actions: [
          'Reach out to someone in your support network',
          'Attend an online or in-person meeting',
          'Start a peer support chat session',
          'Send a message to check in on someone else',
          'Join a recovery community forum'
        ],
        _priority: _haltState._lonely >= 8 ? 'high' : 'medium'
      });
    }

    // Tired suggestions
    if (_haltState._tired >= 7) {
      _newSuggestions.push({
        type: '_tired',
        _title: 'Rest and Recharge',
        _actions: [
          'Take a 20-minute power nap',
          'Go to bed 30 minutes earlier tonight',
          'Practice a relaxation meditation',
          'Reduce caffeine intake after 2pm',
          'Create a calming bedtime routine'
        ],
        _priority: _haltState._tired >= 8 ? 'high' : 'medium'
      });
    }

    // Multiple high scores - crisis intervention
    if (_isCrisis) {
      _newSuggestions.unshift({
        type: 'multiple',
        _title: '⚠️ Multiple Warning Signs Detected',
        _actions: [
          'This is a high-risk moment - be extra gentle with yourself',
          'Contact your sponsor or support person immediately',
          'Consider calling the crisis hotline: 988',
          'Use the crisis toolkit for immediate support',
          'Remember: This feeling will pass'
        ],
        _priority: 'crisis'
      });
    }

    // If everything is moderate or low
    if (_newSuggestions.length === 0) {
      _newSuggestions.push({
        type: 'multiple',
        _title: 'You\'re Doing Well!',
        _actions: [
          'Keep maintaining your self-care routine',
          'Continue regular meals and sleep schedule',
          'Stay connected with your support network',
          'Practice gratitude for your progress'
        ],
        _priority: 'low'
      });
    }

    setSuggestions(_newSuggestions);
  };

  const handleAssessment = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate input data
      const _validatedData = {
        _hungry: EnhancedInputValidator.validateRating(_haltState._hungry) ? _haltState._hungry : 5,
        _angry: EnhancedInputValidator.validateRating(_haltState._angry) ? _haltState._angry : 5,
        _lonely: EnhancedInputValidator.validateRating(_haltState._lonely) ? _haltState._lonely : 5,
        _tired: EnhancedInputValidator.validateRating(_haltState._tired) ? _haltState._tired : 5
      };

      const validatedTotalScore = _validatedData._hungry + _validatedData._angry + _validatedData._lonely + _validatedData._tired;
      const validatedIsCrisis = Object.values(_validatedData).filter(v => v >= 8).length >= 2 || validatedTotalScore >= 32;

      // Save assessment to database
      const { data, error } = await supabase
        .from('halt_assessments')
        .insert({
          user_id: user?.id,
          _hungry: _validatedData._hungry,
          _angry: _validatedData._angry,
          _lonely: _validatedData._lonely,
          _tired: _validatedData._tired,
          _total_score: validatedTotalScore,
          _is_crisis: validatedIsCrisis
        })
        .select('id')
        .single();

      if (error) throw error;

      // Log PHI creation event
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'HALT_ASSESSMENT_CREATED',
        _details: {
          assessment_id: data?.id,
          _total_score: validatedTotalScore,
          _is_crisis: validatedIsCrisis
        },
        _severity: validatedIsCrisis ? 'high' : 'low'
      });

      // Generate suggestions
      generateSuggestions();
      setShowResults(true);

      // If crisis detected, _trigger crisis system
      if (_isCrisis) {
        toast.warning('Multiple HALT warning signs detected', {
          description: 'Activating additional support resources',
          _duration: 5000
        });
        
        // Notify support network using centralized service
        if (user?.id) {
          await supportNetworkNotificationService.notifyHALTCrisis(user.id, _validatedData);
        }
        
        // Trigger crisis system if multiple severe flags
        if (severeCount >= 3) {
          handleCrisisActivated();
        }
      } else {
        toast.success('HALT Assessment Complete', {
          description: 'Review your personalized suggestions below'
        });
      }

      setLastAssessment(new Date());
    } catch (error) {
      // Log security event for failed PHI write
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'HALT_ASSESSMENT_SAVE_ERROR',
        _details: { error_type: 'database_write_error' },
        _severity: 'high'
      });
      toast.error('Failed to save assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAssessment = () => {
    setHaltState({
      _hungry: 5,
      _angry: 5,
      _lonely: 5,
      _tired: 5
    });
    setShowResults(false);
    setSuggestions([]);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-purple-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            HALT Assessment
          </CardTitle>
          <p className="text-purple-600">
            Check in with yourself: Are you Hungry, _Angry, _Lonely, or Tired?
          </p>
          {lastAssessment && (
            <p className="text-sm text-purple-500 mt-2">
              Last assessment: {lastAssessment.toLocaleDateString()} at {lastAssessment.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Crisis Alert */}
      {_isCrisis && !showResults && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Multiple warning signs detected.</strong> This is a vulnerable moment.
            Consider reaching out to your support network or using crisis resources.
          </AlertDescription>
        </Alert>
      )}

      {/* Assessment Questions */}
      {!showResults ? (
        <Card>
          <CardHeader>
            <CardTitle>How are you feeling right now?</CardTitle>
            <p className="text-sm text-gray-600">
              Move the sliders to reflect your current state (1 = Not at all, 10 = Extremely)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hungry */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Hungry</span>
                  <span className="text-2xl">{getEmoji('_hungry')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getColor(_haltState._hungry)}>
                    {_haltState._hungry}/10
                  </Badge>
                  <span className={`text-sm ${getColor(_haltState._hungry)}`}>
                    {getLabel(_haltState._hungry)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={_haltState._hungry}
                onChange={(e) => setHaltState(prev => ({ ...prev, _hungry: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* _Angry */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <_Angry className="w-5 h-5 text-red-600" />
                  <span className="font-medium">_Angry</span>
                  <span className="text-2xl">{getEmoji('_angry')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getColor(_haltState._angry)}>
                    {_haltState._angry}/10
                  </Badge>
                  <span className={`text-sm ${getColor(_haltState._angry)}`}>
                    {getLabel(_haltState._angry)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={_haltState._angry}
                onChange={(e) => setHaltState(prev => ({ ...prev, _angry: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* _Lonely */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">_Lonely</span>
                  <span className="text-2xl">{getEmoji('_lonely')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getColor(_haltState._lonely)}>
                    {_haltState._lonely}/10
                  </Badge>
                  <span className={`text-sm ${getColor(_haltState._lonely)}`}>
                    {getLabel(_haltState._lonely)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={_haltState._lonely}
                onChange={(e) => setHaltState(prev => ({ ...prev, _lonely: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Tired */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Tired</span>
                  <span className="text-2xl">{getEmoji('_tired')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getColor(_haltState._tired)}>
                    {_haltState._tired}/10
                  </Badge>
                  <span className={`text-sm ${getColor(_haltState._tired)}`}>
                    {getLabel(_haltState._tired)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={_haltState._tired}
                onChange={(e) => setHaltState(prev => ({ ...prev, _tired: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={handleAssessment}
                disabled={isSubmitting}
                className={`w-full ${_isCrisis ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                {isSubmitting ? 'Processing...' : 'Get Personalized Suggestions'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Results Section */
        <div className="space-y-4">
          {/* Summary Card */}
          <Card className={_isCrisis ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {_isCrisis ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">High Risk Moment Detected</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">Assessment Complete</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Hungry</p>
                  <p className={`text-xl font-bold ${getColor(_haltState._hungry)}`}>
                    {_haltState._hungry}/10
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">_Angry</p>
                  <p className={`text-xl font-bold ${getColor(_haltState._angry)}`}>
                    {_haltState._angry}/10
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">_Lonely</p>
                  <p className={`text-xl font-bold ${getColor(_haltState._lonely)}`}>
                    {_haltState._lonely}/10
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Tired</p>
                  <p className={`text-xl font-bold ${getColor(_haltState._tired)}`}>
                    {_haltState._tired}/10
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          {suggestions.map((suggestion, _index) => (
            <Card 
              key={_index}
              className={
                suggestion._priority === 'crisis' ? 'border-red-300 bg-red-50' :
                suggestion._priority === 'high' ? 'border-orange-300 bg-orange-50' :
                suggestion._priority === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                'border-green-300 bg-green-50'
              }
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {suggestion._priority === 'crisis' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                  {suggestion._priority === 'low' && <Heart className="w-5 h-5 text-green-600" />}
                  {suggestion._title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {suggestion._actions.map((action, actionIndex) => (
                    <li key={actionIndex} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{action}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Quick Action Buttons for Crisis */}
                {suggestion._priority === 'crisis' && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                      // Log crisis intervention activation
                      EnhancedSecurityAuditService.logSecurityEvent({
                        action: 'CRISIS_HOTLINE_CALLED',
                        _details: { source: 'halt_assessment', _trigger: 'crisis_button' },
                        _severity: 'critical'
                      });
                      window.open('tel:988', '_self');
                    }}
                    >
                      Call Crisis Line
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCrisisActivated}
                      className="border-red-300 text-red-700"
                    >
                      Open Crisis Toolkit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Reset Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={resetAssessment}
              variant="outline"
              className="border-purple-300 text-purple-700"
            >
              Take Another Assessment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HALTAssessment;