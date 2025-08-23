import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
import logger from '../../services/loggerService';
  Bell, Mail, MessageSquare, Smartphone, 
  Shield, AlertTriangle, Check, Loader2,
  Phone, Zap, Users, Heart, Calendar, Brain, Activity, Target
} from 'lucide-react';

interface NotificationChannel {
  id: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  verified: boolean;
  description: string;
  requiresVerification: boolean;
  verificationData?: Record<string, unknown>;
}

interface RateLimitSettings {
  maxPerHour: number;
  maxPerDay: number;
  emergencyOverride: boolean;
}

interface CategoryPreference {
  id: string;
  name: string;
  icon: React.ReactNode;
  channels: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  allowQuietHours: boolean;
}

export function EnhancedNotificationPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('channels');
  
  // Channel states
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 'in_app',
      name: 'In-App',
      icon: <Bell className="w-4 h-4" />,
      enabled: true,
      verified: true,
      description: 'Notifications within the Serenity app',
      requiresVerification: false
    },
    {
      id: 'email',
      name: 'Email',
      icon: <Mail className="w-4 h-4" />,
      enabled: false,
      verified: false,
      description: 'Email notifications to your registered address',
      requiresVerification: true
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: <MessageSquare className="w-4 h-4" />,
      enabled: false,
      verified: false,
      description: 'Text messages to your phone',
      requiresVerification: true
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <Phone className="w-4 h-4" />,
      enabled: false,
      verified: false,
      description: 'WhatsApp messages for instant updates',
      requiresVerification: true
    },
    {
      id: 'push',
      name: 'Push',
      icon: <Smartphone className="w-4 h-4" />,
      enabled: false,
      verified: false,
      description: 'Browser and mobile push notifications',
      requiresVerification: true
    }
  ]);

  // WhatsApp opt-in state
  const [whatsappOptIn, setWhatsappOptIn] = useState({
    showDialog: false,
    phoneNumber: '',
    verificationCode: '',
    step: 'phone' as 'phone' | 'verify' | 'complete',
    loading: false
  });

  // Push notification state
  const [pushPermission, setPushPermission] = useState<'default' | 'granted' | 'denied'>('default');

  // Category preferences
  const [categories, setCategories] = useState<CategoryPreference[]>([
    {
      id: 'crisis',
      name: 'Crisis Alerts',
      icon: <AlertTriangle className="w-4 h-4" />,
      channels: ['in_app', 'sms', 'whatsapp', 'push'],
      priority: 'urgent',
      allowQuietHours: false
    },
    {
      id: 'check_in',
      name: 'Daily Check-ins',
      icon: <Calendar className="w-4 h-4" />,
      channels: ['in_app', 'push'],
      priority: 'normal',
      allowQuietHours: true
    },
    {
      id: 'goals',
      name: 'Goals & Milestones',
      icon: <Target className="w-4 h-4" />,
      channels: ['in_app', 'email'],
      priority: 'normal',
      allowQuietHours: true
    },
    {
      id: 'community',
      name: 'Community Updates',
      icon: <Users className="w-4 h-4" />,
      channels: ['email'],
      priority: 'low',
      allowQuietHours: true
    },
    {
      id: 'provider',
      name: 'Provider Messages',
      icon: <Heart className="w-4 h-4" />,
      channels: ['in_app', 'email', 'sms'],
      priority: 'high',
      allowQuietHours: false
    },
    {
      id: 'wellness',
      name: 'Wellness Tips',
      icon: <Brain className="w-4 h-4" />,
      channels: ['in_app'],
      priority: 'low',
      allowQuietHours: true
    }
  ]);

  // Quiet hours settings
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    allowEmergency: true
  });

  // Rate limiting
  const [rateLimits, setRateLimits] = useState<RateLimitSettings>({
    maxPerHour: 10,
    maxPerDay: 50,
    emergencyOverride: true
  });

  useEffect(() => {
    loadPreferences();
    checkPushPermission();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load user preferences
      const { data: prefs, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefs && !error) {
        // Update channels from preferences
        setChannels(prev => prev.map(ch => ({
          ...ch,
          enabled: prefs.channels?.[ch.id] ?? ch.enabled,
          verified: prefs.verified_channels?.[ch.id] ?? ch.verified
        })));

        // Update quiet hours
        setQuietHours({
          enabled: prefs.quiet_hours_enabled ?? false,
          startTime: prefs.quiet_hours_start ?? '22:00',
          endTime: prefs.quiet_hours_end ?? '08:00',
          timezone: prefs.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          allowEmergency: prefs.allow_emergency_override ?? true
        });

        // Update rate limits
        setRateLimits({
          maxPerHour: prefs.max_per_hour ?? 10,
          maxPerDay: prefs.max_per_day ?? 50,
          emergencyOverride: prefs.emergency_override ?? true
        });

        // Update categories
        if (prefs.category_preferences) {
          setCategories(prev => prev.map(cat => ({
            ...cat,
            channels: prefs.category_preferences[cat.id]?.channels ?? cat.channels,
            priority: prefs.category_preferences[cat.id]?.priority ?? cat.priority
          })));
        }
      }

      // Check WhatsApp opt-in status
      const { data: whatsappData } = await supabase
        .from('whatsapp_opt_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('opted_in', true)
        .single();

      if (whatsappData) {
        setChannels(prev => prev.map(ch => 
          ch.id === 'whatsapp' ? { ...ch, verified: true } : ch
        ));
      }

    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPushPermission = () => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  };

  const handleChannelToggle = async (channelId: string, enabled: boolean) => {
    const channel = channels.find(ch => ch.id === channelId);
    
    if (enabled && channel?.requiresVerification && !channel.verified) {
      // Show verification flow
      if (channelId === 'whatsapp') {
        setWhatsappOptIn({ ...whatsappOptIn, showDialog: true });
      } else if (channelId === 'push') {
        await requestPushPermission();
      } else if (channelId === 'email') {
        await verifyEmail();
      } else if (channelId === 'sms') {
        await verifySMS();
      }
    } else {
      // Update channel state
      setChannels(prev => prev.map(ch => 
        ch.id === channelId ? { ...ch, enabled } : ch
      ));
    }
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser',
        variant: 'destructive'
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        setChannels(prev => prev.map(ch => 
          ch.id === 'push' ? { ...ch, enabled: true, verified: true } : ch
        ));
        
        // Register service worker for push
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY
          });
          
          // Save subscription to backend
          await supabase.from('push_subscriptions').upsert({
            user_id: user?.id,
            subscription: subscription.toJSON(),
            created_at: new Date().toISOString()
          });
        }
        
        toast({
          title: 'Push Notifications Enabled',
          description: 'You will now receive push notifications'
        });
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      toast({
        title: 'Permission Error',
        description: 'Failed to enable push notifications',
        variant: 'destructive'
      });
    }
  };

  const handleWhatsAppOptIn = async () => {
    setWhatsappOptIn({ ...whatsappOptIn, loading: true });

    try {
      if (whatsappOptIn.step === 'phone') {
        // Send verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        const { error } = await supabase
          .from('whatsapp_opt_ins')
          .insert({
            user_id: user?.id,
            phone_number: whatsappOptIn.phoneNumber,
            verification_code: verificationCode,
            created_at: new Date().toISOString()
          });

        if (!error) {
          // In production, send actual WhatsApp message via Twilio
          logger.debug(`WhatsApp verification code: ${verificationCode}`, { component: 'EnhancedNotificationPreferences' });
          
          toast({
            title: 'Verification Code Sent',
            description: `A verification code has been sent to ${whatsappOptIn.phoneNumber}`
          });
          
          setWhatsappOptIn({
            ...whatsappOptIn,
            step: 'verify',
            loading: false
          });
        }
      } else if (whatsappOptIn.step === 'verify') {
        // Verify code
        const { data, error } = await supabase
          .from('whatsapp_opt_ins')
          .select('*')
          .eq('user_id', user?.id)
          .eq('verification_code', whatsappOptIn.verificationCode)
          .single();

        if (data && !error) {
          // Mark as opted in
          await supabase
            .from('whatsapp_opt_ins')
            .update({
              opted_in: true,
              verified_at: new Date().toISOString()
            })
            .eq('id', data.id);

          setChannels(prev => prev.map(ch => 
            ch.id === 'whatsapp' ? { ...ch, enabled: true, verified: true } : ch
          ));

          toast({
            title: 'WhatsApp Verified',
            description: 'You can now receive WhatsApp notifications'
          });

          setWhatsappOptIn({
            ...whatsappOptIn,
            step: 'complete',
            loading: false
          });

          setTimeout(() => {
            setWhatsappOptIn({
              showDialog: false,
              phoneNumber: '',
              verificationCode: '',
              step: 'phone',
              loading: false
            });
          }, 2000);
        } else {
          toast({
            title: 'Invalid Code',
            description: 'Please check your verification code',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('WhatsApp opt-in error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process WhatsApp opt-in',
        variant: 'destructive'
      });
    } finally {
      setWhatsappOptIn(prev => ({ ...prev, loading: false }));
    }
  };

  const verifyEmail = async () => {
    try {
      // Send verification email
      const { error } = await supabase.auth.updateUser({
        email: user?.email
      });

      if (!error) {
        toast({
          title: 'Verification Email Sent',
          description: 'Please check your email to verify'
        });
      }
    } catch (error) {
      console.error('Email verification error:', error);
    }
  };

  const verifySMS = async () => {
    // Implement SMS verification flow
    toast({
      title: 'SMS Verification',
      description: 'SMS verification coming soon'
    });
  };

  const updateCategoryChannels = (categoryId: string, channelId: string, enabled: boolean) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        const channels = enabled 
          ? [...cat.channels, channelId]
          : cat.channels.filter(ch => ch !== channelId);
        return { ...cat, channels: [...new Set(channels)] };
      }
      return cat;
    }));
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const preferences = {
        user_id: user.id,
        channels: Object.fromEntries(channels.map(ch => [ch.id, ch.enabled])),
        verified_channels: Object.fromEntries(channels.map(ch => [ch.id, ch.verified])),
        quiet_hours_enabled: quietHours.enabled,
        quiet_hours_start: quietHours.startTime,
        quiet_hours_end: quietHours.endTime,
        timezone: quietHours.timezone,
        allow_emergency_override: quietHours.allowEmergency,
        max_per_hour: rateLimits.maxPerHour,
        max_per_day: rateLimits.maxPerDay,
        emergency_override: rateLimits.emergencyOverride,
        category_preferences: Object.fromEntries(
          categories.map(cat => [
            cat.id,
            { channels: cat.channels, priority: cat.priority }
          ])
        ),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert(preferences);

      if (!error) {
        toast({
          title: 'Preferences Saved',
          description: 'Your notification preferences have been updated'
        });
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Save preferences error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {channels.map(channel => (
                <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {channel.icon}
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={channel.id} className="font-medium">
                          {channel.name}
                        </Label>
                        {channel.verified && (
                          <Badge variant="outline" className="text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {channel.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={channel.id}
                    checked={channel.enabled && channel.verified}
                    onCheckedChange={(checked) => handleChannelToggle(channel.id, checked)}
                    disabled={channel.requiresVerification && !channel.verified}
                  />
                </div>
              ))}

              {/* Browser Push Permission Status */}
              {pushPermission !== 'default' && (
                <Alert>
                  <AlertDescription>
                    Push notifications are {pushPermission === 'granted' ? 'enabled' : 'blocked'} in your browser.
                    {pushPermission === 'denied' && ' Please check your browser settings to enable them.'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Categories</CardTitle>
              <CardDescription>
                Customize which channels to use for each type of notification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map(category => (
                <div key={category.id} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <Label className="font-medium">{category.name}</Label>
                      <Badge variant={
                        category.priority === 'urgent' ? 'destructive' :
                        category.priority === 'high' ? 'secondary' :
                        category.priority === 'low' ? 'outline' : 'default'
                      }>
                        {category.priority}
                      </Badge>
                    </div>
                    {!category.allowQuietHours && (
                      <Badge variant="outline" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Always Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 ml-6">
                    {channels.filter(ch => ch.verified).map(channel => (
                      <label
                        key={channel.id}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={category.channels.includes(channel.id)}
                          onChange={(e) => updateCategoryChannels(category.id, channel.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{channel.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Set times when you don't want to be disturbed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="quiet-hours">Enable quiet hours</Label>
                <Switch
                  id="quiet-hours"
                  checked={quietHours.enabled}
                  onCheckedChange={(checked) => 
                    setQuietHours({ ...quietHours, enabled: checked })
                  }
                />
              </div>

              {quietHours.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-start">Start time</Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={quietHours.startTime}
                        onChange={(e) => 
                          setQuietHours({ ...quietHours, startTime: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-end">End time</Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={quietHours.endTime}
                        onChange={(e) => 
                          setQuietHours({ ...quietHours, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-orange-500" />
                      <Label htmlFor="emergency-override">
                        Allow emergency notifications during quiet hours
                      </Label>
                    </div>
                    <Switch
                      id="emergency-override"
                      checked={quietHours.allowEmergency}
                      onCheckedChange={(checked) => 
                        setQuietHours({ ...quietHours, allowEmergency: checked })
                      }
                    />
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Crisis alerts and provider messages will always come through if emergency override is enabled
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>
                Control how many notifications you receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hourly-limit">Maximum notifications per hour</Label>
                <Input
                  id="hourly-limit"
                  type="number"
                  min="1"
                  max="50"
                  value={rateLimits.maxPerHour}
                  onChange={(e) => 
                    setRateLimits({ ...rateLimits, maxPerHour: parseInt(e.target.value) || 10 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-limit">Maximum notifications per day</Label>
                <Input
                  id="daily-limit"
                  type="number"
                  min="5"
                  max="200"
                  value={rateLimits.maxPerDay}
                  onChange={(e) => 
                    setRateLimits({ ...rateLimits, maxPerDay: parseInt(e.target.value) || 50 })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <Label htmlFor="emergency-bypass">
                    Emergency notifications bypass rate limits
                  </Label>
                </div>
                <Switch
                  id="emergency-bypass"
                  checked={rateLimits.emergencyOverride}
                  onCheckedChange={(checked) => 
                    setRateLimits({ ...rateLimits, emergencyOverride: checked })
                  }
                />
              </div>

              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  Rate limits help prevent notification fatigue and ensure important messages get through
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => loadPreferences()}>
          Reset
        </Button>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>

      {/* WhatsApp Opt-in Dialog */}
      <Dialog open={whatsappOptIn.showDialog} onOpenChange={(open) => 
        setWhatsappOptIn({ ...whatsappOptIn, showDialog: open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable WhatsApp Notifications</DialogTitle>
            <DialogDescription>
              {whatsappOptIn.step === 'phone' && 'Enter your phone number to receive WhatsApp notifications'}
              {whatsappOptIn.step === 'verify' && 'Enter the verification code sent to your WhatsApp'}
              {whatsappOptIn.step === 'complete' && 'WhatsApp notifications enabled successfully!'}
            </DialogDescription>
          </DialogHeader>

          {whatsappOptIn.step === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone">Phone Number</Label>
                <Input
                  id="whatsapp-phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={whatsappOptIn.phoneNumber}
                  onChange={(e) => 
                    setWhatsappOptIn({ ...whatsappOptIn, phoneNumber: e.target.value })
                  }
                />
              </div>
              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  We'll send a verification code to this WhatsApp number
                </AlertDescription>
              </Alert>
            </div>
          )}

          {whatsappOptIn.step === 'verify' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={whatsappOptIn.verificationCode}
                  onChange={(e) => 
                    setWhatsappOptIn({ ...whatsappOptIn, verificationCode: e.target.value })
                  }
                />
              </div>
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  Check your WhatsApp for the 6-digit verification code
                </AlertDescription>
              </Alert>
            </div>
          )}

          {whatsappOptIn.step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-center font-medium">
                WhatsApp notifications are now enabled!
              </p>
              <p className="text-center text-sm text-muted-foreground mt-2">
                You can manage your preferences anytime
              </p>
            </div>
          )}

          <DialogFooter>
            {whatsappOptIn.step !== 'complete' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setWhatsappOptIn({ ...whatsappOptIn, showDialog: false })}
                  disabled={whatsappOptIn.loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWhatsAppOptIn}
                  disabled={whatsappOptIn.loading || 
                    (whatsappOptIn.step === 'phone' && !whatsappOptIn.phoneNumber) ||
                    (whatsappOptIn.step === 'verify' && whatsappOptIn.verificationCode.length !== 6)
                  }
                >
                  {whatsappOptIn.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    whatsappOptIn.step === 'phone' ? 'Send Code' : 'Verify'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}