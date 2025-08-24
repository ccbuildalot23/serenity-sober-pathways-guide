
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface CheckInProgressProps {
  completedSections: Set<string>;
  onSkipToIncomplete: () => void;
}

export const CheckInProgress: React.FC<CheckInProgressProps> = ({
  completedSections,
  onSkipToIncomplete
}) => {
  const progressPercentage = (completedSections.size / 3) * 100;

  return (
    <>
      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{completedSections.size}/3 sections</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`text-center p-2 rounded ${completedSections.has('mood') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 dark:text-gray-400'}`}>
                {completedSections.has('mood') ? '✓' : '○'} Mood
              </div>
              <div className={`text-center p-2 rounded ${completedSections.has('wellness') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 dark:text-gray-400'}`}>
                {completedSections.has('wellness') ? '✓' : '○'} Wellness
              </div>
              <div className={`text-center p-2 rounded ${completedSections.has('assessments') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 dark:text-gray-400'}`}>
                {completedSections.has('assessments') ? '✓' : '○'} Assessments
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skip to incomplete section button */}
      {completedSections.size > 0 && completedSections.size < 3 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSkipToIncomplete}
          className="mx-auto block"
        >
          Skip to next incomplete section
        </Button>
      )}
    </>
  );
};
