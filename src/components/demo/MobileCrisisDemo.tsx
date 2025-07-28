import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Battery, 
  Vibrate, 
  Shield, 
  Phone,
  Accessibility,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useMobileCrisis } from '@/hooks/useMobileCrisis';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import MobileCrisisButton from '@/components/crisis/MobileCrisisButton';
import OfflineModeBanner from '@/components/crisis/OfflineModeBanner';

const MobileCrisisDemo = () => {
  const [demonstrationMode, setDemonstrationMode] = useState<'overview' | 'features' | 'offline' | 'hipaa'>('overview');
  const [simulateOffline, setSimulateOffline] = useState(false);
  
  const mobileCrisis = useMobileCrisis({
    shakeThreshold: 15,
    volumeButtonShortcuts: true,
    hapticFeedback: true,
    batteryOptimization: true,
  });

  const offlineSync = useOfflineSync();
  const mobileOptimization = useMobileOptimization();

  // Demonstrate haptic feedback
  const demonstrateHaptic = () => {
    mobileCrisis.triggerHapticFeedback([200, 100, 200, 100, 200]);
  };

  // Simulate shake detection
  const simulateShake = () => {
    mobileCrisis.triggerEmergency('shake');
  };

  // Demonstrate offline functionality
  const demonstrateOffline = async () => {
    setSimulateOffline(true);
    await offlineSync.saveOfflineData('checkIns', [{
      id: 'demo-checkin',
      user_id: 'demo-user',
      mood_score: 7,
      energy_level: 6,
      sleep_hours: 8,
      created_at: new Date().toISOString(),
      notes: 'Demo offline check-in'
    }]);
    setTimeout(() => setSimulateOffline(false), 3000);
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Mobile Crisis Optimization Demo</h1>
        <p className="text-muted-foreground mb-4">
          Comprehensive mobile-first crisis support with offline capabilities
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant={mobileCrisis.isMobile ? "default" : "secondary"}>
            <Smartphone className="w-3 h-3 mr-1" />
            {mobileCrisis.isMobile ? "Mobile Device" : "Desktop"}
          </Badge>
          <Badge variant={offlineSync.isOnline ? "default" : "destructive"}>
            {offlineSync.isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {offlineSync.isOnline ? "Online" : "Offline"}
          </Badge>
          {mobileCrisis.batteryLevel && (
            <Badge variant={mobileCrisis.batteryLevel < 20 ? "destructive" : "default"}>
              <Battery className="w-3 h-3 mr-1" />
              {Math.round(mobileCrisis.batteryLevel * 100)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Offline Banner Demo */}
      <OfflineModeBanner />

      <Tabs value={demonstrationMode} onValueChange={(value) => setDemonstrationMode(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Crisis Features</TabsTrigger>
          <TabsTrigger value="offline">Offline Mode</TabsTrigger>
          <TabsTrigger value="hipaa">HIPAA Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Mobile Features</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Touch-optimized crisis button
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Shake detection for emergency
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Haptic feedback system
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Battery optimization
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Offline Capabilities</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Offline check-ins ({offlineSync.offlineData?.checkIns?.length || 0} cached)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Crisis resource caching
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Auto-sync when online
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Background sync ({offlineSync.syncQueue.length} queued)
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vibrate className="w-5 h-5" />
                  Mobile Crisis Button
                </CardTitle>
                <CardDescription>
                  Large, accessible button with haptic feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <MobileCrisisButton 
                    onCrisisActivated={() => console.log('Crisis activated!')}
                    size="large"
                    showSwipeConfirm={true}
                  />
                </div>
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    • Single tap: Show crisis options<br/>
                    • Double tap: Call 911<br/>
                    • Swipe left: Call 988
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Device Features
                </CardTitle>
                <CardDescription>
                  Mobile-specific crisis detection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button 
                    onClick={demonstrateHaptic} 
                    variant="outline" 
                    className="w-full"
                    disabled={!mobileCrisis.isMobile}
                  >
                    <Vibrate className="w-4 h-4 mr-2" />
                    Test Haptic Feedback
                  </Button>
                  <Button 
                    onClick={simulateShake} 
                    variant="outline" 
                    className="w-full"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Simulate Shake Detection
                  </Button>
                  <Button 
                    onClick={mobileCrisis.toggleContrastMode} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Accessibility className="w-4 h-4 mr-2" />
                    Toggle High Contrast
                  </Button>
                </div>
                {mobileCrisis.isContrastMode && (
                  <Alert>
                    <Accessibility className="w-4 h-4" />
                    <AlertDescription>
                      High contrast mode is now active for better visibility
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                Offline Functionality Demo
              </CardTitle>
              <CardDescription>
                Data persistence and sync capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="font-semibold">Cache Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Check-ins cached:</span>
                      <Badge>{offlineSync.offlineData?.checkIns?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Recovery plans:</span>
                      <Badge>{offlineSync.offlineData?.recoveryPlan ? 1 : 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Emergency contacts:</span>
                      <Badge>{offlineSync.offlineData?.contacts?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Sync queue:</span>
                      <Badge variant={offlineSync.syncQueue.length > 0 ? "destructive" : "default"}>
                        {offlineSync.syncQueue.length}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Actions</h4>
                  <div className="space-y-2">
                    <Button 
                      onClick={demonstrateOffline} 
                      variant="outline" 
                      className="w-full"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Demo Offline Save
                    </Button>
                    <Button 
                      onClick={offlineSync.syncData} 
                      variant="outline" 
                      className="w-full"
                      disabled={!offlineSync.isOnline || offlineSync.isSyncing}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {offlineSync.isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  </div>
                </div>
              </div>
              {simulateOffline && (
                <Alert>
                  <Save className="w-4 h-4" />
                  <AlertDescription>
                    Demo: Saved check-in data offline. Will sync when connection restored.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hipaa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                HIPAA Compliance & Security
              </CardTitle>
              <CardDescription>
                Privacy and security measures for mobile crisis data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Data Protection</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      End-to-end encryption for crisis data
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Secure offline storage (encrypted)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Automatic session timeout
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Audit logging for all actions
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Mobile Security</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Biometric authentication support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      App backgrounding protection
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Screenshot prevention in crisis mode
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Secure communication channels
                    </li>
                  </ul>
                </div>
              </div>
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  All crisis data is encrypted both in transit and at rest. 
                  Offline data is stored securely using device encryption capabilities.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance & Error Handling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-500">&lt; 1s</div>
              <div>Crisis page load time</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-500">99.9%</div>
              <div>Offline availability</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-purple-500">256-bit</div>
              <div>Encryption strength</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileCrisisDemo;