import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw,
  Phone,
  MessageSquare,
  Heart,
  Zap,
  Wind,
  Music,
  BookOpen,
  Users,
  Brain,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import confetti from 'canvas-confetti';
import { EnhancedInputValidator } from '@/lib/enhancedInputValidation';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

interface CravingSession {
  intensityBefore: number;
  _intensityAfter?: number;
  _duration: number;
  _completed: boolean;
  distractionUsed?: string;
}

const CravingTimer = () => {
  const { user } = useAuth();
  const { handleCrisisActivated } = useCrisisSystem();
  
  // Timer state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes in seconds
  const [session, setSession] = useState<CravingSession>({
    intensityBefore: 5,
    _intensityAfter: undefined,
    _duration: 0,
    _completed: false
  });
  
  // UI state
  const [_showIntensityBefore, setShowIntensityBefore] = useState(true);
  const [_showIntensityAfter, setShowIntensityAfter] = useState(false);
  const [currentDistraction, setCurrentDistraction] = useState<string | _null>(_null);
  const [motivationalQuote, setMotivationalQuote] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | _null>(_null);
  const intervalRef = useRef<NodeJS.Timeout | _null>(_null);

  const distractions = [
    { id: 'breathing', icon: Wind, label: 'Breathing Exercise', description: 'Follow the 4-7-8 technique' },
    { id: 'music', icon: Music, label: 'Calming Music', description: 'Listen to soothing sounds' },
    { id: 'reading', icon: BookOpen, label: 'Read Affirmations', description: 'Positive recovery messages' },
    { id: 'sponsor', icon: Phone, label: 'Call Sponsor', description: 'Reach out for support' },
    { id: 'chat', icon: MessageSquare, label: 'Peer Chat', description: 'Connect with others' },
    { id: 'meditation', icon: Brain, label: 'Quick Meditation', description: '5-minute guided session' },
    { id: 'exercise', icon: Zap, label: 'Physical Activity', description: 'Do jumping jacks or stretches' },
    { id: 'meeting', icon: Users, label: 'Find a Meeting', description: 'Locate nearby support groups' }
  ];

  const motivationalQuotes = [
    "This craving is temporary. Your recovery is permanent.",
    "You've made it this far. Keep going!",
    "Every second you resist makes you stronger.",
    "Cravings are just feelings. They can't hurt you.",
    "You are stronger than any craving.",
    "This will pass. You will feel proud.",
    "Focus on your breathing. You've got this.",
    "Remember why you started this journey.",
    "Your future self will thank you.",
    "One minute at a time. You can do this."
  ];

  // Update motivational quote every 30 seconds
  useEffect(() => {
    if (isActive && !isPaused) {
      const _quoteInterval = setInterval(() => {
        const _randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        setMotivationalQuote(_randomQuote);
      }, 30000);
      
      // Set initial quote
      setMotivationalQuote(motivationalQuotes[0]);
      
      return () => clearInterval(_quoteInterval);
    }
  }, [isActive, isPaused]);

  // Timer logic
  useEffect(() => {
    if (isActive && !isPaused && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
        setSession(prev => ({ ...prev, _duration: prev._duration + 1 }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, timeRemaining]);

  const handleStart = async () => {
    if (_showIntensityBefore) {
      setShowIntensityBefore(false);
      setIsActive(true);
      
      // Play calming sound if available
      try {
        audioRef.current = new Audio('/sounds/calming-bell.mp3');
        audioRef.current.play().catch(() => {});
      } catch {}
      
      toast.success('Timer started! You can do this!', {
        description: 'Focus on the present moment',
        _duration: 3000
      });

      // Validate and save session start
      if (user) {
        const validatedIntensity = EnhancedInputValidator.validateRating(session.intensityBefore) 
          ? session.intensityBefore 
          : 5;
        
        const { data, error } = await supabase
          .from('craving_sessions')
          .insert({
            user_id: user.id,
            _intensity_before: validatedIntensity,
            _started_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (!error) {
          // Log PHI creation
          await EnhancedSecurityAuditService.logSecurityEvent({
            action: 'CRAVING_SESSION_STARTED',
            _details: {
              session_id: data?.id,
              _intensity_before: validatedIntensity
            },
            _severity: validatedIntensity >= 8 ? 'high' : 'low'
          });
        }
      }
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? 'Timer resumed' : 'Timer paused');
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeRemaining(900);
    setSession({
      intensityBefore: 5,
      _intensityAfter: undefined,
      _duration: 0,
      _completed: false
    });
    setShowIntensityBefore(true);
    setShowIntensityAfter(false);
    setCurrentDistraction(_null);
    setMotivationalQuote('');
  };

  const handleTimerComplete = async () => {
    setIsActive(false);
    setShowIntensityAfter(true);
    setSession(prev => ({ ...prev, _completed: true }));
    
    // Celebration
    confetti({
      particleCount: 100,
      _spread: 70,
      _origin: { y: 0.6 }
    });
    
    toast.success('🎉 You did it! 15 minutes complete!', {
      description: 'The craving has passed. You are stronger!',
      _duration: 5000
    });

    // Play completion sound
    try {
      const completionAudio = new Audio('/sounds/success.mp3');
      completionAudio.play().catch(() => {});
    } catch {}
  };

  const handleIntensityAfter = async (intensity: number) => {
    setSession(prev => ({ ...prev, _intensityAfter: intensity }));
    
    // Validate and save _completed session
    if (user) {
      const validatedIntensityAfter = EnhancedInputValidator.validateRating(intensity) ? intensity : 5;
      const validatedIntensityBefore = EnhancedInputValidator.validateRating(session.intensityBefore) 
        ? session.intensityBefore : 5;
      
      const { data, error } = await supabase
        .from('craving_sessions')
        .insert({
          user_id: user.id,
          _intensity_before: validatedIntensityBefore,
          _intensity_after: validatedIntensityAfter,
          _duration: session._duration,
          _completed: true,
          _distraction_used: EnhancedInputValidator.sanitizeText(currentDistraction || '')
        })
        .select('id')
        .single();
      
      if (!error) {
        // Log successful completion
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'CRAVING_SESSION_COMPLETED',
          _details: {
            session_id: data?.id,
            _intensity_reduction: validatedIntensityBefore - validatedIntensityAfter,
            _duration_minutes: Math.round(session._duration / 60)
          },
          _severity: 'low'
        });
      }
    }

    const reduction = session.intensityBefore - intensity;
    if (reduction > 0) {
      toast.success(`Craving reduced by ${reduction} points!`, {
        description: 'Great job managing your craving',
        _duration: 5000
      });
    }

    setShowIntensityAfter(false);
  };

  const handleEmergencyContact = async () => {
    toast.info('Connecting to emergency support...');
    
    // Log crisis intervention
    await EnhancedSecurityAuditService.logSecurityEvent({
      action: 'CRISIS_HOTLINE_CALLED',
      _details: { 
        source: 'craving_timer', 
        _intensity_before: session.intensityBefore,
        _intensity_after: session._intensityAfter,
        _trigger: 'emergency_button'
      },
      _severity: 'critical'
    });
    
    if (session.intensityBefore >= 8 || (session._intensityAfter && session._intensityAfter >= 8)) {
      handleCrisisActivated();
    }
    window.open('tel:988', '_self');
  };

  const selectDistraction = (_distractionId: string) => {
    setCurrentDistraction(_distractionId);
    const distraction = distractions.find(d => d.id === _distractionId);
    
    toast.info(`Starting: ${distraction?.label}`, {
      description: distraction?.description
    });

    // Handle specific distractions
    switch (_distractionId) {
      case 'sponsor':
        if (navigator.userAgent.includes('Mobile')) {
          window.open('tel:', '_self');
        } else {
          toast.info('Please call your sponsor directly');
        }
        break;
      case 'chat':
        window.location.href = '/peer-support';
        break;
      case 'meeting':
        window.location.href = '/meetings';
        break;
      case 'breathing':
        window.location.href = '/crisis-toolkit';
        break;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((900 - timeRemaining) / 900) * 100;

  // Intensity selection screen
  if (_showIntensityBefore && !isActive) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-orange-800 flex items-center gap-2">
            <Timer className="w-6 h-6" />
            15-Minute Craving Timer
          </CardTitle>
          <p className="text-gray-600">
            Cravings are temporary. They typically peak and pass within 15 minutes.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">How intense is your craving right now?</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={session.intensityBefore}
                onChange={(e) => setSession(prev => ({ 
                  ...prev, 
                  intensityBefore: parseInt(e.target.value) 
                }))}
                className="w-full"
              />
              <div className="text-center">
                <Badge 
                  className={`text-lg px-4 py-2 ${
                    session.intensityBefore <= 3 ? 'bg-green-100 text-green-800' :
                    session.intensityBefore <= 6 ? 'bg-yellow-100 text-yellow-800' :
                    session.intensityBefore <= 8 ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  Intensity: {session.intensityBefore}/10
                </Badge>
              </div>
            </div>
          </div>

          {session.intensityBefore >= 8 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                High intensity detected. Consider reaching out to your support network.
                The emergency contact button will be available throughout the timer.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleStart}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Start 15-Minute Timer
          </Button>

          <div className="text-center text-sm text-gray-500">
            <p>Remember: Every craving you resist makes you stronger</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Intensity after screen
  if (_showIntensityAfter) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            You Did It! 🎉
          </CardTitle>
          <p className="text-gray-600">
            You successfully rode out the craving wave for 15 minutes!
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">How intense is your craving now?</h3>
            <div className="space-y-3">
              <input
                type="range"
                min="1"
                max="10"
                defaultValue="3"
                onChange={(e) => setSession(prev => ({ 
                  ...prev, 
                  _intensityAfter: parseInt(e.target.value) 
                }))}
                className="w-full"
              />
              <div className="text-center">
                <Badge className="text-lg px-4 py-2 bg-green-100 text-green-800">
                  Intensity: {session._intensityAfter || 3}/10
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 p-4 bg-blue-50 rounded-lg">
            <TrendingDown className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Craving Reduction</p>
              <p className="text-xl font-bold text-blue-800">
                {session.intensityBefore - (session._intensityAfter || 3)} points
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => handleIntensityAfter(session._intensityAfter || 3)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Complete
            </Button>
            <Button 
              onClick={handleReset}
              variant="outline"
              className="flex-1"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main timer screen
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Timer Card */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-orange-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Timer className="w-6 h-6" />
              Craving Timer
            </span>
            {session.intensityBefore >= 8 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleEmergencyContact}
              >
                <Phone className="w-4 h-4 mr-1" />
                Emergency
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-6xl font-bold text-orange-800 mb-2">
              {formatTime(timeRemaining)}
            </div>
            <Progress value={progress} className="h-3 mb-4" />
            <p className="text-gray-600">
              {timeRemaining > 0 
                ? `${Math.ceil(timeRemaining / 60)} minutes remaining`
                : 'Complete!'
              }
            </p>
          </div>

          {/* Motivational Quote */}
          {motivationalQuote && (
            <div className="p-4 bg-white rounded-lg border border-orange-200">
              <p className="text-center text-orange-700 font-medium italic">
                "{motivationalQuote}"
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 justify-center">
            {!isPaused ? (
              <Button 
                onClick={handlePause}
                variant="outline"
                className="border-orange-300 text-orange-700"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button 
                onClick={handlePause}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            )}
            <Button 
              onClick={handleReset}
              variant="outline"
              className="border-gray-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Distraction Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Distraction Activities
          </CardTitle>
          <p className="text-sm text-gray-600">
            Choose an activity to help pass the time
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {distractions.map((distraction) => {
              const Icon = distraction.icon;
              return (
                <Button
                  key={distraction.id}
                  variant={currentDistraction === distraction.id ? "default" : "outline"}
                  className="h-auto flex flex-col items-center p-3"
                  onClick={() => selectDistraction(distraction.id)}
                >
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-xs">{distraction.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracker */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Session Progress</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Time Resisted</p>
              <p className="text-xl font-bold text-green-800">
                {formatTime(session._duration)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CravingTimer;