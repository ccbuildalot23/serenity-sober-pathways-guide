import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  MessageCircle,
  Wind,
  Heart,
  Headphones,
  Users
} from 'lucide-react';

const CrisisInterventionSystem: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [breathingActive, setBreathingActive] = useState(_false);
  const [breathCount, setBreathCount] = useState(0);
  const [groundingStep, setGroundingStep] = useState(0);
  const [sponsorNumber, setSponsorNumber] = useState('');

  useEffect(() => {
    // Load sponsor number from localStorage
    const _saved = localStorage.getItem('sponsor_number');
    if (_saved) setSponsorNumber(_saved);
  }, []);

  // Breathing exercise timer
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

  // Immediate 988 call
  const call988Lifeline = () => {
    window.location.href = 'tel:988';
    // Log as moment of strength
    logMomentOfStrength('reached_out_for_help');
  };

  // Text sponsor with pre-filled message
  const textSponsor = () => {
    const message = "I'm struggling right now and could use some support. This is an automated message from my recovery app.";
    if (sponsorNumber) {
      window.open(`sms:${sponsorNumber}?body=${encodeURIComponent(message)}`, '_self');
    } else {
      // Prompt to add sponsor number
      const number = prompt("Enter your sponsor's phone number:");
      if (number) {
        localStorage.setItem('sponsor_number', number);
        setSponsorNumber(number);
        window.open(`sms:${number}?body=${encodeURIComponent(message)}`, '_self');
      }
    }
  };

  // Start breathing exercise
  const startBreathing = () => {
    setBreathingActive(_true);
    setBreathCount(0);
  };

  // 54321 Grounding technique
  const groundingMessages = [
    "Look around. Name 5 things you can see right now.",
    "Listen carefully. Name 4 things you can hear.",
    "Touch something near you. Name 3 things you can feel.",
    "Take a deep breath. Name 2 things you can smell.",
    "Focus inward. Name 1 thing you can taste.",
    "You did it. You're here. You're safe. You're strong."
  ];

  // Log moment of strength instead of crisis
  const logMomentOfStrength = async (action: string) => {
    try {
      await supabase
        .from('moments_of_strength')
        .insert({
          user_id: user?.id,
          _action_taken: action,
          _created_at: new Date().toISOString()
        });
    } catch (_error) {
      console._error('Error logging moment:', _error);
    }
  };

  // Play recovery story
  const playRecoveryStory = () => {
    // In MVP, this opens a YouTube playlist or similar
    window.open('https://www.youtube.com/results?search_query=na+recovery+speaker+story', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="text-gray-400 hover:text-white"
        >
          ← Back to Safety
        </Button>

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">You're Being So Brave Right Now</h1>
          <p className="text-xl text-gray-300">Asking for help is strength, not weakness</p>
        </div>

        {/* HUGE 988 Button */}
        <div className="bg-red-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
          <Button 
            onClick={call988Lifeline}
            className="w-full h-32 bg-white hover:bg-gray-100 text-red-600 rounded-2xl"
          >
            <div className="flex flex-col items-center gap-3">
              <Phone className="w-16 h-16" />
              <div>
                <div className="text-4xl font-bold">CALL 988 NOW</div>
                <div className="text-lg">Free • Confidential • 24/7</div>
              </div>
            </div>
          </Button>
        </div>

        {/* Immediate Relief Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Text Your Sponsor */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <Button
              onClick={textSponsor}
              className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <div className="flex items-center gap-4">
                <MessageCircle className="w-8 h-8" />
                <div className="text-left">
                  <div className="text-xl font-semibold">Text Your Sponsor</div>
                  <div className="text-sm opacity-90">Pre-written message ready</div>
                </div>
              </div>
            </Button>
          </div>

          {/* Other Crisis Lines */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="space-y-3">
              <Button
                onClick={() => window.open('sms:741741?body=HOME', '_self')}
                variant="outline"
                className="w-full h-16 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <MessageCircle className="w-5 h-5 mr-3" />
                Text HOME to 741741
              </Button>
              <Button
                onClick={() => window.location.href = 'tel:1-800-662-4357'}
                variant="outline"
                className="w-full h-16 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Phone className="w-5 h-5 mr-3" />
                SAMHSA: 1-800-662-4357
              </Button>
            </div>
          </div>
        </div>

        {/* Breathing Exercise */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-center">60-Second Breathing</h2>
          {!breathingActive ? (
            <Button
              onClick={startBreathing}
              className="w-full h-16 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur"
            >
              <Wind className="w-6 h-6 mr-3" />
              Start Breathing Exercise
            </Button>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-blue-400">
                {breathCount <= 4 ? "Breathe In" : 
                 breathCount <= 8 ? "Hold" : 
                 breathCount <= 12 ? "Breathe Out" : 
                 "Repeat..."}
              </div>
              <div className="text-2xl text-gray-300">{60 - breathCount} seconds left</div>
              <Button
                onClick={() => setBreathingActive(_false)}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                Stop
              </Button>
            </div>
          )}
        </div>

        {/* 54321 Grounding */}
        <div className="bg-green-900/20 rounded-2xl p-8 border border-green-800/50">
          <h2 className="text-2xl font-bold mb-6 text-center">Ground Yourself (54321)</h2>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-xl p-6 text-center">
              <p className="text-xl mb-4">{groundingMessages[groundingStep]}</p>
              <div className="flex gap-3 justify-center">
                {groundingStep > 0 && (
                  <Button
                    onClick={() => setGroundingStep(groundingStep - 1)}
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    Previous
                  </Button>
                )}
                {groundingStep < groundingMessages.length - 1 ? (
                  <Button
                    onClick={() => setGroundingStep(groundingStep + 1)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Next Step
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
        </div>

        {/* Play Recovery Story */}
        <div className="bg-purple-900/20 rounded-2xl p-8 border border-purple-800/50">
          <Button
            onClick={playRecoveryStory}
            className="w-full h-20 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
          >
            <div className="flex items-center gap-4">
              <Headphones className="w-8 h-8" />
              <div className="text-left">
                <div className="text-xl font-semibold">Play Recovery Story</div>
                <div className="text-sm opacity-90">Listen to someone who made it through</div>
              </div>
            </div>
          </Button>
        </div>

        {/* Connect with Peers */}
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
          <h2 className="text-2xl font-bold mb-4">You're Not Alone</h2>
          <p className="text-gray-300 mb-6">
            Thousands of us have felt exactly what you're feeling right now. We made it through, and so will you.
          </p>
          <Button
            onClick={() => navigate('/support')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Users className="w-5 h-5 mr-2" />
            Talk to Someone Who Gets It
          </Button>
        </div>

        {/* Footer Message */}
        <div className="text-center text-gray-400 py-8">
          <p className="text-lg">This feeling will pass. You are stronger than you know.</p>
          <p className="text-sm mt-2">Available 24/7. Your privacy is sacred to us.</p>
        </div>
      </div>
    </div>
  );
}

export default CrisisInterventionSystem;