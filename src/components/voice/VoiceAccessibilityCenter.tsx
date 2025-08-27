import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Volume2, Heart, MessageCircle } from 'lucide-react';
import VoiceInterface from '@/components/voice/VoiceInterface';
import VoiceCrisisAssistant from '@/components/voice/VoiceCrisisAssistant';
import logger from '../../services/loggerService';

const VoiceAccessibilityCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('interface');

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Volume2 className="h-6 w-6" />
            Voice & Accessibility Center
          </CardTitle>
          <CardDescription className="text-blue-700">
            Use voice features for hands-free interaction and emergency support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="text-center">
              <Mic className="w-6 h-6 mx-auto text-blue-600 mb-1" />
              <div className="text-lg font-bold text-blue-800">Voice Input</div>
              <div className="text-xs text-blue-600">Hands-free posting</div>
            </div>
            <div className="text-center">
              <Volume2 className="w-6 h-6 mx-auto text-green-600 mb-1" />
              <div className="text-lg font-bold text-green-800">Text-to-Speech</div>
              <div className="text-xs text-green-600">Audio accessibility</div>
            </div>
            <div className="text-center">
              <Heart className="w-6 h-6 mx-auto text-red-600 mb-1" />
              <div className="text-lg font-bold text-red-800">Crisis Support</div>
              <div className="text-xs text-red-600">Emergency assistance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Features Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="interface" className="flex-1">
            <MessageCircle className="h-4 w-4 mr-2" />
            Voice Interface
          </TabsTrigger>
          <TabsTrigger value="crisis" className="flex-1">
            <Heart className="h-4 w-4 mr-2" />
            Crisis Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interface" className="space-y-4">
          <VoiceInterface
            placeholder="Your voice input will appear here. Use this for creating posts, _replies, or any text input."
            showTextToSpeech={true}
            onTextGenerated={(text) => {
              logger.debug('Generated text:', text, { component: 'VoiceAccessibilityCenter' });
              // This can be used to populate forms or trigger actions
            }}
          />

          {/* Voice Commands Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Voice Commands</CardTitle>
              <CardDescription>
                Available voice commands for navigation and interaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium">"Go to dashboard"</p>
                  <p className="text-muted-foreground">Navigate to main dashboard</p>
                </div>
                <div>
                  <p className="font-medium">"Create new post"</p>
                  <p className="text-muted-foreground">Start creating a forum post</p>
                </div>
                <div>
                  <p className="font-medium">"Read this aloud"</p>
                  <p className="text-muted-foreground">Use text-to-speech for content</p>
                </div>
                <div>
                  <p className="font-medium">"Help me"</p>
                  <p className="text-muted-foreground">Activate crisis assistant</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crisis" className="space-y-4">
          <VoiceCrisisAssistant />

          {/* Crisis Information */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-sm text-amber-800">How Crisis Support Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-700 space-y-2">
              <p>
                <strong>1. Voice Activation:</strong> Click "Activate Crisis Assistant" or press Ctrl+Shift+H
              </p>
              <p>
                <strong>2. AI Analysis:</strong> Speak freely about your situation. AI analyzes crisis level and emotional state
              </p>
              <p>
                <strong>3. Immediate Response:</strong> Receive supportive audio response and recommended actions
              </p>
              <p>
                <strong>4. Emergency Escalation:</strong> High-risk situations automatically alert support networks
              </p>
              <p>
                <strong>5. Resource Access:</strong> Instant access to crisis hotlines and emergency services
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VoiceAccessibilityCenter;