import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Calendar, Heart, Brain, TrendingUp, CheckCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CheckInCelebration from './CheckInCelebration';
import { PredictiveCrisisAlert } from './crisis/PredictiveCrisisAlert';
import { UltraSecureCrisisDataService } from '@/services/ultraSecureCrisisDataService';
import { subscribeToCrisisEvents, unsubscribeFromChannel } from '@/services/realtimeService';
import { secureServerLogEvent } from '@/services/secureServerAuditLogService';
import { analyzePatterns } from '@/utils/patternAnalysis';
import { useNavigate } from 'react-router-dom';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';

interface DailyCheckInProps {
  // Add any props here
}

interface CheckinResponses {
  mood: number | null;
  energy: number | null;
  hope: number | null;
  sobriety_confidence: number | null;
  recovery_importance: number | null;
  recovery_strength: number | null;
  support_needed: boolean;
  phq2_q1: number | null;
  phq2_q2: number | null;
  gad2_q1: number | null;
  gad2_q2: number | null;
}

const DailyCheckIn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('mood');
  const [showCelebration, setShowCelebration] = useState(false);
  
  const [today, setToday] = useState('');
  const [responses, setResponses] = useState<CheckinResponses>({
    mood: null,
    energy: null,
    hope: null,
    sobriety_confidence: null,
    recovery_importance: null,
    recovery_strength: null,
    support_needed: false,
    phq2_q1: null,
    phq2_q2: null,
    gad2_q1: null,
    gad2_q2: null,
  });
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<any>(null);

  // Pattern analysis
  const { data: crisisPatterns } = useQuery({
    queryKey: ['crisis-patterns', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const resolutions = await UltraSecureCrisisDataService.loadCrisisResolutions(user.id);
      const checkIns = await UltraSecureCrisisDataService.loadCheckInResponses(user.id);
      
      return analyzePatterns(resolutions, checkIns);
    },
    enabled: !!user?.id
  });

  // Real-time subscription to crisis events
  useRealtimeUpdates({
    onCrisisEvent: (payload) => {
      toast.warning("Crisis pattern detected", {
        description: "Your support network has been notified",
        action: {
          label: "View Tools",
          onClick: () => navigate('/crisis-toolkit')
        }
      });
    }
  });

  // Log pattern detection for audit
  useEffect(() => {
    if (crisisPatterns && crisisPatterns.riskScore > 0.5) {
      secureServerLogEvent({
        action: 'PATTERN_DETECTION',
        details: {
          risk_level: crisisPatterns.riskScore,
          vulnerable_hours: crisisPatterns.vulnerableHours,
          precursor_count: crisisPatterns.crisisPrecursors.length,
          timestamp: new Date().toISOString()
        },
        userId: user?.id
      });
    }
  }, [crisisPatterns, user?.id]);

  // Handler for crisis detection
  const handleCrisisDetected = () => {
    console.log('Crisis detected! Activating crisis mode...');
    toast.error("Crisis mode activated", {
      description: "Your support network has been notified",
      duration: 10000,
      action: {
        label: "Crisis Tools",
        onClick: () => navigate('/crisis-toolkit')
      }
    });
    navigate('/crisis-toolkit');
  };

  // Handler for showing interventions
  const handleShowInterventions = (stats: Record<string, any>) => {
    console.log('Showing effective interventions:', stats);
    
    // Find most effective interventions
    const sortedInterventions = Object.entries(stats)
      .sort(([,a], [,b]) => (b as any).averageEffectiveness - (a as any).averageEffectiveness)
      .slice(0, 3);
    
    if (sortedInterventions.length > 0) {
      const interventionsList = sortedInterventions
        .map(([name, data]) => `${name} (${((data as any).averageEffectiveness * 10).toFixed(1)}/10)`)
        .join(', ');
      
      toast.success("Your most effective strategies", {
        description: `Based on your history: ${interventionsList}`,
        duration: 8000,
        action: {
          label: "Use Now",
          onClick: () => navigate('/crisis-toolkit')
        }
      });
    } else {
      toast.info("Building your intervention history", {
        description: "Complete a few crisis resolutions to see personalized recommendations",
        action: {
          label: "Learn More",
          onClick: () => navigate('/crisis-toolkit')
        }
      });
    }
  };

  // ... keep existing code (useEffect hooks for date and loading existing checkin)

  useEffect(() => {
    const todayDate = new Date().toISOString().slice(0, 10);
    setToday(todayDate);
    loadExistingCheckin(todayDate);
  }, [user]);

  const loadExistingCheckin = async (checkinDate: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', checkinDate)
        .single();

      if (error) throw error;

      if (data) {
        setExistingCheckin(data);
        setResponses({
          mood: data.mood_rating,
          energy: data.energy_rating,
          hope: data.hope_rating,
          sobriety_confidence: data.sobriety_confidence,
          recovery_importance: data.recovery_importance,
          recovery_strength: data.recovery_strength ? parseFloat(data.recovery_strength) : null,
          support_needed: typeof data.support_needed === 'boolean' ? data.support_needed : data.support_needed === 'true',
          phq2_q1: data.phq2_q1_response,
          phq2_q2: data.phq2_q2_response,
          gad2_q1: data.gad2_q1_response,
          gad2_q2: data.gad2_q2_response,
        });
        
        if (data.completed_sections && typeof data.completed_sections === 'string') {
          const parsed = JSON.parse(data.completed_sections);
          if (Array.isArray(parsed)) {
            setCompletedSections(new Set(parsed.map(item => String(item))));
          }
        } else if (Array.isArray(data.completed_sections)) {
          setCompletedSections(new Set(data.completed_sections.map(item => String(item))));
        }
      }
    } catch (error) {
      console.error('Error loading existing check-in:', error);
    }
  };

  // ... keep existing code (all the handler functions for mood, energy, etc.)

  const handleMoodChange = (value: number) => {
    setResponses(prev => ({ ...prev, mood: value }));
    markSectionComplete('mood');
  };

  const handleEnergyChange = (value: number) => {
    setResponses(prev => ({ ...prev, energy: value }));
    markSectionComplete('wellness');
  };

  const handleHopeChange = (value: number) => {
    setResponses(prev => ({ ...prev, hope: value }));
    markSectionComplete('wellness');
  };

  const handleSobrietyConfidenceChange = (value: number) => {
    setResponses(prev => ({ ...prev, sobriety_confidence: value }));
    markSectionComplete('wellness');
  };

  const handleRecoveryImportanceChange = (value: number) => {
    setResponses(prev => ({ ...prev, recovery_importance: value }));
    markSectionComplete('wellness');
  };

  const handleRecoveryStrengthChange = (value: number) => {
    setResponses(prev => ({ ...prev, recovery_strength: value }));
    markSectionComplete('wellness');
  };

  const handleSupportNeededChange = (checked: boolean) => {
    setResponses(prev => ({ ...prev, support_needed: checked }));
    markSectionComplete('wellness');
  };

  const handlePhq2Q1Change = (value: number) => {
    setResponses(prev => ({ ...prev, phq2_q1: value }));
    markSectionComplete('assessments');
  };

  const handlePhq2Q2Change = (value: number) => {
    setResponses(prev => ({ ...prev, phq2_q2: value }));
    markSectionComplete('assessments');
  };

  const handleGad2Q1Change = (value: number) => {
    setResponses(prev => ({ ...prev, gad2_q1: value }));
    markSectionComplete('assessments');
  };

  const handleGad2Q2Change = (value: number) => {
    setResponses(prev => ({ ...prev, gad2_q2: value }));
    markSectionComplete('assessments');
  };

  const markSectionComplete = (section: string) => {
    setCompletedSections(prev => {
      const newSet = new Set(prev);
      newSet.add(section);
      return newSet;
    });
  };

  const canComplete = () => {
    return completedSections.size === 3;
  };

  const handleComplete = async () => {
    if (!user || !canComplete()) return;

    try {
      setIsSubmitting(true);
      
      const checkinData = {
        user_id: user.id,
        checkin_date: today,
        mood_rating: responses.mood,
        energy_rating: responses.energy,
        hope_rating: responses.hope,
        sobriety_confidence: responses.sobriety_confidence,
        recovery_importance: responses.recovery_importance,
        recovery_strength: responses.recovery_strength?.toString() || null,
        support_needed: responses.support_needed?.toString() || null,
        phq2_q1_response: responses.phq2_q1,
        phq2_q2_response: responses.phq2_q2,
        phq2_score: (responses.phq2_q1 || 0) + (responses.phq2_q2 || 0),
        gad2_q1_response: responses.gad2_q1,
        gad2_q2_response: responses.gad2_q2,
        gad2_score: (responses.gad2_q1 || 0) + (responses.gad2_q2 || 0),
        completed_sections: JSON.stringify(Array.from(completedSections)),
        is_complete: true
      };

      const { error } = await supabase
        .from('daily_checkins')
        .upsert(checkinData);

      if (error) throw error;

      // Show celebration instead of just toast
      setShowCelebration(true);
      setCompletedSections(new Set(['mood', 'wellness', 'assessments']));
      
    } catch (error) {
      console.error('Error completing check-in:', error);
      toast.error('Failed to complete check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartMindfulness = () => {
    setShowCelebration(false);
    // Navigate to mindfulness or trigger mindfulness modal
    toast.success('Opening mindfulness exercises...');
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
  };

  // ... keep existing code (render functions for mood, wellness, assessments sections)

  const renderMoodSection = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">How are you feeling today?</h3>
      <p className="text-gray-600">Tap the slider to rate your overall mood.</p>
      <div className="flex items-center justify-between">
        <span>Not Great</span>
        <span>Great!</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={responses.mood || 5}
        onChange={(e) => handleMoodChange(parseInt(e.target.value))}
        className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
      />
      {responses.mood && (
        <div className="text-center">
          Your mood today: <Badge variant="secondary">{responses.mood}/10</Badge>
        </div>
      )}
    </div>
  );

  const renderWellnessSection = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Wellness Check</h3>
      <p className="text-gray-600">Rate these aspects of your well-being.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700">Energy Level</label>
        <input
          type="range"
          min="1"
          max="10"
          value={responses.energy || 5}
          onChange={(e) => handleEnergyChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {responses.energy && <div className="text-sm text-gray-500">Energy: {responses.energy}/10</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Level of Hope</label>
        <input
          type="range"
          min="1"
          max="10"
          value={responses.hope || 5}
          onChange={(e) => handleHopeChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {responses.hope && <div className="text-sm text-gray-500">Hope: {responses.hope}/10</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Sobriety Confidence</label>
        <input
          type="range"
          min="1"
          max="10"
          value={responses.sobriety_confidence || 5}
          onChange={(e) => handleSobrietyConfidenceChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {responses.sobriety_confidence && <div className="text-sm text-gray-500">Sobriety Confidence: {responses.sobriety_confidence}/10</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Importance of Recovery</label>
        <input
          type="range"
          min="1"
          max="10"
          value={responses.recovery_importance || 5}
          onChange={(e) => handleRecoveryImportanceChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {responses.recovery_importance && <div className="text-sm text-gray-500">Recovery Importance: {responses.recovery_importance}/10</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Personal Recovery Strength</label>
        <input
          type="range"
          min="1"
          max="10"
          value={responses.recovery_strength || 5}
          onChange={(e) => handleRecoveryStrengthChange(parseInt(e.target.value))}
          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
        />
        {responses.recovery_strength && <div className="text-sm text-gray-500">Recovery Strength: {responses.recovery_strength}/10</div>}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="supportNeeded"
          checked={responses.support_needed || false}
          onChange={(e) => handleSupportNeededChange(e.target.checked)}
          className="h-5 w-5 rounded text-blue-500 focus:ring-blue-500"
        />
        <label htmlFor="supportNeeded" className="text-sm font-medium text-gray-700">
          I need extra support today
        </label>
      </div>
    </div>
  );

  const renderAssessmentsSection = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Quick Assessments</h3>
      <p className="text-gray-600">Answer these quick questions to track your mental well-being.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Over the past 2 weeks, how often have you been bothered by little interest or pleasure in doing things?
        </label>
        <select
          value={responses.phq2_q1 || 0}
          onChange={(e) => handlePhq2Q1Change(parseInt(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value={0}>Not at all</option>
          <option value={1}>Several days</option>
          <option value={2}>More than half the days</option>
          <option value={3}>Nearly every day</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Over the past 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?
        </label>
        <select
          value={responses.phq2_q2 || 0}
          onChange={(e) => handlePhq2Q2Change(parseInt(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value={0}>Not at all</option>
          <option value={1}>Several days</option>
          <option value={2}>More than half the days</option>
          <option value={3}>Nearly every day</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?
        </label>
        <select
          value={responses.gad2_q1 || 0}
          onChange={(e) => handleGad2Q1Change(parseInt(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value={0}>Not at all</option>
          <option value={1}>Several days</option>
          <option value={2}>More than half the days</option>
          <option value={3}>Nearly every day</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Over the last 2 weeks, how often have you been bothered by not being able to stop or control worrying?
        </label>
        <select
          value={responses.gad2_q2 || 0}
          onChange={(e) => handleGad2Q2Change(parseInt(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value={0}>Not at all</option>
          <option value={1}>Several days</option>
          <option value={2}>More than half the days</option>
          <option value={3}>Nearly every day</option>
        </select>
      </div>
    </div>
  );

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold serenity-navy">Daily Check-In</CardTitle>
          <p className="text-gray-600">How are you doing today? Take a moment to reflect.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Predictive Crisis Alert */}
          {crisisPatterns && (
            <PredictiveCrisisAlert
              patterns={crisisPatterns}
              onCrisisDetected={handleCrisisDetected}
              onShowInterventions={handleShowInterventions}
            />
          )}

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="mood" className="flex items-center space-x-2">
                <Heart className="h-4 w-4" />
                <span>Mood</span>
              </TabsTrigger>
              <TabsTrigger value="wellness" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Wellness</span>
              </TabsTrigger>
              <TabsTrigger value="assessments" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Assessments</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="mood">
              {renderMoodSection()}
            </TabsContent>
            <TabsContent value="wellness">
              {renderWellnessSection()}
            </TabsContent>
            <TabsContent value="assessments">
              {renderAssessmentsSection()}
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span>Progress:</span>
              <span>{completedSections.size}/3</span>
            </div>
            <Button
              onClick={handleComplete}
              disabled={!canComplete() || isSubmitting}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              {isSubmitting ? (
                <>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Check-In
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {showCelebration && (
        <CheckInCelebration 
          onStartMindfulness={handleStartMindfulness}
          onClose={handleCloseCelebration}
        />
      )}
    </>
  );
};

export default DailyCheckIn;
