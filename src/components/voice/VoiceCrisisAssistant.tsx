import React, { useEffect, useState } from 'react';
import { AlertTriangle, Phone, MessageSquare, Heart, Mic, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmergencyResource {
  name: string;
  phone: string;
  description: string;
}

interface CrisisAnalysis {
  crisisLevel: 'low' | 'medium' | 'high' | 'critical';
  emotionalState: string;
  immediateRisk: boolean;
  escalateToHuman: boolean;
}

interface VoiceCrisisResponse {
  analysis: CrisisAnalysis;
  response: {
    audioContent: string;
    text: string;
    recommendedActions: string[];
  };
  emergencyResources: EmergencyResource[];
}

const VoiceCrisisAssistant: React.FC = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(_false);
  const [response, setResponse] = useState<VoiceCrisisResponse | _null>(_null);
  const [isProcessing, setIsProcessing] = useState(_false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | _null>(_null);

  const voiceRecording = useVoiceRecording({
    maxDuration: 120, // 2 minutes for crisis situations
    onStart: () => {
      toast.info('Crisis assistant listening', { 
        description: 'Speak freely about what you\'re experiencing' 
      });
    },
    onStop: () => {
      setIsProcessing(_true);
    },
    onError: (error) => {
      toast.error('Voice recording failed', { description: error });
      setIsActive(_false);
    },
    onTranscription: async (_transcript) => {
      await processCrisisInput(_transcript);
    }
  });

  const processCrisisInput = async (_transcript: string) => {
    if (!user?.id) return;

    try {
      // Get user location if available
      let location: { lat: number; lng: number } | undefined;
      try {
        const position = await new Promise<GeolocationPosition>((_resolve, _reject) => {
          navigator.geolocation.getCurrentPosition(_resolve, _reject, { timeout: 5000 });
        });
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch (_locationError) {
        console.log('Location not available:', _locationError);
      }

      // Send to voice crisis assistant
      const { data, error } = await supabase.functions.invoke('voice-crisis-assistant', {
        body: {
          userId: user.id,
          _transcript,
          location
        }
      });

      if (error) throw error;

      setResponse(data);
      
      // Play the supportive audio response
      if (data.response.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.response.audioContent}`);
        setCurrentAudio(audio);
        
        audio.onended = () => {
          setCurrentAudio(_null);
        };
        
        await audio.play();
      }

      // Show success message
      toast.success('Crisis support activated', {
        description: 'AI assistant is providing immediate support'
      });

    } catch (error) {
      console.error('Crisis processing error:', error);
      toast.error('Crisis processing failed', {
        description: 'Please contact emergency services directly'
      });
    } finally {
      setIsProcessing(_false);
    }
  };

  const activateCrisisAssistant = () => {
    setIsActive(_true);
    setResponse(_null);
    voiceRecording.startRecording();
  };

  const deactivateCrisisAssistant = () => {
    setIsActive(_false);
    voiceRecording.stopRecording();
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(_null);
    }
  };

  const callEmergency = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const getCrisisLevelColor = (_level: string) => {
    switch (_level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Emergency activation via keyboard shortcut
  useEffect(() => {
    const _handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl + Shift + H for Help
      if (event.ctrlKey && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        if (!isActive) {
          activateCrisisAssistant();
        }
      }
    };

    document.addEventListener('keydown', _handleKeyPress);
    return () => document.removeEventListener('keydown', _handleKeyPress);
  }, [isActive]);

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Heart className="h-5 w-5" />
          Voice Crisis Assistant
        </CardTitle>
        <CardDescription className="text-orange-700">
          24/7 AI-powered voice support for crisis situations. Press Ctrl+Shift+H for quick access.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Activation Button */}
        {!isActive ? (
          <Button 
            onClick={activateCrisisAssistant}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            size="lg"
          >
            <Mic className="h-5 w-5 mr-2" />
            Activate Crisis Assistant
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="destructive" className="animate-pulse">
                Crisis Assistant Active
              </Badge>
              <Button 
                onClick={deactivateCrisisAssistant}
                variant="outline"
                size="sm"
              >
                Deactivate
              </Button>
            </div>

            {voiceRecording.isRecording && (
              <Alert>
                <Mic className="h-4 w-4" />
                <AlertDescription>
                  I'm listening. Please tell me how you're feeling and what you're experiencing.
                </AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <Alert>
                <Volume2 className="h-4 w-4" />
                <AlertDescription>
                  Processing your input and preparing supportive response...
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="space-y-4">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-blue-800">Crisis Analysis</CardTitle>
                  <Badge variant={getCrisisLevelColor(response.analysis.crisisLevel)}>
                    {response.analysis.crisisLevel.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Emotional State:</strong> {response.analysis.emotionalState}
                </p>
                
                {response.analysis.immediateRisk && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                      Immediate risk detected. Please consider contacting emergency services.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="mt-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">AI Response:</p>
                  <p className="text-sm text-blue-700 italic">
                    "{response.response.text}"
                  </p>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">Recommended Actions:</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {response.response.recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Resources */}
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Emergency Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {response.emergencyResources.map((resource, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                      <div>
                        <p className="font-medium text-red-800">{resource.name}</p>
                        <p className="text-sm text-red-600">{resource.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => callEmergency(resource.phone)}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        {resource.phone}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Emergency Access */}
        <div className="pt-2 border-t border-orange-200">
          <p className="text-xs text-orange-600 mb-2">Quick Emergency Contact:</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => callEmergency('911')}
              className="flex-1"
            >
              <Phone className="h-3 w-3 mr-1" />
              911
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => callEmergency('988')}
              className="flex-1"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              988
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceCrisisAssistant;