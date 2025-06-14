
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';

interface CheckInHeaderProps {
  onNavigateToHome: () => void;
  isSaving: boolean;
}

export const CheckInHeader: React.FC<CheckInHeaderProps> = ({
  onNavigateToHome,
  isSaving
}) => {
  return (
    <>
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onNavigateToHome}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        {isSaving && (
          <div className="flex items-center text-sm text-gray-500">
            <Save className="w-4 h-4 mr-1 animate-pulse" />
            Saving...
          </div>
        )}
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[#1E3A8A]">Daily Check-In</h1>
        <p className="text-gray-600">Take a moment to reflect on your day</p>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>
    </>
  );
};
