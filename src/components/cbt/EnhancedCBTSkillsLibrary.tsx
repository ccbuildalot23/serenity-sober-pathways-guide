
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Brain, Heart, Target, Users, Award, Star, TrendingUp, BookOpen, Trophy, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSkillSession } from '@/hooks/useSkillSession';

// Import enhanced components
import EnhancedThoughtRecordBuilder from './cognitive/EnhancedThoughtRecordBuilder';
import DistractionWheel from './mindfulness/DistractionWheel';
import PersonalizedLearningPath from './progress/PersonalizedLearningPath';

// Import existing components
import CognitiveRestructuring from './cognitive/CognitiveRestructuring';
import BehavioralActivation from './behavioral/BehavioralActivation';
import MindfulnessTraining from './mindfulness/MindfulnessTraining';
import RelapsePrevention from './relapse/RelapsePrevention';
import CommunicationSkills from './communication/CommunicationSkills';
import LearningProgress from './progress/LearningProgress';

interface SkillModule {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  component: React.ComponentType;
  features: string[];
  estimatedTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

const EnhancedCBTSkillsLibrary: React.FC = () => {
  const { user } = useAuth();
  const { getUserAchievements, getSkillProgress } = useSkillSession();
  const [activeModule, setActiveModule] = useState<string>('overview');
  const [achievements, setAchievements] = useState<any[]>([]);
  const [skillProgress, setSkillProgress] = useState<any[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(3); // Skills practiced per week
  const [currentStreak, setCurrentStreak] = useState(0);

  const skillModules: SkillModule[] = [
    {
      id: 'cognitive',
      name: 'Cognitive Restructuring Mastery',
      description: 'Challenge and reframe unhelpful thoughts with evidence-based techniques',
      icon: <Brain className="h-6 w-6" />,
      color: 'bg-blue-500',
      component: CognitiveRestructuring,
      features: ['Thought Record Builder', 'Distortion Detective', 'Friend Advice Exercise', 'Template Library'],
      estimatedTime: '15-30 min',
      difficulty: 'Beginner'
    },
    {
      id: 'behavioral',
      name: 'Behavioral Activation Toolkit',
      description: 'Build positive behaviors and meaningful activities into your recovery',
      icon: <Target className="h-6 w-6" />,
      color: 'bg-green-500',
      component: BehavioralActivation,
      features: ['Activity Scheduling', 'SMART Goals', 'Values Clarification', 'Mood Tracking'],
      estimatedTime: '20-45 min',
      difficulty: 'Beginner'
    },
    {
      id: 'mindfulness',
      name: 'Mindfulness & Distress Tolerance',
      description: 'Develop skills to manage intense emotions and urges mindfully',
      icon: <Heart className="h-6 w-6" />,
      color: 'bg-purple-500',
      component: MindfulnessTraining,
      features: ['Guided Meditation', 'TIPP Skills', 'Distraction Wheel', 'Urge Surfing'],
      estimatedTime: '5-25 min',
      difficulty: 'Intermediate'
    },
    {
      id: 'communication',
      name: 'Communication Skills Academy',
      description: 'Build assertive communication and healthy relationship skills',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-yellow-500',
      component: CommunicationSkills,
      features: ['Assertiveness Training', 'Boundary Setting', 'Recovery Disclosure', 'Conflict Resolution'],
      estimatedTime: '25-40 min',
      difficulty: 'Intermediate'
    },
    {
      id: 'relapse_prevention',
      name: 'Relapse Prevention Mastery',
      description: 'Identify triggers and build comprehensive prevention strategies',
      icon: <Award className="h-6 w-6" />,
      color: 'bg-red-500',
      component: RelapsePrevention,
      features: ['Risk Mapping', 'Emergency Planning', 'Support Network', 'Trigger Management'],
      estimatedTime: '30-60 min',
      difficulty: 'Advanced'
    }
  ];

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      // Load achievements
      const { data: achievementsData } = await getUserAchievements();
      if (achievementsData) {
        setAchievements(achievementsData);
      }

      // Load skill progress for all categories
      const progressPromises = skillModules.map(module => 
        getSkillProgress(module.id)
      );
      
      const progressResults = await Promise.all(progressPromises);
      const formattedProgress = progressResults.map((result, index) => ({
        category: skillModules[index].id,
        sessions: result.data || [],
        totalSessions: result.data?.length || 0,
        averageEffectiveness: result.data?.length > 0 
          ? result.data.reduce((sum: number, session: any) => sum + (session.effectiveness_rating || 0), 0) / result.data.length
          : 0
      }));

      setSkillProgress(formattedProgress);

      // Calculate streak (simplified - consecutive days with practice)
      // This would be more sophisticated in a real implementation
      setCurrentStreak(Math.floor(Math.random() * 10) + 1); // Placeholder

    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getTotalSessions = () => {
    return skillProgress.reduce((sum, progress) => sum + progress.totalSessions, 0);
  };

  const getWeeklyProgress = () => {
    const thisWeekSessions = skillProgress.reduce((sum, progress) => {
      const weekSessions = progress.sessions.filter((session: any) => {
        const sessionDate = new Date(session.completed_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;
      });
      return sum + weekSessions.length;
    }, 0);

    return Math.min((thisWeekSessions / weeklyGoal) * 100, 100);
  };

  const renderActiveModule = () => {
    if (activeModule === 'overview') {
      return <PersonalizedLearningPath />;
    }

    if (activeModule === 'progress') {
      return <LearningProgress />;
    }

    const module = skillModules.find(m => m.id === activeModule);
    if (module) {
      const Component = module.component;
      return <Component />;
    }

    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Progress Overview */}
      <Card className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">CBT Skills Training Library</h1>
              <p className="text-blue-100">Evidence-based tools for sustainable recovery</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{getTotalSessions()}</div>
              <div className="text-sm text-blue-100">Total Sessions</div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4" />
                <span className="text-sm">Achievements</span>
              </div>
              <div className="text-xl font-bold">{achievements.length}</div>
            </div>

            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Current Streak</span>
              </div>
              <div className="text-xl font-bold">{currentStreak} days</div>
            </div>

            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4" />
                <span className="text-sm">Weekly Goal</span>
              </div>
              <div className="text-xl font-bold">{weeklyGoal} skills</div>
            </div>

            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="h-4 w-4" />
                <span className="text-sm">Progress</span>
              </div>
              <Progress value={getWeeklyProgress()} className="h-2 bg-white/20" />
              <div className="text-xs mt-1">{Math.round(getWeeklyProgress())}% complete</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeModule} onValueChange={setActiveModule}>
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Overview
              </TabsTrigger>
              {skillModules.map((module) => (
                <TabsTrigger key={module.id} value={module.id} className="flex items-center gap-2">
                  {module.icon}
                  <span className="hidden lg:inline">{module.name.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Progress
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Skill Module Cards (shown on overview) */}
      {activeModule === 'overview' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {skillModules.map((module) => {
            const progress = skillProgress.find(p => p.category === module.id);
            const completionPercentage = progress ? Math.min((progress.totalSessions / 10) * 100, 100) : 0;
            
            return (
              <Card key={module.id} className="hover:shadow-lg transition-shadow cursor-pointer border-l-4" 
                    style={{borderLeftColor: module.color.replace('bg-', '')}}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-lg ${module.color} text-white`}>
                      {module.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1E3A8A]">{module.name}</h3>
                      <Badge variant="secondary">{module.difficulty}</Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Est. Time:</span>
                      <span>{module.estimatedTime}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progress:</span>
                        <span>{Math.round(completionPercentage)}%</span>
                      </div>
                      <Progress value={completionPercentage} className="h-2" />
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {module.features.slice(0, 2).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {module.features.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{module.features.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 bg-[#1E3A8A] hover:bg-[#1E40AF]"
                    onClick={() => setActiveModule(module.id)}
                  >
                    Start Practice
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Active Module Content */}
      <div className="min-h-[600px]">
        {renderActiveModule()}
      </div>

      {/* Recent Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1E3A8A]">
              <Trophy className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {achievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <div className="font-medium text-yellow-800">{achievement.badge_name}</div>
                    <div className="text-sm text-yellow-600">
                      Earned {new Date(achievement.earned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedCBTSkillsLibrary;
