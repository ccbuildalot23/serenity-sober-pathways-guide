
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface CheckInCompletionProps {
  canComplete: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  isSaving: boolean;
}

export const CheckInCompletion: React.FC<CheckInCompletionProps> = ({
  canComplete,
  isSubmitting,
  onSubmit,
  isSaving
}) => {
  return (
    <>
      {/* Completion Section */}
      <Card className={canComplete ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
        <CardContent className="p-6">
          {!canComplete && (
            <div className="flex items-start space-x-3 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-800 font-medium">Complete all sections to finish</p>
                <p className="text-yellow-700 text-sm">
                  Make sure to fill out all required fields in each section above.
                </p>
              </div>
            </div>
          )}
          
          <Button
            onClick={onSubmit}
            disabled={!canComplete || isSubmitting}
            className={`w-full py-3 text-lg transition-all ${
              canComplete 
                ? 'bg-green-600 hover:bg-green-700 transform hover:scale-[1.02]' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            size="lg"
            aria-label={canComplete ? 'Complete daily check-in' : 'Complete all sections first'}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Completing...</span>
              </div>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete Check-In
              </>
            )}
          </Button>
          
          {canComplete && (
            <p className="text-center text-sm text-green-700 mt-2">
              Great job! You're ready to complete today's check-in.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Auto-save indicator */}
      <div className="text-center text-xs text-gray-500">
        {isSaving ? 'Saving your responses...' : 'Your responses are automatically saved as you go'}
      </div>
    </>
  );
};
