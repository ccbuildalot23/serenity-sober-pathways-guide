
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CheckInCelebrationProps {
  onStartMindfulness?: () => void;
  onClose?: () => void;
}

const CheckInCelebration: React.FC<CheckInCelebrationProps> = ({ 
  onStartMindfulness, 
  onClose 
}) => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(1);
  const [affirmation, setAffirmation] = useState("You showed up today. That's strength in action. One step at a time.");

  useEffect(() => {
    // Trigger celebration effects
    triggerCelebration();
    updateStreak();
  }, []);

  const triggerCelebration = () => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([60, 30, 60]);
    }

    // Confetti effect
    if (window.confetti) {
      window.confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#1E3A8A', '#ffffff']
      });
    }

    // Success sound (create a simple beep with Web Audio API)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const updateStreak = async () => {
    if (!user) return;

    try {
      // Get current streak from recovery data
      const { data: recoveryData } = await supabase
        .rpc('get_recovery_streak', { user_uuid: user.id });

      if (recoveryData && typeof recoveryData === 'object' && recoveryData !== null) {
        const streakData = recoveryData as { current_streak_days?: number };
        const currentStreak = streakData.current_streak_days || 1;
        setStreak(currentStreak);
        
        const affirmations: { [key: number]: string } = {
          1: "Day one is powerful. You started.",
          3: "You're gaining momentum. Keep going.",
          5: "You're showing consistency. That's healing.",
          7: "One week strong. You're building something real.",
          10: "Double digits. Let that strength sink in.",
          14: "Two weeks of showing up. You're unstoppable.",
          21: "Three weeks of commitment. You're transforming.",
          30: "One month strong. This is who you are now."
        };

        const message = affirmations[currentStreak] || "Keep stacking those wins. You matter.";
        setAffirmation(message);
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 animate-scale-in">
        <CardContent className="text-center p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-green-600 mb-2 animate-gentle-pulse">
              🌿 Check-in complete!
            </h2>
            
            <p className="text-base text-[#1E3A8A] mb-4 leading-relaxed">
              {affirmation}
            </p>
            
            <div className="bg-white/70 rounded-lg p-4 mb-6">
              <p className="text-sm text-[#1E3A8A] mb-2">
                Your current streak:
              </p>
              <span className="text-2xl font-bold text-green-600">
                🌞 {streak} day{streak !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={onStartMindfulness}
              className="w-full bg-[#1E3A8A] hover:bg-[#1E40AF] text-white rounded-full py-3 font-semibold"
            >
              Start a Mindfulness Exercise
            </Button>
            
            <Button 
              variant="outline"
              onClick={onClose}
              className="w-full rounded-full py-3"
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckInCelebration;
