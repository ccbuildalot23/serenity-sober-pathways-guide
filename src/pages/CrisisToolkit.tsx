import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wind, Heart, ArrowLeft, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CrisisToolkit: React.FC = () => {
  const navigate = useNavigate();
  const [breathingActive, setBreathingActive] = useState(_false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const [groundingStep, setGroundingStep] = useState(0);
  const [playingTape, setPlayingTape] = useState(_false);
  const [bodyScanStep, setBodyScanStep] = useState(0);

  // Auto-breathing animation
  useEffect(() => {
    if (breathingActive) {
      const _interval = setInterval(() => {
        setBreathCount(prev => {
          const next = (prev + 1) % 12;
          if (next < 4) setBreathPhase('inhale');
          else if (next < 8) setBreathPhase('hold');
          else setBreathPhase('exhale');
          return next;
        });
      }, 1000);
      return () => clearInterval(_interval);
    }
  }, [breathingActive]);

  const groundingPrompts = [
    "5 things you can SEE - Look around right now. Name them out loud.",
    "4 things you can TOUCH - Feel them with your hands. Notice the texture.",
    "3 things you can HEAR - Listen carefully. Even small sounds count.",
    "2 things you can SMELL - Take a deep breath. What do you notice?",
    "1 thing you can TASTE - Focus on your mouth. Maybe it's just your own mouth.",
    "You did it. You're here. You're safe. This moment will pass."
  ];

  const bodyScanPrompts = [
    "Close your eyes. Notice where the craving lives in your body.",
    "Put your hand on that spot. Breathe into it slowly.",
    "Picture the craving as a wave. It rises, peaks, and falls.",
    "You don't have to fight it. Just watch it like a cloud passing.",
    "Remember: Cravings last 15-20 minutes max. You've got this.",
    "The craving passed. You survived. You're stronger than you know."
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Emergency Toolkit</h1>
            <p className="text-xl text-gray-300">
              Works offline. No thinking required. Just follow along.
            </p>
          </div>
        </div>

        {/* Auto-Playing Breathing */}
        <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-2xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Automatic Breathing</h2>
          {!breathingActive ? (
            <Button
              onClick={() => setBreathingActive(_true)}
              className="w-full h-20 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur"
            >
              <Wind className="w-8 h-8 mr-3" />
              <span className="text-2xl">Start Auto-Breathing</span>
            </Button>
          ) : (
            <div className="text-center space-y-6">
              <div className="relative w-48 h-48 mx-auto">
                <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                  breathPhase === 'inhale' ? 'bg-blue-500 scale-125' :
                  breathPhase === 'hold' ? 'bg-purple-500 scale-110' :
                  'bg-green-500 scale-95'
                }`} style={{ opacity: 0.3 }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold capitalize">{breathPhase}</div>
                    <div className="text-2xl mt-2">4 seconds</div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setBreathingActive(_false)}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                <Pause className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>
          )}
        </div>

        {/* 54321 Grounding */}
        <div className="bg-green-900/20 rounded-2xl p-8 mb-6 border border-green-800/50">
          <h2 className="text-2xl font-bold mb-6 text-center">54321 Grounding</h2>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <p className="text-xl mb-6 text-center">{groundingPrompts[groundingStep]}</p>
            <div className="flex gap-3 justify-center">
              {groundingStep > 0 && (
                <Button
                  onClick={() => setGroundingStep(groundingStep - 1)}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  Back
                </Button>
              )}
              {groundingStep < groundingPrompts.length - 1 ? (
                <Button
                  onClick={() => setGroundingStep(groundingStep + 1)}
                  className="bg-green-600 hover:bg-green-700 px-8"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => setGroundingStep(0)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Over
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Play the Tape */}
        <div className="bg-red-900/20 rounded-2xl p-8 mb-6 border border-red-800/50">
          <h2 className="text-2xl font-bold mb-6 text-center">Play the Tape Forward</h2>
          {!playingTape ? (
            <div className="text-center space-y-4">
              <p className="text-gray-300">What happens if you use? Let's think it through together.</p>
              <Button
                onClick={() => setPlayingTape(_true)}
                className="bg-red-600 hover:bg-red-700 px-8 py-4"
              >
                <Play className="w-5 h-5 mr-2" />
                Play It Out
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-lg mb-2">If I use right now...</p>
                <p className="text-gray-300">The high lasts maybe an hour. Then what?</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-300">The shame hits. The people I'll hurt. The progress I'll lose.</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-300">Tomorrow I wake up and have to start over at Day 0.</p>
              </div>
              <div className="bg-green-800/30 rounded-lg p-4">
                <p className="text-green-400 font-semibold">But if I don't use... Tomorrow I wake up proud.</p>
              </div>
              <Button
                onClick={() => setPlayingTape(_false)}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                Close
              </Button>
            </div>
          )}
        </div>

        {/* Body Scan for Cravings */}
        <div className="bg-purple-900/20 rounded-2xl p-8 mb-6 border border-purple-800/50">
          <h2 className="text-2xl font-bold mb-6 text-center">Body Scan for Cravings</h2>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <p className="text-xl mb-6 text-center">{bodyScanPrompts[bodyScanStep]}</p>
            <div className="flex gap-3 justify-center">
              {bodyScanStep > 0 && (
                <Button
                  onClick={() => setBodyScanStep(bodyScanStep - 1)}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  Back
                </Button>
              )}
              {bodyScanStep < bodyScanPrompts.length - 1 ? (
                <Button
                  onClick={() => setBodyScanStep(bodyScanStep + 1)}
                  className="bg-purple-600 hover:bg-purple-700 px-8"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => setBodyScanStep(0)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Over
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => window.location.href = 'tel:988'}
            className="h-16 bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            🆘 Call 988
          </Button>
          <Button
            onClick={() => navigate('/crisis-intervention')}
            className="h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <Heart className="w-5 h-5 mr-2" />
            More Help
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-400">
          <p className="text-lg">These tools work offline. Screenshot them if needed.</p>
          <p className="mt-2">You're going to be okay. One breath at a time.</p>
        </div>
      </div>
    </div>
  );
};

export default CrisisToolkit;
