
import React from 'react';
import { EnhancedCrisisToolkit } from '@/components/crisis/EnhancedCrisisToolkit';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { useOfflineCrisisData } from '@/hooks/useOfflineCrisisData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Shield, Phone } from 'lucide-react';

const CrisisToolkit: React.FC = () => {
  const crisisSystem = useCrisisSystem();
  const offlineData = useOfflineCrisisData();
  
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[#1E3A8A]">Crisis Support Toolkit</h1>
        <p className="text-gray-600">Immediate tools and resources for crisis support</p>
      </div>

      {!offlineData.isOnline && (
        <Alert className="border-amber-500 bg-amber-50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're offline. All crisis tools are still available and will sync when you reconnect.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Access Emergency */}
        <Card className="border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Emergency Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center space-y-2">
              <p className="font-semibold text-red-800">Crisis Hotlines</p>
              <p className="text-sm">• 988 Suicide & Crisis Lifeline</p>
              <p className="text-sm">• Text HOME to 741741</p>
              <p className="text-sm">• 911 for emergencies</p>
            </div>
          </CardContent>
        </Card>

        {/* Voice Activation Status */}
        <Card className={`border-2 ${crisisSystem.voiceListening ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Voice Protection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className={`w-4 h-4 rounded-full mx-auto ${crisisSystem.voiceListening ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <p className="text-sm">
                {crisisSystem.voiceListening ? 'Listening for crisis words' : 'Voice activation off'}
              </p>
              <p className="text-xs text-gray-600">
                Say "Help me" or "Crisis" to activate
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Crisis Event Status */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Crisis Events: {offlineData.crisisResolutions.length}</p>
              <p className="text-sm text-gray-600">Follow-ups: {offlineData.followUpTasks.filter(t => !t.completed).length}</p>
              <p className="text-sm text-gray-600">Check-ins: {offlineData.checkInResponses.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Crisis Toolkit */}
      <EnhancedCrisisToolkit 
        isOffline={!offlineData.isOnline}
        moodScore={5} // Could get from latest check-in
      />

      {/* Crisis Resolution History */}
      {offlineData.crisisResolutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Crisis Resolutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {offlineData.crisisResolutions.slice(0, 3).map((resolution) => (
                <div key={resolution.id} className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="text-sm font-medium">
                    {new Date(resolution.crisis_start_time).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    Interventions: {resolution.interventions_used?.join(', ') || 'None listed'}
                  </p>
                  {resolution.effectiveness_rating && (
                    <p className="text-xs text-gray-600">
                      Effectiveness: {resolution.effectiveness_rating}/10
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CrisisToolkit;
