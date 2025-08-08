
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Trophy, Clock, Target, TrendingUp, RefreshCw, Heart, Award, Star, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import CrisisMilestoneDialog from '@/components/milestones/CrisisMilestoneDialog';

interface SobrietyRecord {
  id?: string;
  user_id: string;
  start_date: string;
  daily_cost: number;
  created_at?: string;
  is_active: boolean;
}

interface MilestoneData {
  days: number;
  title: string;
  message: string;
  celebration: string;
}

const SobrietyTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sobrietyDate, setSobrietyDate] = useState<string>('');
  const [dailyCost, setDailyCost] = useState<string>('15');
  const [days, setDays] = useState<number>(0);
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [moneySaved, setMoneySaved] = useState<number>(0);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<MilestoneData | null>(null);
  const [crisisData, setCrisisData] = useState<any[]>([]);
  const [relapseHistory, setRelapseHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Real-time counter update (every second for more granular tracking)
  useEffect(() => {
    const interval = setInterval(() => {
      if (sobrietyDate) {
        calculateRealTimeProgress();
        checkForNewAchievements();
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [sobrietyDate, totalHours]);

  // Load data from database
  useEffect(() => {
    if (user?.id) {
      loadSobrietyData();
      loadRelapseHistory();
      loadAnalytics();
    }
  }, [user?.id]);

  // Check for milestones with celebrations
  useEffect(() => {
    const milestones: { [key: number]: MilestoneData } = {
      1: { days: 1, title: "24 Hours Strong", message: "You've made it through your first 24 hours. That's incredible courage!", celebration: "🌟" },
      7: { days: 7, title: "One Week Wonder", message: "Seven days of strength! You're building momentum.", celebration: "🔥" },
      30: { days: 30, title: "Month Milestone", message: "Thirty days! You're proving your commitment to yourself.", celebration: "🏆" },
      90: { days: 90, title: "Quarter Champion", message: "Three months! You've built new habits and strength.", celebration: "💎" },
      180: { days: 180, title: "Half-Year Hero", message: "Six months of dedication! You're transforming your life.", celebration: "🌈" },
      365: { days: 365, title: "One Year Warrior", message: "A full year! You've conquered every season clean.", celebration: "👑" }
    };
    
    const milestone = milestones[days];
    if (milestone && days > 0) {
      setCurrentMilestone(milestone);
      setShowMilestone(true);
      celebrateMilestone(milestone);
    }
  }, [days]);

  const celebrateMilestone = (milestone: MilestoneData) => {
    // Confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    // Toast notification
    toast({
      title: `🎉 ${milestone.title}!`,
      description: milestone.message,
      duration: 5000,
    });
  };

  const loadSobrietyData = async () => {
    if (!user?.id) return;

    try {
      // Load from profiles table first
      const { data: profile } = await supabase
        .from('profiles')
        .select('recovery_start_date')
        .eq('id', user.id)
        .single();

      if (profile?.recovery_start_date) {
        setSobrietyDate(profile.recovery_start_date);
        calculateRealTimeProgress(profile.recovery_start_date);
      }
    } catch (error) {
      console.error('Error loading sobriety data:', error);
    }
  };

  const loadRelapseHistory = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('recovery_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'sobriety')
        .order('created_at', { ascending: false });

      setRelapseHistory(data || []);
    } catch (error) {
      console.error('Error loading relapse history:', error);
    }
  };

  const loadAnalytics = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .rpc('get_recovery_streak', { user_uuid: user.id });

      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadCrisisData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('crisis_events')
        .select('id, created_at as crisis_start_time')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading crisis data:', error);
        return;
      }

      setCrisisData(data || []);
    } catch (error) {
      console.error('Error in loadCrisisData:', error);
    }
  };

  const calculateRealTimeProgress = (startDate?: string) => {
    const dateToUse = startDate || sobrietyDate;
    if (!dateToUse) return;
    
    const start = new Date(dateToUse);
    const now = new Date();
    const diffTime = now.getTime() - start.getTime();
    
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalHoursInDay = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const totalMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    const totalSeconds = Math.floor((diffTime % (1000 * 60)) / 1000);
    const totalHoursOverall = Math.floor(diffTime / (1000 * 60 * 60));
    
    setDays(totalDays);
    setHours(totalHoursInDay);
    setMinutes(totalMinutes);
    setSeconds(totalSeconds);
    setTotalHours(totalHoursOverall);
    setMoneySaved(totalDays * parseFloat(dailyCost));
  };

  const handleDateChange = async (newDate: string) => {
    setLoading(true);
    setSobrietyDate(newDate);
    
    try {
      // Update profile with new start date
      const { error } = await supabase
        .from('profiles')
        .update({ recovery_start_date: newDate })
        .eq('id', user?.id);

      if (error) throw error;

      calculateRealTimeProgress(newDate);
      
      toast({
        title: "Journey Updated",
        description: "Your sobriety start date has been saved.",
      });
    } catch (error) {
      console.error('Error updating sobriety date:', error);
      toast({
        title: "Error",
        description: "Failed to update start date. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCostChange = (newCost: string) => {
    setDailyCost(newCost);
    if (sobrietyDate) {
      calculateRealTimeProgress();
    }
  };

  const handleRelapse = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Create a supportive relapse record
      await supabase
        .from('recovery_goals')
        .insert({
          user_id: user.id,
          title: 'Recovery Reset',
          description: 'Starting fresh with renewed commitment',
          category: 'sobriety',
          priority: 'high',
          target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active'
        });

      // Reset counter to today
      const today = new Date().toISOString().split('T')[0];
      await handleDateChange(today);
      
      toast({
        title: "Fresh Start 💪",
        description: "Every journey has bumps. You're brave for starting again. This moment is your strength.",
        duration: 6000,
      });
    } catch (error) {
      console.error('Error handling relapse:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStreakMessage = () => {
    if (days === 0) return "Today is day one! 🌱";
    if (days === 1) return "One day strong! 💪";
    if (days < 7) return `${days} days of courage! ⭐`;
    if (days < 30) return `${Math.floor(days / 7)} weeks of strength! 🔥`;
    if (days < 365) return `${Math.floor(days / 30)} months of healing! 🌟`;
    return `${Math.floor(days / 365)} years of resilience! 👑`;
  };

  const getProgressToNextMilestone = () => {
    const milestones = [1, 7, 30, 90, 180, 365, 730, 1095]; // Up to 3 years
    const nextMilestone = milestones.find(m => m > days);
    if (!nextMilestone) return null;
    
    const progress = (days / nextMilestone) * 100;
    return { next: nextMilestone, progress, remaining: nextMilestone - days };
  };

  const checkForNewAchievements = () => {
    const hourlyMilestones = [
      { hours: 24, title: "First Full Day", icon: "🌅" },
      { hours: 72, title: "Three Days Strong", icon: "💪" },
      { hours: 168, title: "First Week", icon: "🔥" },
      { hours: 336, title: "Two Weeks", icon: "⭐" },
      { hours: 720, title: "One Month", icon: "🏆" },
      { hours: 2160, title: "Three Months", icon: "💎" },
      { hours: 4320, title: "Six Months", icon: "🌈" },
      { hours: 8760, title: "One Year", icon: "👑" },
      { hours: 17520, title: "Two Years", icon: "🎯" },
      { hours: 26280, title: "Three Years", icon: "🌟" }
    ];

    const newMilestone = hourlyMilestones.find(m => 
      totalHours >= m.hours && !achievements.includes(m.title)
    );

    if (newMilestone) {
      setAchievements(prev => [...prev, newMilestone.title]);
      setNewAchievement(`${newMilestone.icon} ${newMilestone.title}`);
      
      // Show achievement notification
      setTimeout(() => setNewAchievement(null), 5000);
    }
  };

  const progressData = getProgressToNextMilestone();

  return (
    <div className="space-y-6">
      {/* Main Counter Display */}
      <Card className="p-6 bg-gradient-to-br from-serenity-mint/20 to-serenity-sage/20 border-serenity-sage/30">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <Trophy className="w-8 h-8 text-serenity-gold mr-3" />
            <h3 className="text-2xl font-bold text-serenity-navy">Your Serenity Journey</h3>
          </div>
          
          {days >= 0 ? (
            <>
              {/* Real-time Counter */}
              <div className="mb-6">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-serenity-emerald">{days}</div>
                    <div className="text-xs text-muted-foreground">Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-serenity-teal">{hours}</div>
                    <div className="text-xs text-muted-foreground">Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-serenity-sage">{minutes}</div>
                    <div className="text-xs text-muted-foreground">Minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-serenity-gold">{seconds}</div>
                    <div className="text-xs text-muted-foreground">Seconds</div>
                  </div>
                </div>
                
                {/* Total Hours Badge */}
                <div className="flex justify-center mb-4">
                  <Badge variant="outline" className="px-4 py-2 text-lg">
                    <Clock className="w-4 h-4 mr-2" />
                    {totalHours.toLocaleString()} Total Hours Clean
                  </Badge>
                </div>
                
                <div className="text-lg text-serenity-navy font-medium">{getStreakMessage()}</div>
              </div>

              {/* Progress to Next Milestone */}
              {progressData && (
                <div className="mb-6 p-4 bg-white/50 rounded-lg border border-serenity-sage/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-serenity-navy">Next Milestone</span>
                    <Badge variant="outline" className="border-serenity-teal text-serenity-teal">
                      {progressData.next} days
                    </Badge>
                  </div>
                  <Progress value={progressData.progress} className="h-2 mb-2" />
                  <div className="text-xs text-muted-foreground">
                    {progressData.remaining} days to go
                  </div>
                </div>
              )}
              
              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card p-3 text-center">
                  <Calendar className="w-5 h-5 text-serenity-teal mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Days Clean</div>
                  <div className="text-lg font-bold text-serenity-navy">{days}</div>
                </div>
                
                <div className="glass-card p-3 text-center">
                  <Clock className="w-5 h-5 text-serenity-sage mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Total Hours</div>
                  <div className="text-lg font-bold text-serenity-sage">{totalHours.toLocaleString()}</div>
                </div>
                
                <div className="glass-card p-3 text-center">
                  <DollarSign className="w-5 h-5 text-serenity-emerald mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Money Saved</div>
                  <div className="text-lg font-bold text-serenity-emerald">${moneySaved.toFixed(0)}</div>
                </div>
                
                <div className="glass-card p-3 text-center">
                  <Award className="w-5 h-5 text-serenity-gold mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Achievements</div>
                  <div className="text-lg font-bold text-serenity-gold">{achievements.length}</div>
                </div>
              </div>
              
              {/* Recent Achievements Display */}
              {achievements.length > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-600" />
                    <h4 className="text-sm font-medium text-yellow-800">Recent Achievements</h4>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {achievements.slice(-3).map((achievement, index) => (
                      <Badge key={index} className="bg-yellow-500 text-white text-xs">
                        {achievement}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground mb-6">
              Set your sobriety start date to begin tracking your progress
            </div>
          )}
        </div>
      </Card>

      {/* Configuration & Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings */}
        <Card className="p-6">
          <h4 className="font-semibold mb-4 text-serenity-navy flex items-center gap-2">
            <Target className="w-5 h-5" />
            Track Your Progress
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-serenity-navy mb-2">
                Sobriety Start Date
              </label>
              <Input
                type="date"
                value={sobrietyDate}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={loading}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-serenity-navy mb-2">
                Daily Cost (Previous Habit)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={dailyCost}
                  onChange={(e) => handleCostChange(e.target.value)}
                  className="pl-8"
                  placeholder="15"
                />
              </div>
            </div>

            {/* Non-judgmental Reset Option */}
            {days > 0 && (
              <div className="pt-4 border-t border-serenity-sage/20">
                <p className="text-sm text-muted-foreground mb-3">
                  Recovery isn't linear. If you need to reset your counter, that's okay. You're still strong.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleRelapse}
                  disabled={loading}
                  className="w-full border-serenity-coral text-serenity-coral hover:bg-serenity-coral/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Counter with Compassion
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Analytics */}
        <Card className="p-6">
          <h4 className="font-semibold mb-4 text-serenity-navy flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Progress Analytics
          </h4>
          
          {analyticsData ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Streak</span>
                <Badge className="bg-serenity-emerald text-white">
                  {analyticsData.current_streak_days} days
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Longest Streak</span>
                <Badge variant="outline" className="border-serenity-gold text-serenity-gold">
                  {analyticsData.longest_streak_days} days
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">30-Day Rate</span>
                <Badge variant="outline" className="border-serenity-teal text-serenity-teal">
                  {analyticsData.completion_rate_30_days}%
                </Badge>
              </div>

              {relapseHistory.length > 0 && (
                <div className="pt-4 border-t border-serenity-sage/20">
                  <div className="text-sm text-muted-foreground mb-2">Recovery Restarts</div>
                  <div className="text-2xl font-bold text-serenity-navy">{relapseHistory.length}</div>
                  <div className="text-xs text-serenity-coral">Each restart shows courage</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Loading analytics...</p>
            </div>
          )}
        </Card>
      </div>

      {/* Milestone Celebration Dialog */}
      {currentMilestone && (
        <Card className={`fixed inset-4 z-50 max-w-md mx-auto my-auto p-6 text-center animate-scale-in ${showMilestone ? 'block' : 'hidden'}`}>
          <div className="text-6xl mb-4">{currentMilestone.celebration}</div>
          <h3 className="text-2xl font-bold text-serenity-navy mb-2">{currentMilestone.title}</h3>
          <p className="text-serenity-sage mb-6">{currentMilestone.message}</p>
          <Button 
            onClick={() => setShowMilestone(false)}
            className="bg-serenity-emerald hover:bg-serenity-emerald/90"
          >
            <Heart className="w-4 h-4 mr-2" />
            Thank You
          </Button>
        </Card>
      )}

      {/* New Achievement Notification */}
      {newAchievement && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <div>
              <div className="font-bold">New Achievement!</div>
              <div className="text-sm">{newAchievement}</div>
            </div>
          </div>
        </div>
      )}

      {/* Crisis Milestone Dialog */}
      <CrisisMilestoneDialog
        isOpen={showMilestone}
        onClose={() => setShowMilestone(false)}
        milestone={currentMilestone?.days || 0}
        crisisData={crisisData}
      />
    </div>
  );
};

export default SobrietyTracker;
