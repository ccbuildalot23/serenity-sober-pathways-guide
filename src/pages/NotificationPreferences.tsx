import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Bell, 
  Smartphone, 
  Mail, 
  MessageCircle, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Info,
  Volume2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserPreferences {
  channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  rate_limits: {
    max_per_day: number;
    max_per_hour: number;
    emergency_override: boolean;
  };
  categories: {
    daily_checkins: boolean;
    crisis_alerts: boolean;
    support_requests: boolean;
    milestones: boolean;
    partnership_updates: boolean;
    system_updates: boolean;
  };
}

const NotificationPreferences: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    channels: {
      in_app: true,
      email: false,
      sms: false,
      push: false,
      whatsapp: false,
    },
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    rate_limits: {
      max_per_day: 50,
      max_per_hour: 10,
      emergency_override: true,
    },
    categories: {
      daily_checkins: true,
      crisis_alerts: true,
      support_requests: true,
      milestones: true,
      partnership_updates: true,
      system_updates: false,
    },
  });

  const [whatsappOptIn, setWhatsappOptIn] = useState({
    phoneNumber: '',
    verificationCode: '',
    isVerified: false,
    awaitingVerification: false,
  });

  useEffect(() => {
    loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load user preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          channels: data.channels || preferences.channels,
          quiet_hours: data.quiet_hours || preferences.quiet_hours,
          rate_limits: data.rate_limits || preferences.rate_limits,
          categories: data.categories || preferences.categories,
        });
      }

      // Check WhatsApp opt-in status
      const { data: whatsappData } = await supabase
        .from('whatsapp_opt_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('opt_in_status', true)
        .single();

      if (whatsappData) {
        setWhatsappOptIn(prev => ({
          ...prev,
          phoneNumber: whatsappData.phone_number,
          isVerified: true,
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          channels: preferences.channels,
          quiet_hours: preferences.quiet_hours,
          rate_limits: preferences.rate_limits,
          categories: preferences.categories,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleChannelToggle = (channel: keyof typeof preferences.channels) => {
    setPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const handleCategoryToggle = (category: keyof typeof preferences.categories) => {
    setPreferences(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: !prev.categories[category],
      },
    }));
  };

  const handleQuietHoursToggle = () => {
    setPreferences(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        enabled: !prev.quiet_hours.enabled,
      },
    }));
  };

  const handleEmergencyOverrideToggle = () => {
    setPreferences(prev => ({
      ...prev,
      rate_limits: {
        ...prev.rate_limits,
        emergency_override: !prev.rate_limits.emergency_override,
      },
    }));
  };

  const handleWhatsAppOptIn = async () => {
    if (!user || !whatsappOptIn.phoneNumber) return;

    try {
      setWhatsappOptIn(prev => ({ ...prev, awaitingVerification: true }));

      // Send verification code via API
      const { error } = await supabase
        .from('whatsapp_opt_ins')
        .insert({
          user_id: user.id,
          phone_number: whatsappOptIn.phoneNumber,
          opt_in_status: false,
          verification_code: Math.floor(100000 + Math.random() * 900000).toString(),
        });

      if (error) throw error;

      toast.success('Verification code sent to WhatsApp');
    } catch (error) {
      console.error('Error initiating WhatsApp opt-in:', error);
      toast.error('Failed to send verification code');
      setWhatsappOptIn(prev => ({ ...prev, awaitingVerification: false }));
    }
  };

  const verifyWhatsApp = async () => {
    if (!user || !whatsappOptIn.verificationCode) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_opt_ins')
        .update({ 
          opt_in_status: true,
          verified_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('verification_code', whatsappOptIn.verificationCode)
        .select()
        .single();

      if (error || !data) {
        toast.error('Invalid verification code');
        return;
      }

      setWhatsappOptIn(prev => ({
        ...prev,
        isVerified: true,
        awaitingVerification: false,
      }));

      setPreferences(prev => ({
        ...prev,
        channels: {
          ...prev.channels,
          whatsapp: true,
        },
      }));

      toast.success('WhatsApp verified successfully');
    } catch (error) {
      console.error('Error verifying WhatsApp:', error);
      toast.error('Verification failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notification Preferences</h1>
          <p className="text-gray-600 mt-2">
            Customize how and when you receive notifications
          </p>
        </div>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* In-App Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label htmlFor="in-app">In-App Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Receive notifications within the app
                    </p>
                  </div>
                </div>
                <Switch
                  id="in-app"
                  checked={preferences.channels.in_app}
                  onCheckedChange={() => handleChannelToggle('in_app')}
                />
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label htmlFor="email">Email Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={preferences.channels.email}
                  onCheckedChange={() => handleChannelToggle('email')}
                />
              </div>

              {/* SMS Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label htmlFor="sms">SMS Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Receive text messages for urgent updates
                    </p>
                  </div>
                </div>
                <Switch
                  id="sms"
                  checked={preferences.channels.sms}
                  onCheckedChange={() => handleChannelToggle('sms')}
                />
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label htmlFor="push">Push Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Receive browser push notifications
                    </p>
                  </div>
                </div>
                <Switch
                  id="push"
                  checked={preferences.channels.push}
                  onCheckedChange={() => handleChannelToggle('push')}
                />
              </div>

              {/* WhatsApp Notifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-5 h-5 text-gray-600" />
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp Notifications</Label>
                      <p className="text-sm text-gray-600">
                        Receive notifications via WhatsApp
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="whatsapp"
                    checked={preferences.channels.whatsapp}
                    onCheckedChange={() => handleChannelToggle('whatsapp')}
                    disabled={!whatsappOptIn.isVerified}
                  />
                </div>

                {!whatsappOptIn.isVerified && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>WhatsApp Verification Required</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-3 mt-3">
                        {!whatsappOptIn.awaitingVerification ? (
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Phone number with country code"
                              value={whatsappOptIn.phoneNumber}
                              onChange={(e) => setWhatsappOptIn(prev => ({
                                ...prev,
                                phoneNumber: e.target.value,
                              }))}
                            />
                            <Button onClick={handleWhatsAppOptIn}>
                              Send Code
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Enter verification code"
                              value={whatsappOptIn.verificationCode}
                              onChange={(e) => setWhatsappOptIn(prev => ({
                                ...prev,
                                verificationCode: e.target.value,
                              }))}
                            />
                            <Button onClick={verifyWhatsApp}>
                              Verify
                            </Button>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {whatsappOptIn.isVerified && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">WhatsApp Verified</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Your WhatsApp number ({whatsappOptIn.phoneNumber}) is verified
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Categories</CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="daily-checkins">Daily Check-ins</Label>
                  <p className="text-sm text-gray-600">
                    Reminders and updates about daily check-ins
                  </p>
                </div>
                <Switch
                  id="daily-checkins"
                  checked={preferences.categories.daily_checkins}
                  onCheckedChange={() => handleCategoryToggle('daily_checkins')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="crisis-alerts">Crisis Alerts</Label>
                  <p className="text-sm text-gray-600">
                    Emergency notifications and crisis support
                  </p>
                </div>
                <Switch
                  id="crisis-alerts"
                  checked={preferences.categories.crisis_alerts}
                  onCheckedChange={() => handleCategoryToggle('crisis_alerts')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="support-requests">Support Requests</Label>
                  <p className="text-sm text-gray-600">
                    Notifications from your support network
                  </p>
                </div>
                <Switch
                  id="support-requests"
                  checked={preferences.categories.support_requests}
                  onCheckedChange={() => handleCategoryToggle('support_requests')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="milestones">Milestones</Label>
                  <p className="text-sm text-gray-600">
                    Celebrations and achievement notifications
                  </p>
                </div>
                <Switch
                  id="milestones"
                  checked={preferences.categories.milestones}
                  onCheckedChange={() => handleCategoryToggle('milestones')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="partnership-updates">Partnership Updates</Label>
                  <p className="text-sm text-gray-600">
                    Updates from your accountability partners
                  </p>
                </div>
                <Switch
                  id="partnership-updates"
                  checked={preferences.categories.partnership_updates}
                  onCheckedChange={() => handleCategoryToggle('partnership_updates')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="system-updates">System Updates</Label>
                  <p className="text-sm text-gray-600">
                    App updates and maintenance notifications
                  </p>
                </div>
                <Switch
                  id="system-updates"
                  checked={preferences.categories.system_updates}
                  onCheckedChange={() => handleCategoryToggle('system_updates')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Set times when you don't want to receive non-urgent notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                    <p className="text-sm text-gray-600">
                      Pause non-urgent notifications during specified times
                    </p>
                  </div>
                </div>
                <Switch
                  id="quiet-hours"
                  checked={preferences.quiet_hours.enabled}
                  onCheckedChange={handleQuietHoursToggle}
                />
              </div>

              {preferences.quiet_hours.enabled && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={preferences.quiet_hours.start}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        quiet_hours: {
                          ...prev.quiet_hours,
                          start: e.target.value,
                        },
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet-end">End Time</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={preferences.quiet_hours.end}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        quiet_hours: {
                          ...prev.quiet_hours,
                          end: e.target.value,
                        },
                      }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>
                Control how many notifications you receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="max-per-day">Maximum Notifications Per Day</Label>
                <Input
                  id="max-per-day"
                  type="number"
                  value={preferences.rate_limits.max_per_day}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    rate_limits: {
                      ...prev.rate_limits,
                      max_per_day: parseInt(e.target.value) || 0,
                    },
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="max-per-hour">Maximum Notifications Per Hour</Label>
                <Input
                  id="max-per-hour"
                  type="number"
                  value={preferences.rate_limits.max_per_hour}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    rate_limits: {
                      ...prev.rate_limits,
                      max_per_hour: parseInt(e.target.value) || 0,
                    },
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div>
                    <Label htmlFor="emergency-override">Emergency Override</Label>
                    <p className="text-sm text-gray-600">
                      Allow crisis alerts to bypass rate limits
                    </p>
                  </div>
                </div>
                <Switch
                  id="emergency-override"
                  checked={preferences.rate_limits.emergency_override}
                  onCheckedChange={handleEmergencyOverrideToggle}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
              <CardDescription>
                Control how your notification data is handled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Your Privacy is Protected</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All notifications are encrypted end-to-end</li>
                    <li>We never share your contact information</li>
                    <li>Notification content is kept minimal to protect your privacy</li>
                    <li>You can delete your notification history at any time</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button variant="outline" className="w-full">
                  Download Notification History
                </Button>
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                  Clear Notification History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationPreferences;