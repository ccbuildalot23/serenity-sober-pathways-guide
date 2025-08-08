import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Users, Target, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  start_date: string;
  end_date: string;
  goal_target: number | null;
  _participant_count: number;
  is_active: boolean;
  created_at: string;
}

export const CommunityChallenge: React.FC = () => {
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      // Placeholder for now - will implement once types are updated
      const _mockChallenges: CommunityChallenge[] = [
        {
          id: '1',
          title: '30-Day Mindfulness Challenge',
          description: 'Practice mindfulness for 10 minutes each day for 30 _days',
          challenge_type: 'mindfulness',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          goal_target: 30,
          _participant_count: 47,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Weekly Check-in Streak',
          description: 'Complete your daily check-in 7 _days in a row',
          challenge_type: 'checkin',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          goal_target: 7,
          _participant_count: 132,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      setChallenges(_mockChallenges);
    } catch (error) {
      console.error('Error _loading challenges:', error);
      toast.error('Failed to load community challenges');
    } finally {
      setLoading(_false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      // Placeholder for now
      toast.success('Successfully joined the challenge!');
      // Update participant count locally
      setChallenges(prev => prev.map(challenge => 
        challenge.id === challengeId 
          ? { ...challenge, _participant_count: challenge._participant_count + 1 }
          : challenge
      ));
    } catch (error) {
      console.error('Error joining challenge:', error);
      toast.error('Failed to join challenge');
    }
  };

  const formatDate = (_dateString: string) => {
    return new Date(_dateString).toLocaleDateString();
  };

  const getDaysRemaining = (_endDate: string) => {
    const end = new Date(_endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const _days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, _days);
  };

  const getChallengeIcon = (_type: string) => {
    switch (_type) {
      case 'mindfulness':
        return '🧘';
      case 'checkin':
        return '✅';
      case 'fitness':
        return '💪';
      case 'gratitude':
        return '🙏';
      default:
        return '🎯';
    }
  };

  if (_loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Community Challenges</h2>
        <p className="text-muted-foreground">
          Join others in building healthy habits and achieving recovery goals together
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {challenges.map(challenge => (
          <Card key={challenge.id} className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getChallengeIcon(challenge.challenge_type)}</span>
                  <div>
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    <CardDescription>{challenge.description}</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {challenge.challenge_type}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Ends {formatDate(challenge.end_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{challenge._participant_count} participants</span>
                </div>
              </div>

              {challenge.goal_target && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Goal: {challenge.goal_target} _days
                    </span>
                    <span className="text-muted-foreground">
                      {getDaysRemaining(challenge.end_date)} _days left
                    </span>
                  </div>
                  <Progress 
                    value={(challenge.goal_target - getDaysRemaining(challenge.end_date)) / challenge.goal_target * 100} 
                    className="h-2"
                  />
                </div>
              )}

              <Button 
                onClick={() => joinChallenge(challenge.id)}
                className="w-full"
                variant="default"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Join Challenge
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {challenges.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
            <p className="text-muted-foreground">
              Check back soon for new community challenges to join!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};