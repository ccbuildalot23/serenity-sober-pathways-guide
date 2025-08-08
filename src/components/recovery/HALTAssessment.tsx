import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UtensilsCrossed, 
  Angry, 
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
  hungry: number;
  angry: number;
  lonely: number;
  tired: number;
}

interface Suggestion {
  type: 'hungry' | 'angry' | 'lonely' | 'tired' | 'multiple';
  title: string;
  actions: string[];
  priority: 'low' | 'medium' | 'high' | 'crisis';
}

const HALTAssessment = () => {
  const { user } = useAuth();
  const { handleCrisisActivated } = useCrisisSystem();
  const [haltState, setHaltState] = useState<HALTState>({
    hungry: 5,
    angry: 5,
    lonely: 5,
    tired: 5
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAssessment, setLastAssessment] = useState<Date | null>(null);

  // Crisis detection: Multiple severe flags (8+ on scale)
  const severeCount = Object.values(haltState).filter(v => v >= 8).length;
  const totalScore = Object.values(haltState).reduce((a, b) => a + b, 0);
  const isCrisis = severeCount >= 2 || totalScore >= 32;

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
        details: { error_type: 'database_error' },
        severity: 'medium'
      });
    }
  };

  const getEmoji = (type: keyof HALTState) => {
    const emojis = {
      hungry: ['🍽️', '🥗', '🍎', '🥪', '🍲'],
      angry: ['😌', '😔', '😤', '😠', '🤬'],
      lonely: ['👥', '🤝', '😊', '😐', '😢'],
      tired: ['⚡', '💪', '😴', '🥱', '😫']
    };
    const index = Math.floor((haltState[type] - 1) / 2);
    return emojis[type][Math.min(index, 4)];
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
    const newSuggestions: Suggestion[] = [];

    // Hungry suggestions
    if (haltState.hungry >= 7) {
      newSuggestions.push({
        type: 'hungry',
        title: 'Address Your Hunger',
        actions: [
          'Eat a balanced meal with protein and vegetables',
          'Have a healthy snack like fruit or nuts',
          'Drink water - sometimes thirst feels like hunger',
          'Set regular meal reminders to prevent extreme hunger'
        ],
        priority: haltState.hungry >= 8 ? 'high' : 'medium'
      });
    }

    // Angry suggestions
    if (haltState.angry >= 7) {
      newSuggestions.push({
        type: 'angry',
        title: 'Process Your Anger',
        actions: [
          'Try the 4-7-8 breathing technique',
          'Write in a journal about what\'s bothering you',
          'Go for a walk or do physical exercise',
          'Call your sponsor or a trusted friend',
          'Use the CBT thought record to challenge angry thoughts'
        ],
        priority: haltState.angry >= 8 ? 'high' : 'medium'
      });
    }

    // Lonely suggestions
    if (haltState.lonely >= 7) {
      newSuggestions.push({
        type: 'lonely',
        title: 'Connect with Others',
        actions: [
          'Reach out to someone in your support network',
          'Attend an online or in-person meeting',
          'Start a peer support chat session',
          'Send a message to check in on someone else',
          'Join a recovery community forum'
        ],
        priority: haltState.lonely >= 8 ? 'high' : 'medium'
      });
    }

    // Tired suggestions
    if (haltState.tired >= 7) {
      newSuggestions.push({
        type: 'tired',
        title: 'Rest and Recharge',
        actions: [
          'Take a 20-minute power nap',
          'Go to bed 30 minutes earlier tonight',
          'Practice a relaxation meditation',
          'Reduce caffeine intake after 2pm',
          'Create a calming bedtime routine'
        ],
        priority: haltState.tired >= 8 ? 'high' : 'medium'
      });
    }

    // Multiple high scores - crisis intervention
    if (isCrisis) {
      newSuggestions.unshift({
        type: 'multiple',
        title: '⚠️ Multiple Warning Signs Detected',
        actions: [
          'This is a high-risk moment - be extra gentle with yourself',
          'Contact your sponsor or support person immediately',
          'Consider calling the crisis hotline: 988',
          'Use the crisis toolkit for immediate support',
          'Remember: This feeling will pass'
        ],
        priority: 'crisis'
      });
    }

    // If everything is moderate or low
    if (newSuggestions.length === 0) {
      newSuggestions.push({
        type: 'multiple',
        title: 'You\'re Doing Well!',
        actions: [
          'Keep maintaining your self-care routine',
          'Continue regular meals and sleep schedule',
          'Stay connected with your support network',
          'Practice gratitude for your progress'
        ],
        priority: 'low'
      });
    }

    setSuggestions(newSuggestions);
  };

  const handleAssessment = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate input data
      const validatedData = {
        hungry: EnhancedInputValidator.validateRating(haltState.hungry) ? haltState.hungry : 5,
        angry: EnhancedInputValidator.validateRating(haltState.angry) ? haltState.angry : 5,
        lonely: EnhancedInputValidator.validateRating(haltState.lonely) ? haltState.lonely : 5,
        tired: EnhancedInputValidator.validateRating(haltState.tired) ? haltState.tired : 5
      };

      const validatedTotalScore = validatedData.hungry + validatedData.angry + validatedData.lonely + validatedData.tired;
      const validatedIsCrisis = Object.values(validatedData).filter(v => v >= 8).length >= 2 || validatedTotalScore >= 32;

      // Save assessment to database
      const { data, error } = await supabase
        .from('halt_assessments')
        .insert({
          user_id: user?.id,
          hungry: validatedData.hungry,
          angry: validatedData.angry,
          lonely: validatedData.lonely,
          tired: validatedData.tired,
          total_score: validatedTotalScore,
          is_crisis: validatedIsCrisis
        })
        .select('id')
        .single();

      if (error) throw error;

      // Log PHI creation event
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'HALT_ASSESSMENT_CREATED',
        details: {
          assessment_id: data?.id,
          total_score: validatedTotalScore,
          is_crisis: validatedIsCrisis
        },
        severity: validatedIsCrisis ? 'high' : 'low'
      });

      // Generate suggestions
      generateSuggestions();
      setShowResults(true);

      // If crisis detected, trigger crisis system
      if (isCrisis) {
        toast.warning('Multiple HALT warning signs detected', {
          description: 'Activating additional support resources',
          duration: 5000
        });
        
        // Notify support network using centralized service
        if (user?.id) {
          await supportNetworkNotificationService.notifyHALTCrisis(user.id, validatedData);
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
        details: { error_type: 'database_write_error' },
        severity: 'high'
      });
      toast.error('Failed to save assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAssessment = () => {
    setHaltState({
      hungry: 5,
      angry: 5,
      lonely: 5,
      tired: 5
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
            Check in with yourself: Are you Hungry, Angry, Lonely, or Tired?
          </p>
          {lastAssessment && (
            <p className="text-sm text-purple-500 mt-2">
              Last assessment: {lastAssessment.toLocaleDateString()} at {lastAssessment.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Crisis Alert */}
      {isCrisis && !showResults && (
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
                  <span className="text-2xl">{getEmoji('hungry')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getColor(haltState.hungry)}>
                    {haltState.hungry}/10
                  </Badge>
                  <span className={`text-sm ${getColor(haltState.hungry)}`}>
                    {getLabel(haltState.hungry)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={haltState.hungry}
                onChange={(e) => setHaltState(prev => ({ ...prev, hungry: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Angry */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Angry className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Angry</span>
                  <span className="text-2xl">{getEmoji('angry')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getColor(haltState.angry)}>
                    {haltState.angry}/10
                  </Badge>
                  <span className={`text-sm ${getColor(haltState.angry)}`}>
                    {getLabel(haltState.angry)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={haltState.angry}
                onChange={(e) => setHaltState(prev => ({ ...prev, angry: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Lonely */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Lonely</span>
                  <span className="text-2xl">{getEmoji('lonely')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getColor(haltState.lonely)}>
                    {haltState.lonely}/10
                  </Badge>
                  <span className={`text-sm ${getColor(haltState.lonely)}`}>
                    {getLabel(haltState.lonely)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={haltState.lonely}
                onChange={(e) => setHaltState(prev => ({ ...prev, lonely: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Tired */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Tired</span>
                  <span className="text-2xl">{getEmoji('tired')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getColor(haltState.tired)}>
                    {haltState.tired}/10
                  </Badge>
                  <span className={`text-sm ${getColor(haltState.tired)}`}>
                    {getLabel(haltState.tired)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={haltState.tired}
                onChange={(e) => setHaltState(prev => ({ ...prev, tired: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={handleAssessment}
                disabled={isSubmitting}
                className={`w-full ${isCrisis ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
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
          <Card className={isCrisis ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isCrisis ? (
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
                  <p className={`text-xl font-bold ${getColor(haltState.hungry)}`}>
                    {haltState.hungry}/10
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Angry</p>
                  <p className={`text-xl font-bold ${getColor(haltState.angry)}`}>
                    {haltState.angry}/10
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Lonely</p>
                  <p className={`text-xl font-bold ${getColor(haltState.lonely)}`}>
                    {haltState.lonely}/10
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Tired</p>
                  <p className={`text-xl font-bold ${getColor(haltState.tired)}`}>
                    {haltState.tired}/10
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          {suggestions.map((suggestion, index) => (
            <Card 
              key={index}
              className={
                suggestion.priority === 'crisis' ? 'border-red-300 bg-red-50' :
                suggestion.priority === 'high' ? 'border-orange-300 bg-orange-50' :
                suggestion.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                'border-green-300 bg-green-50'
              }
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {suggestion.priority === 'crisis' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                  {suggestion.priority === 'low' && <Heart className="w-5 h-5 text-green-600" />}
                  {suggestion.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {suggestion.actions.map((action, actionIndex) => (
                    <li key={actionIndex} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{action}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Quick Action Buttons for Crisis */}
                {suggestion.priority === 'crisis' && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                      // Log crisis intervention activation
                      EnhancedSecurityAuditService.logSecurityEvent({
                        action: 'CRISIS_HOTLINE_CALLED',
                        details: { source: 'halt_assessment', trigger: 'crisis_button' },
                        severity: 'critical'
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