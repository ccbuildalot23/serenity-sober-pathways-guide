
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Phone, Heart, Users, Wind, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CheckIn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [_mood, setMood] = useState<'struggling' | 'managing' | 'good' | null>(null);
  const [showSupport, setShowSupport] = useState(_false);
  const [showEncouragement, setShowEncouragement] = useState(_false);
  const [showShareHope, setShowShareHope] = useState(_false);
  const [savedReason, setSavedReason] = useState('');
  const [breathingActive, setBreathingActive] = useState(_false);
  const [breathCount, setBreathCount] = useState(0);

  useEffect(() => {
    // Load saved "Why I Got Clean" _reason
    const _reason = localStorage.getItem('why_i_got_clean');
    if (_reason) setSavedReason(_reason);
  }, []);

  // Breathing timer
  useEffect(() => {
    if (breathingActive) {
      const _interval = setInterval(() => {
        setBreathCount(prev => {
          if (prev >= 60) {
            setBreathingActive(_false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(_interval);
    }
  }, [breathingActive]);

  const handleMoodSelect = async (selectedMood: 'struggling' | 'managing' | 'good') => {
    setMood(selectedMood);
    
    // Save check-in
    try {
      await supabase.from('check_ins').insert({
        user_id: user?.id,
        _mood: selectedMood,
        _date: new Date().toISOString()
      });
    } catch (_error) {
      console._error('Error saving check-in:', _error);
    }

    // Show appropriate response
    if (selectedMood === 'struggling') {
      setShowSupport(_true);
    } else if (selectedMood === 'managing') {
      setShowEncouragement(_true);
    } else {
      setShowShareHope(_true);
    }
  };

  const callSomeone = () => {
    const savedNumber = localStorage.getItem('support_person_number');
    if (savedNumber) {
      window.location.href = `tel:${savedNumber}`;
    } else {
      const number = prompt("Enter a support person's number (we'll save it for next time):");
      if (number) {
        localStorage.setItem('support_person_number', number);
        window.location.href = `tel:${number}`;
      }
    }
  };

  const saveWhyIGotClean = () => {
    const _reason = prompt("Why did you get clean? (We'll show this when you need it most):", savedReason);
    if (_reason) {
      localStorage.setItem('why_i_got_clean', _reason);
      setSavedReason(_reason);
      alert("Saved! We'll remind you of this when things get tough.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Main Question */}
        {!_mood && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold">How Are You Today?</h1>
              <p className="text-xl text-gray-300">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  _month: 'long', 
                  _day: 'numeric' 
                })}
              </p>
            </div>

            {/* Three Mood Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Button
                onClick={() => handleMoodSelect('struggling')}
                className="h-32 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all"
              >
                <div className="flex flex-col items-center gap-3">
                  <span className="text-4xl">😔</span>
                  <span className="text-2xl font-bold">Struggling</span>
                </div>
              </Button>

              <Button
                onClick={() => handleMoodSelect('managing')}
                className="h-32 bg-yellow-600 hover:bg-yellow-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all"
              >
                <div className="flex flex-col items-center gap-3">
                  <span className="text-4xl">😐</span>
                  <span className="text-2xl font-bold">Managing</span>
                </div>
              </Button>

              <Button
                onClick={() => handleMoodSelect('good')}
                className="h-32 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all"
              >
                <div className="flex flex-col items-center gap-3">
                  <span className="text-4xl">😊</span>
                  <span className="text-2xl font-bold">Good</span>
                </div>
              </Button>
            </div>

            <p className="text-gray-400">Just pick one. No judgment here.</p>
          </div>
        )}

        {/* Struggling Response */}
        {showSupport && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">You're Brave for Being Here</h2>
              <p className="text-xl text-gray-300">
                It takes real courage to admit when we're struggling. You just took the first step.
              </p>
            </div>

            {/* Immediate Actions */}
            <div className="grid grid-cols-1 gap-4">
              <Button
                onClick={callSomeone}
                className="h-20 bg-green-600 hover:bg-green-700 text-white rounded-xl"
              >
                <Phone className="w-6 h-6 mr-3" />
                <span className="text-xl">Call Someone Now</span>
              </Button>

              {!breathingActive ? (
                <Button
                  onClick={() => setBreathingActive(_true)}
                  className="h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  <Wind className="w-6 h-6 mr-3" />
                  <span className="text-xl">60-Second Breathing</span>
                </Button>
              ) : (
                <div className="bg-blue-900/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {breathCount <= 4 ? "Breathe In" : 
                     breathCount <= 8 ? "Hold" : 
                     breathCount <= 12 ? "Breathe Out" : 
                     "Repeat..."}
                  </div>
                  <div className="text-lg text-gray-300">{60 - breathCount}s left</div>
                </div>
              )}

              <Button
                onClick={() => {
                  if (savedReason) {
                    alert(`Remember why you got clean:\n\n"${savedReason}"\n\nYou've come too far to give up now.`);
                  } else {
                    saveWhyIGotClean();
                  }
                }}
                className="h-20 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
              >
                <Heart className="w-6 h-6 mr-3" />
                <span className="text-xl">Why I Got Clean</span>
              </Button>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-400">You've survived 100% of your worst days.</p>
              <Button
                onClick={() => navigate('/crisis-intervention')}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                I Need More Help
              </Button>
            </div>
          </div>
        )}

        {/* Managing Response */}
        {showEncouragement && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">You're Doing The Work</h2>
              <p className="text-xl text-gray-300">
                Managing is winning. Every minute clean is a victory.
              </p>
              <div className="bg-yellow-900/30 rounded-xl p-6">
                <p className="text-lg italic">
                  "Progress, not perfection."
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Button
                onClick={() => navigate('/crisis-toolkit')}
                className="h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                <span className="text-lg">Practice a Grounding Tool</span>
              </Button>
              <Button
                onClick={() => navigate('/support')}
                className="h-16 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
              >
                <Users className="w-5 h-5 mr-2" />
                <span className="text-lg">Connect with Peers</span>
              </Button>
            </div>

            <div className="text-center">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                Back to Home
              </Button>
            </div>
          </div>
        )}

        {/* Good Response */}
        {showShareHope && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">That's Beautiful!</h2>
              <p className="text-xl text-gray-300">
                Your strength today could save someone's life tomorrow.
              </p>
              <div className="inline-flex items-center gap-2 bg-green-900/30 text-green-400 px-6 py-3 rounded-full">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">You're an inspiration</span>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-lg mb-4">
                Someone out there is struggling and needs to hear your story.
              </p>
              <Button
                onClick={() => navigate('/support')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Heart className="w-5 h-5 mr-2" />
                Share Hope with Others
              </Button>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-400">Keep doing what you're doing. It's working.</p>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckIn;
