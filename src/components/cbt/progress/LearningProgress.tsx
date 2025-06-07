
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Target, Calendar, TrendingUp } from 'lucide-react';
import { useSkillSession } from '@/hooks/useSkillSession';

interface SkillModule {
  id: string;
  title: string;
  progress: number;
  badgesEarned: number;
  totalBadges: number;
  color: string;
}

interface LearningProgressProps {
  modules?: SkillModule[];
}

const LearningProgress: React.FC<LearningProgressProps> = ({ modules = [] }) => {
  const { getUserAchievements, getSkillProgress } = useSkillSession();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [skillProgress, setSkillProgress] = useState<any[]>([]);

  // Default modules if none provided
  const defaultModules: SkillModule[] = [
    {
      id: 'cognitive',
      title: 'Cognitive Restructuring',
      progress: 0,
      badgesEarned: 0,
      totalBadges: 3,
      color: 'bg-blue-500'
    },
    {
      id: 'behavioral',
      title: 'Behavioral Activation',
      progress: 0,
      badgesEarned: 0,
      totalBadges: 3,
      color: 'bg-green-500'
    },
    {
      id: 'mindfulness',
      title: 'Mindfulness & Distress Tolerance',
      progress: 0,
      badgesEarned: 0,
      totalBadges: 2,
      color: 'bg-purple-500'
    },
    {
      id: 'communication',
      title: 'Communication Skills',
      progress: 0,
      badgesEarned: 0,
      totalBadges: 2,
      color: 'bg-yellow-500'
    },
    {
      id: 'relapse_prevention',
      title: 'Relapse Prevention',
      progress: 0,
      badgesEarned: 0,
      totalBadges: 3,
      color: 'bg-red-500'
    }
  ];

  const activeModules = modules.length > 0 ? modules : defaultModules;

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      // Load achievements
      const { data: achievementsData } = await getUserAchievements();
      if (achievementsData) {
        setAchievements(achievementsData);
      }

      // Load skill progress
      const { data: progressData } = await getSkillProgress();
      if (progressData) {
        setSkillProgress(progressData);
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  const totalProgress = Math.round(
    activeModules.reduce((sum, module) => sum + module.progress, 0) / activeModules.length
  );
  
  const totalBadges = achievements.length;
  const maxBadges = activeModules.reduce((sum, module) => sum + module.totalBadges, 0);

  const predefinedAchievements = [
    { title: 'First Steps', description: 'Complete your first CBT exercise', earned: achievements.some(a => a.badge_name === 'CBT Explorer') },
    { title: 'Thought Detective', description: 'Identify 10 cognitive distortions', earned: totalBadges >= 2 },
    { title: 'Activity Master', description: 'Schedule 20 activities', earned: false },
    { title: 'Mindful Moments', description: 'Complete 5 meditation sessions', earned: achievements.some(a => a.badge_name === 'Mindfulness Master') },
    { title: 'Goal Getter', description: 'Create 3 SMART goals', earned: false },
    { title: 'Communication Pro', description: 'Practice 10 assertiveness scenarios', earned: false }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-2">
          Learning Progress & Achievements
        </h2>
        <p className="text-gray-600">
          Track your mastery of CBT skills and celebrate your growth
        </p>
      </div>

      {/* Overall Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProgress}%</p>
                <p className="text-sm text-gray-600">Overall Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBadges}</p>
                <p className="text-sm text-gray-600">Badges Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeModules.length}</p>
                <p className="text-sm text-gray-600">Active Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Module Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeModules.map((module) => (
            <div key={module.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg ${module.color} flex items-center justify-center`}>
                    <span className="text-white text-sm font-medium">
                      {module.title.charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium">{module.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {module.badgesEarned}/{module.totalBadges} badges
                  </Badge>
                  <span className="text-sm text-gray-600">{module.progress}%</span>
                </div>
              </div>
              <Progress value={module.progress} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span>Achievements</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predefinedAchievements.map((achievement, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  achievement.earned
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    achievement.earned ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}>
                    {achievement.earned ? (
                      <Trophy className="w-4 h-4 text-white" />
                    ) : (
                      <Star className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-medium ${
                      achievement.earned ? 'text-yellow-800' : 'text-gray-600'
                    }`}>
                      {achievement.title}
                    </h4>
                    <p className={`text-sm ${
                      achievement.earned ? 'text-yellow-700' : 'text-gray-500'
                    }`}>
                      {achievement.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Learning Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Personalized Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h4 className="font-medium text-blue-800 mb-1">Continue Your Journey</h4>
              <p className="text-sm text-blue-700">
                You're making great progress with cognitive restructuring! Try the mindfulness exercises next to build on your emotional regulation skills.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
              <h4 className="font-medium text-green-800 mb-1">Suggested Focus</h4>
              <p className="text-sm text-green-700">
                Based on your activity, spending more time on behavioral activation could help you build sustainable daily routines.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
              <h4 className="font-medium text-purple-800 mb-1">Practice Frequency</h4>
              <p className="text-sm text-purple-700">
                You've been consistent this week! Try to practice CBT skills at least 3 times per week for optimal benefit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LearningProgress;
