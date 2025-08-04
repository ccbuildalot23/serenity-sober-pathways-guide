// Victory Tracker - Celebrate every moment of strength
// No shame for restarts, only pride for trying

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Heart, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { useRecoveryMilestones } from '@/hooks/useRecoveryMilestones';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';

const VictoryTracker = () => {
  const {
    cleanDays,
    nextMilestone,
    isNewDay,
    addCleanDay,
    resetWithCompassion,
    daysUntilNext,
    progressPercent,
    encouragement
  } = useRecoveryMilestones();

  const handleDailyVictory = () => {
    addCleanDay();
    
    // Celebrate with confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Victory Display */}
      <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-800">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
            <h3 className="text-2xl font-bold text-white">Your Victory Journey</h3>
          </div>
          
          {/* Big Day Counter */}
          <div className="mb-6">
            <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">
              {cleanDays}
            </div>
            <div className="text-lg text-gray-300">
              {cleanDays === 1 ? 'Day Clean' : 'Days Clean'}
            </div>
            <p className="text-sm text-purple-300 mt-2">{encouragement}</p>
          </div>

          {/* Daily Victory Button */}
          {isNewDay && cleanDays > 0 && (
            <Button
              onClick={handleDailyVictory}
              size="lg"
              className="w-full mb-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Mark Today's Victory!
            </Button>
          )}

          {/* Start Journey Button for Day 0 */}
          {cleanDays === 0 && (
            <Button
              onClick={handleDailyVictory}
              size="lg"
              className="w-full mb-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
            >
              <Heart className="w-5 h-5 mr-2" />
              Start Your Journey Today
            </Button>
          )}
        </div>
      </Card>

      {/* Progress to Next Milestone */}
      {nextMilestone && cleanDays > 0 && (
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-purple-400 mr-2" />
              <span className="text-sm font-medium text-white">Next Milestone</span>
            </div>
            <Badge className="bg-purple-900 text-purple-200 border-purple-700">
              {nextMilestone.title}
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-3 mb-2 bg-gray-800" />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{daysUntilNext} days to go</span>
            <span>{nextMilestone.emoji}</span>
          </div>
        </Card>
      )}

      {/* Compassionate Reset */}
      {cleanDays > 0 && (
        <Card className="p-4 bg-gray-900 border-gray-800">
          <p className="text-xs text-gray-400 mb-3">
            Recovery isn't perfect. Every journey has restarts. If today is hard, we're here for you.
          </p>
          <Button
            onClick={resetWithCompassion}
            variant="outline"
            size="sm"
            className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Start Fresh (No Judgment)
          </Button>
        </Card>
      )}
    </div>
  );
};

// Keep old component name for compatibility
export { VictoryTracker as SobrietyTracker };
export default VictoryTracker;