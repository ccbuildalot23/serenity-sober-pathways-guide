import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Clock,
  Volume2,
  VolumeX,
  Settings,
  AlertTriangle,
  Calendar,
  Users,
  HeartHandshake,
  Activity,
  Wrench
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  comprehensiveNotificationService, 
  type NotificationPreferences,
  type NotificationChannel,
  type NotificationType
} from '@/services/comprehensiveNotificationService';

const notificationTypes: { type: NotificationType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: 'check_in',
    label: 'Check-in Reminders',
    icon: <Activity className="w-4 h-4" />,
    description: 'Daily wellness check-ins and mood tracking'
  },
  {
    type: 'goal_deadline',
    label: 'Goal Deadlines',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Upcoming goal deadlines and milestones'
  },
  {
    type: 'appointment',
    label: 'Appointments',
    icon: <Clock className="w-4 h-4" />,
    description: 'Therapy sessions and medical appointments'
  },
  {
    type: 'crisis',
    label: 'Crisis Alerts',
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'Emergency notifications and safety check-ins'
  },
  {
    type: 'community',
    label: 'Community Updates',
    icon: <Users className="w-4 h-4" />,
    description: 'Forum posts, peer interactions, and group activities'
  },
  {
    type: 'provider',
    label: 'Provider Messages',
    icon: <HeartHandshake className="w-4 h-4" />,
    description: 'Messages from therapists and healthcare providers'
  },
  {
    type: 'system',
    label: 'System Notifications',
    icon: <Wrench className="w-4 h-4" />,
    description: 'App updates, maintenance, and security alerts'
  }
];

const channels: { channel: NotificationChannel; label: string; icon: React.ReactNode }[] = [
  { channel: 'in_app', label: 'In-App', icon: <Bell className="w-4 h-4" /> },
  { channel: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { channel: 'sms', label: 'SMS', icon: <MessageSquare className="w-4 h-4" /> },
  { channel: 'push', label: 'Push', icon: <Smartphone className="w-4 h-4" /> }
];

export function NotificationPreferencesManager() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let userPreferences = await comprehensiveNotificationService.getPreferences(user.id);
      
      if (!userPreferences) {
        // Initialize with defaults
        await comprehensiveNotificationService.initializeDefaultPreferences(user.id);
        userPreferences = await comprehensiveNotificationService.getPreferences(user.id);
      }

      setPreferences(userPreferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await comprehensiveNotificationService.updatePreferences(user.id, preferences);
      
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated',
        variant: 'default'
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateChannelsForType = (type: NotificationType, selectedChannels: NotificationChannel[]) => {
    if (!preferences) return;

    const channelKey = `${type}_channels` as keyof NotificationPreferences;
    setPreferences({
      ...preferences,
      [channelKey]: selectedChannels
    });
  };

  const toggleChannel = (type: NotificationType, channel: NotificationChannel) => {
    if (!preferences) return;

    const channelKey = `${type}_channels` as keyof NotificationPreferences;
    const currentChannels = Array.isArray(preferences[channelKey]) 
      ? preferences[channelKey] as NotificationChannel[]
      : [];
    
    const updatedChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];

    updateChannelsForType(type, updatedChannels);
  };

  const getChannelsForType = (type: NotificationType): NotificationChannel[] => {
    if (!preferences) return [];
    
    const channelKey = `${type}_channels` as keyof NotificationPreferences;
    const channels = preferences[channelKey];
    return Array.isArray(channels) ? channels as NotificationChannel[] : [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Failed to load notification preferences</p>
          <Button onClick={loadPreferences} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Customize how and when you receive notifications to support your recovery journey
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Choose how you want to receive different types of notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationTypes.map(({ type, label, icon, description }) => (
                <div key={type} className="space-y-3">
                  <div className="flex items-center gap-3">
                    {icon}
                    <div className="flex-1">
                      <h4 className="font-medium">{label}</h4>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 ml-7">
                    {channels.map(({ channel, label: channelLabel, icon: channelIcon }) => {
                      const isSelected = getChannelsForType(type).includes(channel);
                      return (
                        <Badge
                          key={channel}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleChannel(type, channel)}
                        >
                          <div className="flex items-center gap-1">
                            {channelIcon}
                            {channelLabel}
                          </div>
                        </Badge>
                      );
                    })}
                  </div>
                  
                  <Separator />
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
                Set times when you don't want to receive non-urgent notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {preferences.quiet_hours_enabled ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <Label>Enable Quiet Hours</Label>
                </div>
                <Switch
                  checked={preferences.quiet_hours_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, quiet_hours_enabled: checked })
                  }
                />
              </div>

              {preferences.quiet_hours_enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={preferences.quiet_hours_start}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            quiet_hours_start: e.target.value
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={preferences.quiet_hours_end}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            quiet_hours_end: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={preferences.quiet_hours_timezone}
                      onValueChange={(value) =>
                        setPreferences({
                          ...preferences,
                          quiet_hours_timezone: value
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Smart Delivery</CardTitle>
              <CardDescription>
                Optimize notification timing based on your engagement patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Optimal Delivery Time</Label>
                  <p className="text-sm text-muted-foreground">
                    Learn from your engagement patterns to deliver notifications at the best times
                  </p>
                </div>
                <Switch
                  checked={preferences.optimal_delivery_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, optimal_delivery_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequency Limits</CardTitle>
              <CardDescription>
                Control how many notifications you receive to avoid overwhelm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Maximum Daily Notifications</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={preferences.max_daily_notifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      max_daily_notifications: parseInt(e.target.value) || 10
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum Hourly Notifications</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={preferences.max_hourly_notifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      max_hourly_notifications: parseInt(e.target.value) || 3
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batching</CardTitle>
              <CardDescription>
                Group similar notifications together to reduce interruptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Batch Similar Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Group notifications of the same type together
                  </p>
                </div>
                <Switch
                  checked={preferences.batch_similar_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, batch_similar_notifications: checked })
                  }
                />
              </div>

              {preferences.batch_similar_notifications && (
                <div className="space-y-2">
                  <Label>Batch Delay (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={preferences.batch_delay_minutes}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        batch_delay_minutes: parseInt(e.target.value) || 15
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    How long to wait before sending a batch of notifications
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Override</CardTitle>
              <CardDescription>
                Allow urgent notifications even during quiet hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Emergency Override</Label>
                  <p className="text-sm text-muted-foreground">
                    Crisis alerts and urgent notifications will bypass quiet hours and limits
                  </p>
                </div>
                <Switch
                  checked={preferences.emergency_override}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, emergency_override: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Language Preference</CardTitle>
              <CardDescription>
                Choose your preferred language for notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={preferences.language_preference}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, language_preference: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Global Unsubscribe</CardTitle>
              <CardDescription>
                Completely disable all notifications (not recommended)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Unsubscribe from All</Label>
                  <p className="text-sm text-muted-foreground text-destructive">
                    Warning: This will disable all notifications including emergency alerts
                  </p>
                </div>
                <Switch
                  checked={preferences.global_unsubscribe}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, global_unsubscribe: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}