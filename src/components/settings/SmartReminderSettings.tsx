
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mic, Clock, Zap, Phone, TrendingUp, AlertTriangle } from 'lucide-react';
import { voiceActivationService } from '@/services/voiceActivationService';
import { subscribeToCrisisEvents, subscribeToMoodUpdates, unsubscribeFromChannel } from '@/services/realtimeService';
import { UltraSecureCrisisDataService } from '@/services/ultraSecureCrisisDataService';
import { secureServerLogEvent } from '@/services/secureServerAuditLogService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { identifyVulnerableHours } from '@/utils/patternAnalysis';

export const SmartReminderSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [adaptiveReminders, setAdaptiveReminders] = useState(true);
  const [vulnerableHours, setVulnerableHours] = useState<Array<{ hour: number; probability: number }>>([]);

  useEffect(() => {
    if (user?.id && adaptiveReminders) {
      setupAdaptiveReminders();
    }
  }, [user?.id, adaptiveReminders]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to mood updates for dynamic reminders
    const moodChannel = subscribeToMoodUpdates(user.id, (payload) => {
      const newData = payload.new;
      
      if (newData.mood_rating <= 4) {
        // Schedule follow-up reminder in 2 hours
        setTimeout(() => {
          toast("How are you feeling now?", {
            description: "Your mood was low earlier. Let's check in.",
            action: {
              label: "Quick Check",
              onClick: () => navigate('/daily-checkin')
            },
            duration: 30000
          });
        }, 2 * 60 * 60 * 1000);
        
        // Log for pattern analysis
        secureServerLogEvent({
          action: 'LOW_MOOD_FOLLOWUP_SCHEDULED',
          details: {
            initial_mood: newData.mood_rating,
            scheduled_time: new Date(Date.now() + 2 * 60 * 60 * 1000)
          },
          userId: user.id
        });
      }
    });

    // Subscribe to crisis events
    const crisisChannel = subscribeToCrisisEvents(user.id, (payload) => {
      toast.warning("Crisis pattern detected", {
        description: "Your support network has been notified",
        action: {
          label: "View Tools",
          onClick: () => navigate('/crisis-toolkit')
        }
      });
    });

    return () => {
      unsubscribeFromChannel(moodChannel);
      unsubscribeFromChannel(crisisChannel);
    };
  }, [user?.id, navigate]);

  const setupAdaptiveReminders = async () => {
    if (!user?.id) return;

    try {
      // Get crisis resolution data
      const resolutions = await UltraSecureCrisisDataService.loadCrisisResolutions(user.id);
      
      // Analyze crisis timing patterns
      const vulnerableHoursList = identifyVulnerableHours(resolutions);
      setVulnerableHours(vulnerableHoursList);

      // Log adaptive reminder setup
      await secureServerLogEvent({
        action: 'ADAPTIVE_REMINDERS_CONFIGURED',
        details: {
          vulnerable_hours: vulnerableHoursList,
          crisis_count: resolutions.length
        },
        userId: user.id
      });

    } catch (error) {
      console.error('Failed to setup adaptive reminders:', error);
      toast.error('Failed to configure adaptive reminders');
    }
  };

  const toggleVoiceReminders = async (enabled: boolean) => {
    if (enabled) {
      const started = voiceActivationService.startListening({
        onCrisisDetected: () => {
          toast.error("Crisis detected! Opening support tools...", {
            duration: 10000,
            action: {
              label: "Call 988",
              onClick: () => window.location.href = 'tel:988'
            }
          });
          navigate('/crisis-toolkit');
        },
        onError: (error) => {
          toast.error(`Voice activation failed: ${error}`);
        }
      });
      
      if (started) {
        toast.success("Voice reminders activated! Say 'Hey Serenity, time to check in'");
      }
    } else {
      voiceActivationService.stopListening();
    }
    setVoiceEnabled(enabled);
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <div className="space-y-6">
      {/* Voice Activation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice-Activated Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Enable Voice Commands</p>
              <p className="text-sm text-gray-600">
                Activate check-ins and crisis support using voice commands
              </p>
            </div>
            <Switch
              checked={voiceEnabled}
              onCheckedChange={toggleVoiceReminders}
            />
          </div>
          
          {voiceEnabled && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800 font-medium mb-2">Voice commands active:</p>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• "Hey Serenity, I need help" - Crisis mode</li>
                <li>• "Serenity, time to check in" - Daily check-in</li>
                <li>• "Serenity crisis" - Emergency support</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adaptive Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Smart Adaptive Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Pattern-Based Timing</p>
              <p className="text-sm text-gray-600">
                Automatically schedule reminders based on your crisis patterns
              </p>
            </div>
            <Switch
              checked={adaptiveReminders}
              onCheckedChange={setAdaptiveReminders}
            />
          </div>

          {adaptiveReminders && vulnerableHours.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">Vulnerable hours identified:</p>
              <div className="flex flex-wrap gap-2">
                {vulnerableHours.slice(0, 3).map(({ hour, probability }) => (
                  <Badge key={hour} variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatHour(hour)} ({Math.round(probability * 100)}%)
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Preventive reminders will be sent 1 hour before these times.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice Commands Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Commands Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Crisis Commands
              </h4>
              <ul className="space-y-1 text-sm">
                <li>• "Hey Serenity, I need help"</li>
                <li>• "Serenity crisis"</li>
                <li>• "Emergency help"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Check-in Commands
              </h4>
              <ul className="space-y-1 text-sm">
                <li>• "Serenity, time to check in"</li>
                <li>• "Serenity help me"</li>
                <li>• "Hey Serenity i need help"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
