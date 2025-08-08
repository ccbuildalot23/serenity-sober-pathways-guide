import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Award, Target, Calendar, Heart, Zap, Shield } from 'lucide-react';
import { useSkillSession } from '@/hooks/useSkillSession';
import { dashboardDataService } from '@/services/dashboardDataService';
import { useAuth } from '@/contexts/AuthContext';

interface Achievement {
  id: string;
  badge_name: string;
  badge_type: string;
  earned_at: string;
  user_id: string;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'streak' | 'checkin' | 'skill' | 'milestone' | 'special';
  requirements: string;
  color: string;
  progress?: number;
  maxProgress?: number;
}

export const AchievementBadges: React.FC = () => {
  const { user } = useAuth();
  const { getUserAchievements } = useSkillSession();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [achievementsResult, _stats] = await Promise.all([
        getUserAchievements(),
        dashboardDataService.getUserStats(user.id)
      ]);

      if (achievementsResult.data) {
        setAchievements(achievementsResult.data);
      }
      setUserStats(_stats);
    } catch (_error) {
      console._error('Error loading achievement data:', _error);
    } finally {
      setIsLoading(false);
    }
  };

  const badgeDefinitions: BadgeDefinition[] = [
    // Streak Badges
    {
      id: 'first_week',
      name: 'First Week',
      description: 'Complete 7 consecutive days',
      icon: <Calendar className="h-6 w-6" />,
      category: 'streak',
      requirements: '7 day streak',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      progress: userStats?.streak || 0,
      maxProgress: 7
    },
    {
      id: 'month_warrior',
      name: 'Month Warrior',
      description: 'Complete 30 consecutive days',
      icon: <Shield className="h-6 w-6" />,
      category: 'streak',
      requirements: '30 day streak',
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      progress: userStats?.streak || 0,
      maxProgress: 30
    },
    {
      id: 'hundred_days',
      name: 'Centurion',
      description: 'Complete 100 consecutive days',
      icon: <Trophy className="h-6 w-6" />,
      category: 'streak',
      requirements: '100 day streak',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      progress: userStats?.streak || 0,
      maxProgress: 100
    },

    // Check-in Badges
    {
      id: 'dedicated_tracker',
      name: 'Dedicated Tracker',
      description: 'Complete 50 check-ins',
      icon: <Target className="h-6 w-6" />,
      category: 'checkin',
      requirements: '50 check-ins',
      color: 'bg-green-100 text-green-700 border-green-200',
      progress: userStats?.checkIns || 0,
      maxProgress: 50
    },
    {
      id: 'check_in_champion',
      name: 'Check-in Champion',
      description: 'Complete 100 check-ins',
      icon: <Star className="h-6 w-6" />,
      category: 'checkin',
      requirements: '100 check-ins',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      progress: userStats?.checkIns || 0,
      maxProgress: 100
    },

    // Skill Badges (from existing system)
    {
      id: 'cbt_explorer',
      name: 'CBT Explorer',
      description: 'Complete your first thought record',
      icon: <Zap className="h-6 w-6" />,
      category: 'skill',
      requirements: '1 thought record',
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    {
      id: 'mindfulness_master',
      name: 'Mindfulness Master',
      description: 'Practice mindfulness for 30 days',
      icon: <Heart className="h-6 w-6" />,
      category: 'skill',
      requirements: '30 mindfulness sessions',
      color: 'bg-pink-100 text-pink-700 border-pink-200'
    },
    {
      id: 'skills_integrator',
      name: 'Skills Integrator',
      description: 'Practice 5 different skill categories',
      icon: <Award className="h-6 w-6" />,
      category: 'skill',
      requirements: '5 skill categories',
      color: 'bg-teal-100 text-teal-700 border-teal-200'
    }
  ];

  const isEarned = (badgeId: string) => {
    return achievements.some(achievement => 
      achievement.badge_name.toLowerCase().replace(/\s+/g, '_') === badgeId ||
      achievement.badge_name === badgeDefinitions.find(b => b.id === badgeId)?.name
    );
  };

  const getProgressPercentage = (badge: BadgeDefinition) => {
    if (!badge.progress || !badge.maxProgress) return 0;
    return Math.min((badge.progress / badge.maxProgress) * 100, 100);
  };

  const getProgressText = (badge: BadgeDefinition) => {
    if (!badge.progress || !badge.maxProgress) return null;
    return `${badge.progress}/${badge.maxProgress}`;
  };

  const earnedBadges = badgeDefinitions.filter(badge => isEarned(badge.id));
  const progressBadges = badgeDefinitions.filter(badge => !isEarned(badge.id) && badge.progress !== undefined);
  const lockedBadges = badgeDefinitions.filter(badge => !isEarned(badge.id) && badge.progress === undefined);

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to view your achievements</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Achievement Badges
          <Badge variant="secondary" className="ml-auto">
            {earnedBadges.length}/{badgeDefinitions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-lg mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Earned Badges */}
            {earnedBadges.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">Earned Badges</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {earnedBadges.map((badge) => (
                    <div key={badge.id} className="text-center group">
                      <div className={`aspect-square rounded-lg border-2 p-4 flex items-center justify-center ${badge.color} shadow-sm transition-transform group-hover:scale-105`}>
                        {badge.icon}
                      </div>
                      <h4 className="font-medium text-sm mt-2">{badge.name}</h4>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        ✓ Earned
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress Badges */}
            {progressBadges.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">In Progress</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {progressBadges.map((badge) => (
                    <div key={badge.id} className="text-center">
                      <div className={`aspect-square rounded-lg border-2 border-dashed p-4 flex items-center justify-center bg-muted/50 transition-colors hover:bg-muted`}>
                        {React.cloneElement(badge.icon as React.ReactElement, { 
                          className: "h-6 w-6 text-muted-foreground" 
                        })}
                      </div>
                      <h4 className="font-medium text-sm mt-2">{badge.name}</h4>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                      <div className="mt-2 space-y-1">
                        <Progress value={getProgressPercentage(badge)} className="h-1" />
                        <p className="text-xs text-muted-foreground">
                          {getProgressText(badge)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked Badges */}
            {lockedBadges.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">Locked Badges</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {lockedBadges.map((badge) => (
                    <div key={badge.id} className="text-center">
                      <div className="aspect-square rounded-lg border-2 border-dashed p-4 flex items-center justify-center bg-muted/30">
                        {React.cloneElement(badge.icon as React.ReactElement, { 
                          className: "h-6 w-6 text-muted-foreground/50" 
                        })}
                      </div>
                      <h4 className="font-medium text-sm mt-2 text-muted-foreground">{badge.name}</h4>
                      <p className="text-xs text-muted-foreground/70">{badge.description}</p>
                      <Badge variant="outline" className="mt-1 text-xs text-muted-foreground/70">
                        {badge.requirements}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};