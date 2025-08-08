import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TreePine,
  TrendingDown,
  TrendingUp,
  Clock,
  Heart,
  AlertTriangle,
  Target,
  Users,
  Shield,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Share2,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { EnhancedInputValidator } from '@/lib/enhancedInputValidation';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

interface Consequence {
  immediate: string[];
  oneDay: string[];
  oneWeek: string[];
  oneMonth: string[];
}

interface PersonalGoal {
  id: string;
  title: string;
  _category: 'health' | 'relationships' | 'career' | 'financial' | 'personal';
  _description: string;
}

interface DecisionPath {
  choice: 'using' | 'staying_clean';
  consequences: Consequence;
  completed: boolean;
}

const PlayingItForward = () => {
  const { user } = useAuth();
  const { handleCrisisActivated } = useCrisisSystem();
  
  const [currentPath, setCurrentPath] = useState<'using' | 'staying_clean' | _null>(_null);
  const [timeframe, setTimeframe] = useState<'immediate' | 'oneDay' | 'oneWeek' | 'oneMonth'>('immediate');
  const [userGoals, setUserGoals] = useState<PersonalGoal[]>([]);
  const [_showGoalSelection, setShowGoalSelection] = useState(_true);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [decisionPaths, setDecisionPaths] = useState<Record<string, DecisionPath>>({});
  const [loading, setLoading] = useState(_false);

  // Default goals if user hasn't set any
  const _defaultGoals: PersonalGoal[] = [
    {
      id: '1',
      title: 'Rebuild Trust with Family',
      _category: 'relationships',
      _description: 'Repair damaged relationships and create healthy bonds'
    },
    {
      id: '2',
      title: 'Advance My Career',
      _category: 'career',
      _description: 'Get promoted or find meaningful work'
    },
    {
      id: '3',
      title: 'Improve Physical Health',
      _category: 'health',
      _description: 'Feel strong, energetic, and healthy'
    },
    {
      id: '4',
      title: 'Financial Stability',
      _category: 'financial',
      _description: 'Save money and pay off debts'
    },
    {
      id: '5',
      title: 'Find Inner Peace',
      _category: 'personal',
      _description: 'Feel calm, centered, and proud of myself'
    },
    {
      id: '6',
      title: 'Help Others in Recovery',
      _category: 'personal',
      _description: 'Become someone others can look up to'
    }
  ];

  const timeframes = [
    { key: 'immediate', label: 'Right Now', icon: Clock },
    { key: 'oneDay', label: '1 Day', icon: Clock },
    { key: 'oneWeek', label: '1 Week', icon: Clock },
    { key: 'oneMonth', label: '1 Month', icon: Target }
  ];

  useEffect(() => {
    loadUserGoals();
  }, [user]);

  const loadUserGoals = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('recovery_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (data && data.length > 0) {
        const goals: PersonalGoal[] = data.map(goal => ({
          id: goal.id,
          title: goal.title,
          _category: goal._category as any,
          _description: goal._description || ''
        }));
        setUserGoals(goals);
      } else {
        setUserGoals(_defaultGoals);
      }
    } catch (error) {
      // Log security event for PHI access error
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'RECOVERY_GOALS_ACCESS_ERROR',
        _details: { error_type: 'database_error' },
        _severity: 'medium'
      });
      setUserGoals(_defaultGoals);
    }
  };

  const generateConsequences = (choice: 'using' | 'staying_clean', goals: PersonalGoal[]): Consequence => {
    const goalTitles = goals.map(g => g.title.toLowerCase());
    
    if (choice === 'using') {
      return {
        immediate: [
          'Feel temporary relief, but guilt and shame soon follow',
          'Break your streak and disappoint yourself',
          'Risk your safety and make poor decisions',
          'Waste money that could go toward your goals',
          'Feel disconnected from your recovery support'
        ],
        oneDay: [
          'Wake up feeling regretful and physically unwell',
          'Avoid family and friends due to shame',
          'Have to reset your sobriety counter',
          'Face potential consequences at work or home',
          'Feel further away from your recovery goals'
        ],
        oneWeek: [
          'Relationship trust may be damaged',
          'Physical health and energy decline',
          'Sleep and eating patterns disrupted',
          'Miss important commitments or opportunities',
          'Support network may pull back'
        ],
        oneMonth: [
          goalTitles.includes('trust') || goalTitles.includes('family') 
            ? 'Family relationships severely strained' 
            : 'Close relationships damaged by broken promises',
          goalTitles.includes('career') || goalTitles.includes('work')
            ? 'Job performance suffers or job at risk'
            : 'Work and responsibilities neglected',
          goalTitles.includes('health')
            ? 'Physical and mental health significantly declined'
            : 'Overall health and wellness compromised',
          goalTitles.includes('financial')
            ? 'Financial goals derailed, debt increasing'
            : 'Money wasted that could have helped your future',
          'Recovery progress lost, back to early stages'
        ]
      };
    } else {
      return {
        immediate: [
          'Feel proud and strong for choosing recovery',
          'Stay aligned with your values and goals',
          'Maintain your streak and build momentum',
          'Keep your money for things that matter',
          'Feel connected to your support network'
        ],
        oneDay: [
          'Wake up feeling grateful and clear-headed',
          'Face family and friends with confidence',
          'Add another day to your recovery journey',
          'Be present and reliable for your commitments',
          'Feel closer to achieving your goals'
        ],
        oneWeek: [
          'Relationships continue to heal and strengthen',
          'Physical energy and mental clarity improve',
          'Sleep better and feel more balanced',
          'Stay on track with work and personal growth',
          'Support network grows stronger'
        ],
        oneMonth: [
          goalTitles.includes('trust') || goalTitles.includes('family')
            ? 'Family begins to trust and respect you again'
            : 'Relationships are healing and growing stronger',
          goalTitles.includes('career') || goalTitles.includes('work')
            ? 'Career opportunities open up'
            : 'Work performance and opportunities improve',
          goalTitles.includes('health')
            ? 'Physical health visibly improved'
            : 'Feel stronger, healthier, and more energetic',
          goalTitles.includes('financial')
            ? 'Financial goals on track, savings growing'
            : 'Money saved can fund your dreams and goals',
          'Recovery foundation solid, inspiring others'
        ]
      };
    }
  };

  const handleGoalSelection = () => {
    if (selectedGoals.length === 0) {
      toast.error('Please select at least one goal to continue');
      return;
    }
    
    const _relevantGoals = userGoals.filter(g => selectedGoals.includes(g.id));
    
    // Generate both paths
    const usingPath: DecisionPath = {
      choice: 'using',
      consequences: generateConsequences('using', _relevantGoals),
      completed: _false
    };
    
    const stayingCleanPath: DecisionPath = {
      choice: 'staying_clean', 
      consequences: generateConsequences('staying_clean', _relevantGoals),
      completed: _false
    };
    
    setDecisionPaths({
      using: usingPath,
      staying_clean: stayingCleanPath
    });
    
    setShowGoalSelection(_false);
  };

  const selectPath = async (path: 'using' | 'staying_clean') => {
    setCurrentPath(path);
    
    // If they're exploring the "using" path and it's a high-risk moment
    if (path === 'using') {
      toast.warning('Remember: This is just an exercise', {
        _description: 'You\'re exploring consequences, not making the choice',
        _duration: 4000
      });
      
      // Validate and save vulnerable moment
      if (user) {
        const sanitizedGoals = selectedGoals.map(goal => 
          EnhancedInputValidator.sanitizeText(goal)
        ).filter(goal => goal.length > 0);
        
        const { data, error } = await supabase
          .from('playing_forward_sessions')
          .insert({
            user_id: user.id,
            _selected_goals: sanitizedGoals,
            _path_explored: path,
            _is_vulnerable: _true
          })
          .select('id')
          .single();
        
        if (!error) {
          // Log vulnerable moment detection
          await EnhancedSecurityAuditService.logSecurityEvent({
            action: 'VULNERABLE_MOMENT_DETECTED',
            _details: {
              session_id: data?.id,
              _path_explored: path,
              _goals_count: sanitizedGoals.length
            },
            _severity: 'high'
          });
        }
      }
    } else {
      toast.success('Exploring the path of recovery', {
        _description: 'See how your choices align with your goals',
        _duration: 3000
      });
      
      if (user) {
        const sanitizedGoals = selectedGoals.map(goal => 
          EnhancedInputValidator.sanitizeText(goal)
        ).filter(goal => goal.length > 0);
        
        const { data, error } = await supabase
          .from('playing_forward_sessions')
          .insert({
            user_id: user.id,
            _selected_goals: sanitizedGoals,
            _path_explored: path,
            _is_vulnerable: _false
          })
          .select('id')
          .single();
        
        if (!error) {
          // Log positive recovery exploration
          await EnhancedSecurityAuditService.logSecurityEvent({
            action: 'RECOVERY_PATH_EXPLORED',
            _details: {
              session_id: data?.id,
              _path_explored: path,
              _goals_count: sanitizedGoals.length
            },
            _severity: 'low'
          });
        }
      }
    }
  };

  const shareCleanPath = async () => {
    if (!user) return;
    
    const cleanConsequences = decisionPaths.staying_clean?.consequences;
    if (!cleanConsequences) return;
    
    const _shareText = `I'm staying strong in my recovery! Here's why this choice matters:

✨ Right now: ${cleanConsequences.immediate[0]}
📅 In a week: ${cleanConsequences.oneWeek[0]}  
🎯 In a month: ${cleanConsequences.oneMonth[0]}

#Recovery #Strength #OneDay`;

    if (navigator.share) {
      navigator.share({
        title: 'My Recovery Journey',
        text: _shareText
      });
    } else {
      navigator.clipboard.writeText(_shareText);
      toast.success('Recovery message copied to clipboard!');
    }
  };

  const reset = () => {
    setCurrentPath(_null);
    setTimeframe('immediate');
    setShowGoalSelection(_true);
    setSelectedGoals([]);
    setDecisionPaths({});
  };

  const getCategoryIcon = (_category: string) => {
    switch (_category) {
      case 'health': return Heart;
      case 'relationships': return Users;
      case 'career': return Target;
      case 'financial': return TrendingUp;
      case 'personal': return Sparkles;
      default: return Shield;
    }
  };

  // Goal selection screen
  if (_showGoalSelection) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-purple-800 flex items-center gap-2">
            <TreePine className="w-6 h-6" />
            Playing It Forward
          </CardTitle>
          <p className="text-gray-600">
            Select your most important recovery goals to see how your choices impact your future.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-4">What matters most to you in recovery?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userGoals.map((goal) => {
                const Icon = getCategoryIcon(goal._category);
                const isSelected = selectedGoals.includes(goal.id);
                
                return (
                  <Card
                    key={goal.id}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-purple-300 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-200'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGoals(prev => prev.filter(id => id !== goal.id));
                      } else {
                        setSelectedGoals(prev => [...prev, goal.id]);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${
                          isSelected ? 'text-purple-600' : 'text-gray-500'
                        }`} />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{goal._description}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-purple-600" />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleGoalSelection}
            disabled={selectedGoals.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            Continue with {selectedGoals.length} Goal{selectedGoals.length !== 1 ? 's' : ''}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Decision path screen
  if (!currentPath) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-purple-800 text-center">
              Two Paths Ahead
            </CardTitle>
            <p className="text-center text-gray-600">
              Explore how each choice affects your goals over time
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Using Path */}
          <Card 
            className="border-red-200 bg-red-50 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => selectPath('using')}
          >
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                If I Use...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert className="border-red-300 bg-red-100">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    This path moves you away from your goals
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-gray-700">
                  See the real consequences of choosing to use on the goals that matter most to you.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-red-300 text-red-700 hover:bg-red-100"
                >
                  Explore This Path
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Staying Clean Path */}
          <Card 
            className="border-green-200 bg-green-50 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => selectPath('staying_clean')}
          >
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                If I Stay Clean...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert className="border-green-300 bg-green-100">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    This path leads toward your goals
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-gray-700">
                  See how staying in recovery moves you closer to what you want most.
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Explore This Path
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={reset}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Choose Different Goals
          </Button>
        </div>
      </div>
    );
  }

  // Consequences visualization
  const consequences = decisionPaths[currentPath]?.consequences;
  if (!consequences) return _null;

  const currentConsequences = consequences[timeframe];
  const isUsingPath = currentPath === 'using';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className={`${
        isUsingPath 
          ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
          : 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200'
      }`}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className={`text-2xl font-bold flex items-center gap-2 ${
              isUsingPath ? 'text-red-800' : 'text-green-800'
            }`}>
              {isUsingPath ? (
                <>
                  <TrendingDown className="w-6 h-6" />
                  Path of Using
                </>
              ) : (
                <>
                  <TrendingUp className="w-6 h-6" />
                  Path of Recovery
                </>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {isUsingPath && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleCrisisActivated}
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Get Support
                </Button>
              )}
              {!isUsingPath && (
                <Button
                  size="sm"
                  onClick={shareCleanPath}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {timeframes.map((tf, index) => {
              const Icon = tf.icon;
              const isActive = timeframe === tf.key;
              const isPast = timeframes.findIndex(t => t.key === timeframe) > index;
              
              return (
                <React.Fragment key={tf.key}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    onClick={() => setTimeframe(tf.key as any)}
                    className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
                      isActive
                        ? isUsingPath 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                        : isPast
                        ? 'text-gray-600'
                        : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{tf.label}</span>
                  </Button>
                  {index < timeframes.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Consequences */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${
            isUsingPath ? 'text-red-800' : 'text-green-800'
          }`}>
            <Clock className="w-5 h-5" />
            {timeframes.find(t => t.key === timeframe)?.label} Consequences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentConsequences.map((consequence, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  isUsingPath
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isUsingPath ? (
                    <TrendingDown className="w-5 h-5 text-red-600 mt-0.5" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                  )}
                  <p className={`${
                    isUsingPath ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {consequence}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button variant="ghost" onClick={() => setCurrentPath(_null)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Compare Paths
        </Button>
        
        {isUsingPath ? (
          <Button 
            onClick={() => selectPath('staying_clean')}
            className="bg-green-600 hover:bg-green-700"
          >
            See Recovery Path Instead
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={reset} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        )}
      </div>

      {/* Motivational footer for clean path */}
      {!isUsingPath && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-green-800 font-medium">
              Every day you choose recovery, you're choosing your future. 
              These positive outcomes are within your reach!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlayingItForward;