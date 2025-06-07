
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Heart, Target, Users, Lightbulb, TrendingUp, Star, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSkillSession } from '@/hooks/useSkillSession';

interface SkillAssessment {
  category: string;
  priority: 'high' | 'medium' | 'low';
  currentLevel: string;
  recommendedSkills: string[];
}

interface LearningRecommendation {
  skillName: string;
  category: string;
  reason: string;
  priority: number;
  estimatedTime: string;
}

interface UserProgress {
  category: string;
  completedSessions: number;
  averageEffectiveness: number;
  masteryLevel: string;
  lastPracticed: string | null;
}

const PersonalizedLearningPath: React.FC = () => {
  const { user } = useAuth();
  const { getSkillProgress, getSkillMastery } = useSkillSession();
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, any>>({});
  const [skillAssessments, setSkillAssessments] = useState<SkillAssessment[]>([]);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [learningStyle, setLearningStyle] = useState<string | null>(null);

  const assessmentQuestions = [
    {
      id: 'primary_struggle',
      question: 'What is your biggest challenge in recovery right now?',
      type: 'single',
      options: [
        { value: 'negative_thoughts', label: 'Negative thinking patterns', category: 'cognitive' },
        { value: 'low_motivation', label: 'Lack of motivation or energy', category: 'behavioral' },
        { value: 'overwhelming_emotions', label: 'Overwhelming emotions or urges', category: 'mindfulness' },
        { value: 'social_situations', label: 'Difficult social situations', category: 'communication' },
        { value: 'staying_motivated', label: 'Staying motivated long-term', category: 'relapse_prevention' }
      ]
    },
    {
      id: 'learning_preference',
      question: 'How do you learn best?',
      type: 'single',
      options: [
        { value: 'visual', label: 'Visual aids, diagrams, and written instructions' },
        { value: 'auditory', label: 'Audio content, discussions, and verbal explanations' },
        { value: 'kinesthetic', label: 'Hands-on practice and interactive exercises' },
        { value: 'mixed', label: 'A combination of different methods' }
      ]
    },
    {
      id: 'time_availability',
      question: 'How much time can you typically dedicate to skill practice?',
      type: 'single',
      options: [
        { value: '5-10', label: '5-10 minutes per day' },
        { value: '15-20', label: '15-20 minutes per day' },
        { value: '30-45', label: '30-45 minutes per day' },
        { value: 'varies', label: 'It varies day to day' }
      ]
    },
    {
      id: 'skill_priorities',
      question: 'Which skills are most important to you? (Select all that apply)',
      type: 'multiple',
      options: [
        { value: 'thought_challenging', label: 'Challenging negative thoughts', category: 'cognitive' },
        { value: 'activity_planning', label: 'Planning rewarding activities', category: 'behavioral' },
        { value: 'stress_management', label: 'Managing stress and anxiety', category: 'mindfulness' },
        { value: 'setting_boundaries', label: 'Setting healthy boundaries', category: 'communication' },
        { value: 'craving_management', label: 'Managing cravings and urges', category: 'relapse_prevention' },
        { value: 'mood_regulation', label: 'Regulating difficult emotions', category: 'mindfulness' }
      ]
    },
    {
      id: 'current_support',
      question: 'How would you rate your current support system?',
      type: 'single',
      options: [
        { value: 'strong', label: 'Strong - I have good support' },
        { value: 'moderate', label: 'Moderate - Some support but could be better' },
        { value: 'limited', label: 'Limited - Not much support available' },
        { value: 'building', label: 'Building - Working on developing support' }
      ]
    }
  ];

  useEffect(() => {
    loadUserPreferences();
    loadUserProgress();
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_skill_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (data) {
        setAssessmentCompleted(data.completed_assessment);
        setLearningStyle(data.learning_style);
        // Load existing assessments and recommendations
        generateRecommendations(data);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const loadUserProgress = async () => {
    if (!user) return;

    const categories = ['cognitive', 'behavioral', 'mindfulness', 'communication', 'relapse_prevention'];
    const progressData: UserProgress[] = [];

    for (const category of categories) {
      try {
        const { data: sessions } = await getSkillProgress(category);
        const { data: mastery } = await getSkillMastery(category);

        if (sessions) {
          const completedSessions = sessions.length;
          const averageEffectiveness = sessions
            .filter(s => s.effectiveness_rating)
            .reduce((sum, s) => sum + (s.effectiveness_rating || 0), 0) / 
            (sessions.filter(s => s.effectiveness_rating).length || 1);
          
          const lastPracticed = sessions.length > 0 ? sessions[0].completed_at : null;

          progressData.push({
            category,
            completedSessions,
            averageEffectiveness,
            masteryLevel: mastery || 'Beginner',
            lastPracticed
          });
        }
      } catch (error) {
        console.error(`Error loading progress for ${category}:`, error);
      }
    }

    setUserProgress(progressData);
  };

  const handleAssessmentAnswer = (questionId: string, answer: any) => {
    setAssessmentAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < assessmentQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      completeAssessment();
    }
  };

  const completeAssessment = async () => {
    if (!user) return;

    try {
      // Save assessment results
      const preferences = {
        user_id: user.id,
        preferred_modules: assessmentAnswers.skill_priorities || [],
        completed_assessment: true,
        learning_style: assessmentAnswers.learning_preference,
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_skill_preferences')
        .upsert(preferences);

      if (error) throw error;

      setAssessmentCompleted(true);
      setLearningStyle(assessmentAnswers.learning_preference);
      generateRecommendations(preferences);

    } catch (error) {
      console.error('Error saving assessment:', error);
    }
  };

  const generateRecommendations = async (preferences: any) => {
    // Generate personalized recommendations based on assessment and progress
    const recs: LearningRecommendation[] = [];

    // High priority recommendations based on primary struggle
    const primaryStruggle = assessmentAnswers.primary_struggle || preferences.primary_struggle;
    
    if (primaryStruggle === 'negative_thoughts') {
      recs.push({
        skillName: 'Thought Record Builder',
        category: 'cognitive',
        reason: 'Helps identify and challenge negative thought patterns',
        priority: 1,
        estimatedTime: '15-20 minutes'
      });
    }

    if (primaryStruggle === 'overwhelming_emotions') {
      recs.push({
        skillName: 'TIPP Skills',
        category: 'mindfulness',
        reason: 'Provides immediate relief for intense emotions',
        priority: 1,
        estimatedTime: '2-5 minutes'
      });
    }

    // Recommendations based on progress gaps
    userProgress.forEach(progress => {
      if (progress.completedSessions < 3) {
        recs.push({
          skillName: `${progress.category} Skills Introduction`,
          category: progress.category,
          reason: 'Build foundation in this skill area',
          priority: 2,
          estimatedTime: '10-15 minutes'
        });
      }
    });

    // Sort by priority and set recommendations
    recs.sort((a, b) => a.priority - b.priority);
    setRecommendations(recs.slice(0, 6)); // Top 6 recommendations
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cognitive': return <Brain className="h-5 w-5" />;
      case 'behavioral': return <Target className="h-5 w-5" />;
      case 'mindfulness': return <Heart className="h-5 w-5" />;
      case 'communication': return <Users className="h-5 w-5" />;
      case 'relapse_prevention': return <Award className="h-5 w-5" />;
      default: return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cognitive': return 'bg-blue-500';
      case 'behavioral': return 'bg-green-500';
      case 'mindfulness': return 'bg-purple-500';
      case 'communication': return 'bg-yellow-500';
      case 'relapse_prevention': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!assessmentCompleted) {
    const question = assessmentQuestions[currentQuestion];
    
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-[#1E3A8A] text-center">
            Personalized Learning Assessment
          </CardTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Question {currentQuestion + 1} of {assessmentQuestions.length}</span>
            </div>
            <Progress value={((currentQuestion + 1) / assessmentQuestions.length) * 100} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">{question.question}</h3>
            
            <div className="space-y-3">
              {question.options.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    question.type === 'single' 
                      ? (assessmentAnswers[question.id] === option.value ? "default" : "outline")
                      : (assessmentAnswers[question.id]?.includes(option.value) ? "default" : "outline")
                  }
                  className="w-full text-left justify-start h-auto p-4"
                  onClick={() => {
                    if (question.type === 'single') {
                      handleAssessmentAnswer(question.id, option.value);
                    } else {
                      const current = assessmentAnswers[question.id] || [];
                      const updated = current.includes(option.value)
                        ? current.filter((v: string) => v !== option.value)
                        : [...current, option.value];
                      handleAssessmentAnswer(question.id, updated);
                    }
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            
            <Button
              onClick={nextQuestion}
              disabled={!assessmentAnswers[question.id]}
              className="bg-[#1E3A8A] hover:bg-[#1E40AF]"
            >
              {currentQuestion === assessmentQuestions.length - 1 ? 'Complete Assessment' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-[#1E3A8A]">
            Your Personalized Learning Path
          </CardTitle>
          <p className="text-gray-600">
            Based on your assessment and progress, here are your personalized recommendations
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="recommendations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">Daily Recommendations</TabsTrigger>
          <TabsTrigger value="progress">Skill Progress</TabsTrigger>
          <TabsTrigger value="path">Learning Path</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {recommendations.map((rec, index) => (
              <Card key={index} className="border-l-4" style={{borderLeftColor: getCategoryColor(rec.category).replace('bg-', '')}}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(rec.category)}
                      <h4 className="font-bold text-[#1E3A8A]">{rec.skillName}</h4>
                    </div>
                    <Badge variant={rec.priority === 1 ? "destructive" : rec.priority === 2 ? "default" : "secondary"}>
                      {rec.priority === 1 ? 'High Priority' : rec.priority === 2 ? 'Recommended' : 'Optional'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Est. {rec.estimatedTime}</span>
                    <Button size="sm" className="bg-[#10B981] hover:bg-[#059669]">
                      Start Practice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userProgress.map((progress) => (
              <Card key={progress.category}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {getCategoryIcon(progress.category)}
                    <h4 className="font-bold text-[#1E3A8A] capitalize">
                      {progress.category.replace('_', ' ')}
                    </h4>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Mastery Level:</span>
                      <Badge variant="secondary">{progress.masteryLevel}</Badge>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Sessions:</span>
                      <span>{progress.completedSessions}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Avg. Effectiveness:</span>
                      <div className="flex items-center gap-1">
                        <span>{progress.averageEffectiveness.toFixed(1)}/10</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                    
                    {progress.lastPracticed && (
                      <div className="text-xs text-gray-500">
                        Last practiced: {new Date(progress.lastPracticed).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="path" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-[#1E3A8A] mb-2">Your Learning Journey</h3>
                  <p className="text-gray-600">Follow this personalized path to build your recovery skills</p>
                </div>

                <div className="space-y-4">
                  {/* Learning Style Indicator */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Your Learning Style: {learningStyle}</h4>
                    <p className="text-sm text-blue-700">
                      {learningStyle === 'visual' && 'You learn best with visual aids, diagrams, and written materials.'}
                      {learningStyle === 'auditory' && 'You learn best through listening and verbal explanations.'}
                      {learningStyle === 'kinesthetic' && 'You learn best through hands-on practice and interactive exercises.'}
                      {learningStyle === 'mixed' && 'You learn well with a variety of different teaching methods.'}
                    </p>
                  </div>

                  {/* Skill Category Priorities */}
                  <div className="grid md:grid-cols-5 gap-3">
                    {['cognitive', 'behavioral', 'mindfulness', 'communication', 'relapse_prevention'].map((category) => {
                      const progress = userProgress.find(p => p.category === category);
                      const completionPercentage = progress ? Math.min((progress.completedSessions / 10) * 100, 100) : 0;
                      
                      return (
                        <div key={category} className="text-center">
                          <div className={`w-16 h-16 rounded-full ${getCategoryColor(category)} flex items-center justify-center text-white mx-auto mb-2`}>
                            {getCategoryIcon(category)}
                          </div>
                          <h5 className="text-sm font-medium capitalize mb-1">
                            {category.replace('_', ' ')}
                          </h5>
                          <Progress value={completionPercentage} className="h-2" />
                          <span className="text-xs text-gray-500">{Math.round(completionPercentage)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonalizedLearningPath;
