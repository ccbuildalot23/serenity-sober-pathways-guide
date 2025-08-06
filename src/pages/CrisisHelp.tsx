import React, { useEffect, useState } from 'react';
import { Phone, MessageSquare, Heart, Users, MapPin, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const CrisisHelp: React.FC = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    // Get user location for local resources
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }

    // Shake detection for emergency activation
    let shakeThreshold = 20;
    let lastX = 0, lastY = 0, lastZ = 0;
    
    const handleMotion = (event: DeviceMotionEvent) => {
      const { x, y, z } = event.accelerationIncludingGravity || {};
      if (x && y && z) {
        const deltaX = Math.abs(x - lastX);
        const deltaY = Math.abs(y - lastY);
        const deltaZ = Math.abs(z - lastZ);
        
        if (deltaX + deltaY + deltaZ > shakeThreshold) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 3000);
        }
        
        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      if (window.DeviceMotionEvent) {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, []);

  const handleEmergencyCall = () => {
    window.location.href = 'tel:988';
  };

  const handleTextSupport = () => {
    window.location.href = 'sms:741741&body=HELLO';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white p-4">
      {/* Emergency Banner */}
      {isShaking && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 z-50 animate-pulse">
          <p className="text-center font-bold">Emergency mode activated - Help is available</p>
        </div>
      )}

      {/* Main Crisis Buttons */}
      <div className="max-w-md mx-auto pt-8">
        <h1 className="text-3xl font-bold text-center mb-2">You're Not Alone</h1>
        <p className="text-center text-gray-600 mb-8">Immediate help is available 24/7</p>

        {/* Primary Emergency Button */}
        <Button
          onClick={handleEmergencyCall}
          className="w-full h-32 bg-red-600 hover:bg-red-700 text-white mb-4 rounded-2xl shadow-lg"
        >
          <div className="flex flex-col items-center">
            <Phone className="w-12 h-12 mb-2" />
            <span className="text-2xl font-bold">Call 988</span>
            <span className="text-sm opacity-90">Suicide & Crisis Lifeline</span>
          </div>
        </Button>

        {/* Text Support Button */}
        <Button
          onClick={handleTextSupport}
          className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white mb-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-center gap-4">
            <MessageSquare className="w-8 h-8" />
            <div className="text-left">
              <span className="text-xl font-bold block">Text 741741</span>
              <span className="text-sm opacity-90">Crisis Text Line</span>
            </div>
          </div>
        </Button>

        {/* I'm Safe Now Option */}
        <Card className="p-6 mb-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold">I'm Safe Now</h3>
                <p className="text-sm text-gray-600">Explore self-help resources</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Card>

        {/* Additional Resources */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">More Ways to Get Help</h2>
          
          <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
            <a href="tel:18002738255" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">Veterans Crisis Line</p>
                  <p className="text-sm text-gray-600">1-800-273-8255</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>
          </Card>

          <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
            <a href="https://www.crisistextline.org" target="_blank" rel="noopener noreferrer" 
               className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">Online Chat Support</p>
                  <p className="text-sm text-gray-600">Connect with a counselor</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>
          </Card>

          {location && (
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Local Crisis Centers</p>
                    <p className="text-sm text-gray-600">Find help near you</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Card>
          )}
        </div>

        {/* Safety Plan Reminder */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Create a Safety Plan</h3>
          <p className="text-sm text-blue-800">
            When you're feeling better, create a personalized safety plan with warning signs, 
            coping strategies, and support contacts.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-2">
            If you're in immediate danger, call 911
          </p>
          <a href="/" className="text-blue-600 hover:underline text-sm">
            Return to Serenity App →
          </a>
        </div>
      </div>
    </div>
  );
};

export default CrisisHelp;