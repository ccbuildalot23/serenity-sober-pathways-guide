import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star, Heart, Users, MessageCircle } from 'lucide-react';

interface UserReputationProps {
  karma?: number;
  postKarma?: number;
  commentKarma?: number;
  helpfulVotes?: number;
  level?: string;
  showDetailed?: boolean;
}

export const UserReputation: React.FC<UserReputationProps> = ({
  karma = 0,
  postKarma = 0,
  commentKarma = 0,
  helpfulVotes = 0,
  level,
  showDetailed = false
}) => {
  const getReputationLevel = (totalKarma: number): string => {
    if (totalKarma >= 1000) return 'Community Leader';
    if (totalKarma >= 500) return 'Veteran Helper';
    if (totalKarma >= 200) return 'Active Supporter';
    if (totalKarma >= 50) return 'Helper';
    return 'New Member';
  };

  const getReputationColor = (totalKarma: number): string => {
    if (totalKarma >= 1000) return 'bg-gradient-to-r from-purple-500 to-pink-500';
    if (totalKarma >= 500) return 'bg-gradient-to-r from-blue-500 to-purple-500';
    if (totalKarma >= 200) return 'bg-gradient-to-r from-green-500 to-blue-500';
    if (totalKarma >= 50) return 'bg-gradient-to-r from-yellow-500 to-green-500';
    return 'bg-gradient-to-r from-gray-400 to-gray-500';
  };

  const getLevelIcon = (totalKarma: number): string => {
    if (totalKarma >= 1000) return '👑';
    if (totalKarma >= 500) return '🏆';
    if (totalKarma >= 200) return '🌟';
    if (totalKarma >= 50) return '✨';
    return '🌱';
  };

  const getProgressToNext = (totalKarma: number): { current: number; next: number; progress: number } => {
    if (totalKarma >= 1000) return { current: totalKarma, next: 1000, progress: 100 };
    if (totalKarma >= 500) return { current: totalKarma - 500, next: 500, progress: (totalKarma - 500) / 500 * 100 };
    if (totalKarma >= 200) return { current: totalKarma - 200, next: 300, progress: (totalKarma - 200) / 300 * 100 };
    if (totalKarma >= 50) return { current: totalKarma - 50, next: 150, progress: (totalKarma - 50) / 150 * 100 };
    return { current: totalKarma, next: 50, progress: totalKarma / 50 * 100 };
  };

  const reputationLevel = level || getReputationLevel(karma);
  const progressData = getProgressToNext(karma);

  if (!showDetailed) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{getLevelIcon(karma)}</span>
        <Badge 
          variant="secondary" 
          className={`${getReputationColor(karma)} text-white border-0`}
        >
          {reputationLevel}
        </Badge>
        <span className="text-sm text-muted-foreground">{karma} karma</span>
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <div className="text-3xl mb-2">{getLevelIcon(karma)}</div>
          <h3 className="font-semibold text-foreground">{reputationLevel}</h3>
          <p className="text-sm text-muted-foreground">{karma} total karma</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to next level</span>
            <span className="text-muted-foreground">{progressData.current}/{progressData.next}</span>
          </div>
          <Progress value={progressData.progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{postKarma}</span>
            </div>
            <p className="text-xs text-muted-foreground">Post Karma</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">{commentKarma}</span>
            </div>
            <p className="text-xs text-muted-foreground">Comment Karma</p>
          </div>
        </div>

        <div className="text-center pt-2 border-t border-border">
          <div className="flex items-center justify-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">{helpfulVotes}</span>
            <span className="text-xs text-muted-foreground ml-1">helpful votes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};