import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Phone, MessageCircle, Users, MapPin, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import logger from '../../services/loggerService';

interface CrisisLevel {
  level: 'low' | 'medium' | 'high' | 'emergency';
  label: string;
  description: string;
  color: string;
  action: string;
}

const crisisLevels: CrisisLevel[] = [
  {
    level: 'low',
    label: 'Need Encouragement',
    description: 'Feeling down but managing',
    color: 'bg-blue-500',
    action: 'Connect with peer support'
  },
  {
    level: 'medium',
    label: 'Strong Cravings',
    description: 'Urges are intense',
    color: 'bg-orange-500',
    action: 'Call sponsor or counselor'
  },
  {
    level: 'high',
    label: 'At Risk',
    description: 'Seriously considering using',
    color: 'bg-red-500',
    action: 'Immediate intervention needed'
  },
  {
    level: 'emergency',
    label: 'Crisis Now',
    description: 'Immediate danger to self',
    color: 'bg-red-600',
    action: 'Call 988 immediately'
  }
];

export const OneTapCrisisButton: React.FC = () => {
  const { user } = useAuth();
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<CrisisLevel | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [location, setLocation] = useState<string>('');

  useEffect(() => {
    // Get location for emergency services
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        () => {
          logger.debug('Location access denied', { component: 'OneTapCrisisButton' });
        }
      );
    }
  }, []);

  const handleCrisisButtonClick = () => {
    // Gentle haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    toast.info('You\'re being so brave', {
      description: 'Opening support options...',
      duration: 2000,
      icon: <Heart className="w-4 h-4 text-pink-500" />
    });

    setShowCrisisModal(true);
  };

  const handleLevelSelect = (level: CrisisLevel) => {
    setSelectedLevel(level);
    setIsProcessing(true);

    // Track this moment of strength
    try {
      // Log crisis level selection
      logger.debug('Crisis level selected:', level.level, { component: 'OneTapCrisisButton' });
      
      // Send to crisis service
      if (level.level === 'emergency') {
        window.location.href = 'tel:988';
        toast.success('Calling 988 Crisis Lifeline', {
          description: 'You\'re being so brave right now',
          duration: 5000,
          icon: <Phone className="w-4 h-4 text-green-500" />
        });
      } else {
        // Route to appropriate support
        routeToSupport(level);
      }
    } catch (error) {
      console.error('Error handling crisis level:', error);
      toast.error('Something went wrong', {
        description: 'Please try again or call 988',
        duration: 3000
      });
    }

    setTimeout(() => {
      setIsProcessing(false);
      setShowCrisisModal(false);
      setSelectedLevel(null);
    }, 3000);
  };

  const routeToSupport = (level: CrisisLevel) => {
    switch (level.level) {
      case 'low':
        toast.success('Connecting you to peer support', {
          description: 'You\'re not alone in this',
          duration: 3000,
          icon: <Users className="w-4 h-4 text-blue-500" />
        });
        // Navigate to peer support
        window.location.href = '/peer-support';
        break;
      case 'medium':
        toast.success('Reaching out to your support network', {
          description: 'Help is on the way',
          duration: 3000,
          icon: <MessageCircle className="w-4 h-4 text-orange-500" />
        });
        // Send alert to support network
        window.location.href = '/crisis-intervention';
        break;
      case 'high':
        toast.success('Activating crisis protocol', {
          description: 'Professional help is being contacted',
          duration: 3000,
          icon: <AlertTriangle className="w-4 h-4 text-red-500" />
        });
        // Activate crisis protocol
        window.location.href = '/crisis-intervention?level=high';
        break;
    }
  };

  const handleEmergencyCall = () => {
    window.location.href = 'tel:988';
    toast.success('Calling 988 Crisis Lifeline', {
      description: 'You\'re being so brave right now',
      duration: 5000,
      icon: <Phone className="w-4 h-4 text-green-500" />
    });
  };

  if (!user) return null;

  return (
    <>
      {/* One-Tap Crisis Button - Always Visible */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={handleCrisisButtonClick}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-2xl border-4 border-red-400 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-300/50"
          aria-label="I NEED HELP NOW - One tap for immediate support"
        >
          <div className="flex flex-col items-center justify-center space-y-1">
            <Heart className="w-8 h-8" />
            <span className="text-xs font-bold">NEED HELP</span>
            <span className="text-[8px] opacity-90">TAP NOW</span>
          </div>
        </Button>

        {/* Pulsing animation for urgency */}
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-red-400/30 animate-ping" />
      </div>

      {/* Crisis Level Selection Modal */}
      <Dialog open={showCrisisModal} onOpenChange={setShowCrisisModal}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-800">
              How are you feeling right now?
            </DialogTitle>
            <p className="text-center text-gray-600 mt-2">
              No typing needed - just slide to your level
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            {crisisLevels.map((level) => (
              <Card
                key={level.level}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:scale-105 border-2",
                  selectedLevel?.level === level.level 
                    ? "border-red-500 bg-red-50" 
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => handleLevelSelect(level)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={cn("w-4 h-4 rounded-full", level.color)} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{level.label}</h3>
                      <p className="text-sm text-gray-600">{level.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{level.action}</p>
                    </div>
                    {selectedLevel?.level === level.level && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Emergency Call Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
              onClick={handleEmergencyCall}
              className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg"
            >
              <div className="flex items-center justify-center space-x-3">
                <Phone className="w-6 h-6" />
                <div className="text-left">
                  <div className="text-lg font-bold">Call 988 Now</div>
                  <div className="text-sm opacity-90">Crisis Lifeline - 24/7</div>
                </div>
              </div>
            </Button>
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Getting help right now...</p>
                <p className="text-sm text-gray-500 mt-1">You're being so brave</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Safe Space Reminder */}
      <div className="fixed bottom-4 left-4 z-[9998]">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200 max-w-[280px]">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs font-medium text-blue-600">Safe Space</p>
              <p className="text-xs text-gray-500">No judgment, just care</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
