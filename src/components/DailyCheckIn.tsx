import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Heart, Brain, TrendingUp, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { MoodSection } from './daily-checkin/MoodSection';
import { WellnessSection } from './daily-checkin/WellnessSection';
import { AssessmentsSection } from './daily-checkin/AssessmentsSection';
import CheckInCelebration from './CheckInCelebration';
import { PredictiveCrisisAlert } from './crisis/PredictiveCrisisAlert';
import { UltraSecureCrisisDataService } from '@/services/ultraSecureCrisisDataService';
import { secureServerLogEvent } from '@/services/secureServerAuditLogService';
import { analyzePatterns } from '@/utils/patternAnalysis';

const DailyCheckIn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('mood');
  const [showCelebration, setShowCelebration] = useState(false);

  const {
    responses,
    setResponses,
    completedSections,
    markSectionComplete,
    canComplete,
    handleComplete,
    isSubmitting
  } = useDailyCheckIn();

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

  const handleRecoveryStrengthChange = (value: string) => {
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

  const handleCompleteCheckIn = async () => {
    const success = await handleComplete();
    if (success) {
      setShowCelebration(true);
    }
  };

  const handleStartMindfulness = () => {
    setShowCelebration(false);
    toast.success('Opening mindfulness exercises...');
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
  };

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
              <MoodSection
                mood={responses.mood}
                onMoodChange={handleMoodChange}
              />
            </TabsContent>
            <TabsContent value="wellness">
              <WellnessSection
                energy={responses.energy}
                hope={responses.hope}
                sobrietyConfidence={responses.sobriety_confidence}
                recoveryImportance={responses.recovery_importance}
                recoveryStrength={responses.recovery_strength}
                supportNeeded={responses.support_needed}
                onEnergyChange={handleEnergyChange}
                onHopeChange={handleHopeChange}
                onSobrietyConfidenceChange={handleSobrietyConfidenceChange}
                onRecoveryImportanceChange={handleRecoveryImportanceChange}
                onRecoveryStrengthChange={handleRecoveryStrengthChange}
                onSupportNeededChange={handleSupportNeededChange}
              />
            </TabsContent>
            <TabsContent value="assessments">
              <AssessmentsSection
                phq2Q1={responses.phq2_q1}
                phq2Q2={responses.phq2_q2}
                gad2Q1={responses.gad2_q1}
                gad2Q2={responses.gad2_q2}
                onPhq2Q1Change={handlePhq2Q1Change}
                onPhq2Q2Change={handlePhq2Q2Change}
                onGad2Q1Change={handleGad2Q1Change}
                onGad2Q2Change={handleGad2Q2Change}
              />
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span>Progress:</span>
              <span>{completedSections.size}/3</span>
            </div>
            <Button
              onClick={handleCompleteCheckIn}
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
