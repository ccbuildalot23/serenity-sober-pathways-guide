import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, Users, Heart, Shield, Home } from 'lucide-react';
import { MobileCrisisButton } from './MobileCrisisButton';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const MobileCrisisPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleEmergencyCall = () => {
    // In production, this would trigger actual emergency services
    if (window.Capacitor?.Plugins?.App) {
      window.location.href = 'tel:988'; // Suicide & Crisis Lifeline
    } else {
      console.log('Emergency services would be contacted');
    }
  };

  const handleContactSupport = () => {
    navigate('/support-network');
  };

  const handleSendMessage = () => {
    navigate('/crisis-chat');
  };

  const handleBreathingExercise = () => {
    navigate('/breathing-exercise');
  };

  const handleSafetyPlan = () => {
    navigate('/safety-plan');
  };

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-b from-blue-50 to-white",
      "flex flex-col items-center justify-between",
      "p-4 safe-area-inset", // Account for iPhone notch/home indicator
      isLandscape && "lg:flex-row lg:justify-around"
    )}>
      {/* Header */}
      <div className="w-full text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Crisis Support
        </h1>
        <p className="text-gray-600">
          You're not alone. Help is available.
        </p>
      </div>

      {/* Main Crisis Button */}
      <div className="flex-1 flex items-center justify-center mb-8">
        <MobileCrisisButton
          onActivate={handleEmergencyCall}
          variant="emergency"
          size="extra-large"
          hapticEnabled={true}
          shakeEnabled={true}
        />
      </div>

      {/* Quick Actions Grid */}
      <div className={cn(
        "w-full grid grid-cols-2 gap-4 mb-8",
        "max-w-md mx-auto",
        isLandscape && "lg:grid-cols-4"
      )}>
        <Button
          onClick={handleContactSupport}
          className="h-20 flex flex-col items-center justify-center gap-2 touch-manipulation"
          variant="outline"
        >
          <Users className="w-6 h-6" />
          <span className="text-sm">Support Network</span>
        </Button>

        <Button
          onClick={handleSendMessage}
          className="h-20 flex flex-col items-center justify-center gap-2 touch-manipulation"
          variant="outline"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-sm">Crisis Chat</span>
        </Button>

        <Button
          onClick={handleBreathingExercise}
          className="h-20 flex flex-col items-center justify-center gap-2 touch-manipulation"
          variant="outline"
        >
          <Heart className="w-6 h-6" />
          <span className="text-sm">Breathe</span>
        </Button>

        <Button
          onClick={handleSafetyPlan}
          className="h-20 flex flex-col items-center justify-center gap-2 touch-manipulation"
          variant="outline"
        >
          <Shield className="w-6 h-6" />
          <span className="text-sm">Safety Plan</span>
        </Button>
      </div>

      {/* Emergency Numbers */}
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Emergency Contacts</h2>
        <div className="space-y-2">
          <a
            href="tel:988"
            className="flex items-center justify-between p-3 bg-red-50 rounded-lg touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-red-600" />
              <div>
                <div className="font-medium">Crisis Lifeline</div>
                <div className="text-sm text-gray-600">988</div>
              </div>
            </div>
            <Button size="sm" variant="destructive">Call</Button>
          </a>

          <a
            href="tel:911"
            className="flex items-center justify-between p-3 bg-red-50 rounded-lg touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-red-600" />
              <div>
                <div className="font-medium">Emergency</div>
                <div className="text-sm text-gray-600">911</div>
              </div>
            </div>
            <Button size="sm" variant="destructive">Call</Button>
          </a>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="w-full max-w-md mx-auto">
        <Button
          onClick={() => navigate('/')}
          className="w-full h-14 touch-manipulation"
          variant="secondary"
        >
          <Home className="w-5 h-5 mr-2" />
          Return Home
        </Button>
      </div>
    </div>
  );
};