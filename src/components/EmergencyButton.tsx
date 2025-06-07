
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Check } from 'lucide-react';

const EmergencyButton = () => {
  const [isPressed, setIsPressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmergencyPress = async () => {
    setIsLoading(true);
    setIsPressed(true);

    // Simulate sending alert
    setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setIsPressed(false), 2000);
    }, 1500);

    console.log('Emergency support alert sent!');
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Need Immediate Support?
        </h3>
        <p className="text-sm text-gray-600">
          Tap the button below to alert your support network
        </p>
      </div>
      
      <Button
        onClick={handleEmergencyPress}
        disabled={isLoading || isPressed}
        className={`w-full h-16 text-lg font-semibold rounded-xl transition-all duration-300 ${
          isPressed 
            ? 'bg-emerald-500 hover:bg-emerald-500' 
            : 'bg-red-500 hover:bg-red-600 active:scale-95'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Sending Alert...
          </div>
        ) : isPressed ? (
          <div className="flex items-center justify-center">
            <Check className="w-6 h-6 mr-2" />
            Alert Sent!
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Heart className="w-6 h-6 mr-2" />
            Send Support Alert
          </div>
        )}
      </Button>
      
      {isPressed && (
        <p className="text-center text-sm text-emerald-600 mt-3 animate-scale-in">
          Your support network has been notified. Help is on the way. 💚
        </p>
      )}
    </div>
  );
};

export default EmergencyButton;
