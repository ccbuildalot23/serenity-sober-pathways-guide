import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Phone, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CrisisAlertButtonProps {
  onCrisisActivated: () => void;
}

export const CrisisAlertButton: React.FC<CrisisAlertButtonProps> = ({ 
  onCrisisActivated 
}) => {
  const { user } = useAuth();
  const [isPressed, setIsPressed] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [supportAvailable, setSupportAvailable] = useState(true);

  const handlePress = () => {
    setIsPressed(true);
    setShowFeedback(true);

    // Gentle haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }

    // Supportive feedback
    toast.info('We hear you', {
      description: 'Getting help right now...',
      duration: 3000,
      icon: <Heart className="w-4 h-4 text-pink-500" />
    });

    onCrisisActivated();

    // Reset visual state after feedback
    setTimeout(() => {
      setIsPressed(false);
      setShowFeedback(false);
    }, 2000);
  };

  const handleEmergencyCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = 'tel:988';
    toast.success('Calling 988 Crisis Lifeline', {
      description: 'You\'re being so brave right now',
      duration: 3000,
      icon: <Phone className="w-4 h-4 text-green-500" />
    });
  };

  // Don't render if user is not authenticated
  if (!user) return null;

  return (
    <>
      {/* Main Crisis Alert Button */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end space-y-3">
        {/* Emergency Call Button - Always visible but subtle */}
        <div className="relative">
          <Button
            onClick={handleEmergencyCall}
            size="sm"
            variant="outline"
            className="h-8 px-3 bg-white/95 backdrop-blur-sm border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 shadow-lg transition-all duration-200 group"
            aria-label="Call 988 Crisis Lifeline"
          >
            <Phone className="w-3 h-3 mr-2" />
            <span className="text-xs font-medium">988</span>
          </Button>
          
          {/* Availability indicator */}
          <div className="absolute -top-1 -left-1">
            <div className={cn(
              "w-3 h-3 rounded-full border-2 border-white",
              supportAvailable ? "bg-green-500" : "bg-yellow-500"
            )} />
          </div>
        </div>

        {/* Main Crisis Button */}
        <div className="relative">
          <Button
            onClick={handlePress}
            disabled={isPressed}
            className={cn(
              "w-20 h-20 rounded-full shadow-2xl border-4 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300/50",
              !isPressed && !showFeedback && "bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border-purple-500 hover:scale-105 active:scale-95",
              isPressed && "bg-gradient-to-br from-green-600 to-green-700 border-green-500 scale-95",
              showFeedback && "bg-gradient-to-br from-green-600 to-green-700 border-green-500"
            )}
            aria-label="I need support - Tap for compassionate help"
            role="button"
          >
            <div className="flex flex-col items-center justify-center space-y-1">
              {showFeedback ? (
                <>
                  <CheckCircle className="w-8 h-8 text-white" />
                  <span className="text-[10px] font-semibold text-white">SENT</span>
                </>
              ) : (
                <>
                  <Heart className="w-8 h-8 text-white" />
                  <span className="text-[10px] font-semibold text-white">SUPPORT</span>
                </>
              )}
            </div>
          </Button>

          {/* Gentle pulsing animation for availability */}
          {!isPressed && !showFeedback && (
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-purple-400/30 animate-ping" />
          )}

          {/* Status badge */}
          <div className="absolute -top-2 -right-2">
            <Badge 
              variant={supportAvailable ? "default" : "secondary"}
              className={cn(
                "text-[10px] px-1.5 py-0.5 shadow-lg",
                supportAvailable 
                  ? "bg-green-500 hover:bg-green-500 text-white" 
                  : "bg-yellow-500 hover:bg-yellow-500 text-white"
              )}
            >
              {supportAvailable ? "READY" : "BUSY"}
            </Badge>
          </div>
        </div>

        {/* Gentle instructions */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 max-w-[200px]">
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            <span className="font-medium text-purple-600">Tap</span> for gentle support
            <br />
            <span className="text-gray-500">No judgment, just care</span>
          </p>
        </div>
      </div>

      {/* Safe space reminder */}
      <div className="fixed bottom-4 left-4 z-[9998]">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200 max-w-[280px]">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-600">
              <span className="font-medium text-blue-600">You're in a safe space</span>
              <br />
              <span className="text-gray-500">Your privacy is protected</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};