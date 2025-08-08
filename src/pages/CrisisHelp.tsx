import React, { useEffect, useState } from 'react';
import { Phone, MessageSquare, Heart, Users, MapPin, ChevronRight, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSearchParams } from 'react-router-dom';

const CrisisHelp: React.FC = () => {
  const [location, setLocation] = useState<{ lat: number; _lng: number } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [selectedCrisisType, setSelectedCrisisType] = useState<string | null>(null);
  const [showingMessage, setShowingMessage] = useState(false);
  const [searchParams] = useSearchParams();
  const discreteMode = searchParams.get('discrete') === 'true';

  useEffect(() => {
    // Get user location for local resources
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            _lng: position.coords.longitude,
          });
        },
        (_error) => {
          console.log('Location access denied:', _error);
        }
      );
    }

    // Shake detection for emergency activation
    const shakeThreshold = 20;
    let lastX = 0, lastY = 0, lastZ = 0;
    
    const _handleMotion = (event: DeviceMotionEvent) => {
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
      window.addEventListener('devicemotion', _handleMotion);
    }

    return () => {
      if (window.DeviceMotionEvent) {
        window.removeEventListener('devicemotion', _handleMotion);
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
          <p className="text-center font-bold">💪 You had the courage to ask for help - Support is here</p>
        </div>
      )}

      {/* Discrete Mode Banner */}
      {discreteMode && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 z-50">
          <p className="text-center text-sm">🤝 Private support mode - Your privacy is protected</p>
        </div>
      )}

      {/* Crisis Type Selection */}
      {!selectedCrisisType && (
        <div className="max-w-lg mx-auto pt-8">
          <h1 className="text-3xl font-bold text-center mb-2">You're Not Alone</h1>
          <p className="text-center text-gray-600 mb-2">Reaching out takes courage. You have it.</p>
          <p className="text-center text-sm text-gray-500 mb-8">What brings you here today? (This helps us give you the right support)</p>
          
          <div className="space-y-3 mb-6">
            {[
              { id: 'suicidal', label: 'Having thoughts of suicide or self-harm', icon: '🆘', color: 'red' },
              { id: 'relapse', label: 'Struggling with urges to use/drink', icon: '⚠️', color: 'orange' },
              { id: 'shame', label: 'Feeling overwhelmed by shame/guilt', icon: '💙', color: 'blue' },
              { id: 'panic', label: 'Having a panic attack or severe anxiety', icon: '🌊', color: 'purple' },
              { id: 'alone', label: 'Feeling completely alone and hopeless', icon: '🤗', color: 'green' },
              { id: 'emergency', label: 'Need immediate help right now', icon: '🚨', color: 'red' }
            ].map((crisis) => (
              <button
                key={crisis.id}
                onClick={() => setSelectedCrisisType(crisis.id)}
                className={`w-full p-4 text-left rounded-xl border-2 hover:shadow-md transition-all ${
                  crisis.color === 'red' ? 'border-red-200 hover:border-red-300 hover:bg-red-50' :
                  crisis.color === 'orange' ? 'border-orange-200 hover:border-orange-300 hover:bg-orange-50' :
                  crisis.color === 'blue' ? 'border-blue-200 hover:border-blue-300 hover:bg-blue-50' :
                  crisis.color === 'purple' ? 'border-purple-200 hover:border-purple-300 hover:bg-purple-50' :
                  'border-green-200 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{crisis.icon}</span>
                  <span className="font-medium text-gray-800">{crisis.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Personalized Crisis Response */}
      {selectedCrisisType && (
        <div className="max-w-md mx-auto pt-8">
          {/* Back Button */}
          <button 
            onClick={() => setSelectedCrisisType(null)}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm"
          >
            ← Choose different support
          </button>
          
          {/* Crisis-Specific Header */}
          <div className="text-center mb-8">
            {selectedCrisisType === 'suicidal' && (
              <>
                <h1 className="text-3xl font-bold mb-2">You're Brave to Reach Out</h1>
                <p className="text-gray-600">Suicidal thoughts are a sign you're in pain, not weak. Help is here.</p>
              </>
            )}
            {selectedCrisisType === 'relapse' && (
              <>
                <h1 className="text-3xl font-bold mb-2">Urges Are Temporary</h1>
                <p className="text-gray-600">You've overcome them before. Let's get you through this moment.</p>
              </>
            )}
            {selectedCrisisType === 'shame' && (
              <>
                <h1 className="text-3xl font-bold mb-2">Shame Lies to You</h1>
                <p className="text-gray-600">You are not your mistakes. You are worthy of love and recovery.</p>
              </>
            )}
            {selectedCrisisType === 'panic' && (
              <>
                <h1 className="text-3xl font-bold mb-2">This Will Pass</h1>
                <p className="text-gray-600">Panic feels scary but it can't hurt you. You're safe.</p>
              </>
            )}
            {selectedCrisisType === 'alone' && (
              <>
                <h1 className="text-3xl font-bold mb-2">You Matter</h1>
                <p className="text-gray-600">Loneliness is painful but temporary. Connection is possible.</p>
              </>
            )}
            {selectedCrisisType === 'emergency' && (
              <>
                <h1 className="text-3xl font-bold mb-2">Help is Here Right Now</h1>
                <p className="text-gray-600">You did the right thing by reaching out. Support is available immediately.</p>
              </>
            )}
          </div>

          {/* Primary Emergency Button - Crisis-Specific */}
          <Button
            onClick={handleEmergencyCall}
            className={`w-full h-32 mb-4 rounded-2xl shadow-lg text-white ${
              selectedCrisisType === 'emergency' || selectedCrisisType === 'suicidal' 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            <div className="flex flex-col items-center">
              <Phone className="w-12 h-12 mb-2" />
              <span className="text-2xl font-bold">Call 988</span>
              <span className="text-sm opacity-90">
                {selectedCrisisType === 'suicidal' ? 'Talk to someone who understands' :
                 selectedCrisisType === 'relapse' ? 'Get addiction crisis support' :
                 selectedCrisisType === 'shame' ? 'Speak with a counselor' :
                 selectedCrisisType === 'panic' ? 'Calm your anxiety with help' :
                 selectedCrisisType === 'alone' ? 'Connect with someone who cares' :
                 'Immediate crisis support'}
              </span>
            </div>
          </Button>

          {/* Text Support Button - Crisis-Specific */}
          <Button
            onClick={handleTextSupport}
            className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white mb-6 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-center gap-4">
              <MessageSquare className="w-8 h-8" />
              <div className="text-left">
                <span className="text-xl font-bold block">Text 741741</span>
                <span className="text-sm opacity-90">
                  {selectedCrisisType === 'shame' ? 'Text when speaking feels too hard' :
                   selectedCrisisType === 'panic' ? 'Text for breathing exercises' :
                   selectedCrisisType === 'alone' ? 'Connect through text support' :
                   'Private crisis text support'}
                </span>
              </div>
            </div>
          </Button>

          {/* Crisis-Specific Immediate Help */}
          {selectedCrisisType === 'panic' && (
            <Card className="p-4 mb-4 bg-purple-50 border-purple-200">
              <div className="text-center">
                <h3 className="font-semibold mb-2">🫁 Breathe With Me (30 seconds)</h3>
                <div className="text-sm text-purple-800 mb-2">
                  Breathe in for 4... Hold for 4... Breathe out for 6...
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            </Card>
          )}
          
          {selectedCrisisType === 'shame' && (
            <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
              <div className="text-center">
                <h3 className="font-semibold mb-2">💙 Remember This Truth</h3>
                <p className="text-sm text-blue-800 italic">
                  "Your past does not define your worth. Every day in recovery is proof of your strength."
                </p>
              </div>
            </Card>
          )}
          
          {selectedCrisisType === 'relapse' && (
            <Card className="p-4 mb-4 bg-orange-50 border-orange-200">
              <div className="text-center">
                <h3 className="font-semibold mb-2">⏰ Just This Moment</h3>
                <p className="text-sm text-orange-800">
                  Urges peak and pass. You only need to get through the next 20 minutes.
                </p>
                <div className="mt-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  <span className="text-xs">Set a 20-minute timer</span>
                </div>
              </div>
            </Card>
          )}

          {/* I'm Safe Now Option */}
          <Card className="p-6 mb-6 bg-green-50 border-green-200 cursor-pointer hover:bg-green-100" 
                onClick={() => {
                  setShowingMessage(true);
                  setTimeout(() => setShowingMessage(false), 3000);
                }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold">
                    {selectedCrisisType === 'panic' ? "The panic is passing" :
                     selectedCrisisType === 'shame' ? "I'm choosing self-compassion" :
                     selectedCrisisType === 'relapse' ? "I'm staying strong" :
                     "I'm safe for now"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedCrisisType === 'panic' ? 'Continue with calming resources' :
                     selectedCrisisType === 'shame' ? 'Explore self-forgiveness tools' :
                     selectedCrisisType === 'relapse' ? 'Build your recovery toolkit' :
                     'Find ongoing support resources'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            {showingMessage && (
              <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-800 text-center">
                💚 You're practicing self-care. That's recovery in action.
              </div>
            )}
          </Card>

          {/* Crisis-Specific Additional Resources */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedCrisisType === 'shame' ? 'Shame-Specific Support' :
               selectedCrisisType === 'relapse' ? 'Addiction Crisis Resources' :
               selectedCrisisType === 'panic' ? 'Anxiety Support' :
               'More Ways to Get Help'}
            </h2>
          
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

          {/* Crisis-Specific Safety Planning */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  {selectedCrisisType === 'shame' ? 'Build Your Shame Resilience Plan' :
                   selectedCrisisType === 'relapse' ? 'Strengthen Your Recovery Plan' :
                   selectedCrisisType === 'panic' ? 'Create Your Anxiety Toolkit' :
                   'Create Your Safety Plan'}
                </h3>
                <p className="text-sm text-blue-800">
                  {selectedCrisisType === 'shame' ? 'Identify your shame triggers and practice self-compassion responses.' :
                   selectedCrisisType === 'relapse' ? 'Plan specific actions for when cravings hit and build your support network.' :
                   selectedCrisisType === 'panic' ? 'Prepare breathing exercises, grounding techniques, and comfort items.' :
                   'When you are feeling better, create a personalized safety plan with warning signs and coping strategies.'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-2">
              {selectedCrisisType === 'emergency' ? 'If you are in immediate physical danger, call 911' :
               'Remember: You took a brave step by reaching out today'}
            </p>
            <div className="space-y-2">
              <a href="/" className="block text-blue-600 hover:underline text-sm">
                Return to Serenity App →
              </a>
              {!discreteMode && (
                <button 
                  onClick={() => window.history.back()}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  ← Go back to where I was
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrisisHelp;