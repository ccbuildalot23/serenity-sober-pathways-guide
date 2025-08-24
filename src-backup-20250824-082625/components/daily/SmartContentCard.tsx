
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Calendar, Compass, Volume2 } from 'lucide-react';

interface SmartContentCardProps {
  affirmation: string;
  dailyFocus: string;
  principle: string;
  onSpeakAffirmation?: () => void;
  onSpeakPrinciple?: () => void;
}

export const SmartContentCard: React.FC<SmartContentCardProps> = ({
  affirmation,
  dailyFocus,
  principle,
  onSpeakAffirmation,
  onSpeakPrinciple
}) => {
  return (
    <div className="space-y-4">
      {/* Affirmation */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <Heart className="w-4 h-4 text-green-600 mr-2" />
                <h4 className="font-semibold text-green-800">Daily Affirmation</h4>
              </div>
              <p className="text-green-700 italic">"{affirmation}"</p>
            </div>
            {onSpeakAffirmation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSpeakAffirmation}
                className="ml-2 text-green-600 hover:text-green-700"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Focus */}
      <Card className="bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center mb-2">
            <Calendar className="w-4 h-4 text-blue-600 mr-2" />
            <h4 className="font-semibold text-blue-800">Today's Focus</h4>
          </div>
          <p className="text-blue-700">{dailyFocus}</p>
        </CardContent>
      </Card>

      {/* Guiding Principle */}
      <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <Compass className="w-4 h-4 text-purple-600 mr-2" />
                <h4 className="font-semibold text-purple-800">Guiding Principle</h4>
              </div>
              <p className="text-purple-700 font-medium text-center">{principle}</p>
            </div>
            {onSpeakPrinciple && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSpeakPrinciple}
                className="ml-2 text-purple-600 hover:text-purple-700"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartContentCard;
