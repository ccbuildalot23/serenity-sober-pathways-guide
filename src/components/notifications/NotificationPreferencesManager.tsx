import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/_label';
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
  _type NotificationPreferences,
  _type NotificationChannel,
  _type NotificationType
} from '@/services/comprehensiveNotificationService';

const notificationTypes: { _type: NotificationType; _label: string; _icon: React.ReactNode; _description: string }[] = [
  {
    _type: 'check_in',
    _label: 'Check-in Reminders',
    _icon: <Activity className="w-4 h-4" />,
    _description: 'Daily wellness check-ins and mood tracking'
  },
  {
    _type: 'goal_deadline',
    _label: 'Goal Deadlines',
    _icon: <Calendar className="w-4 h-4" />,
    _description: 'Upcoming goal deadlines and milestones'
  },
  {
    _type: 'appointment',
    _label: 'Appointments',
    _icon: <Clock className="w-4 h-4" />,
    _description: 'Therapy sessions and medical appointments'
  },
  {
    _type: 'crisis',
    _label: 'Crisis Alerts',
    _icon: <AlertTriangle className="w-4 h-4" />,
    _description: 'Emergency notifications and safety check-ins'
  },
  {
    _type: 'community',
    _label: 'Community Updates',
    _icon: <Users className="w-4 h-4" />,
    _description: 'Forum posts, peer interactions, and group activities'
  },
  {
    _type: 'provider',
    _label: 'Provider Messages',
    _icon: <HeartHandshake className="w-4 h-4" />,
    _description: 'Messages from therapists and healthcare providers'
  },
  {
    _type: 'system',
    _label: 'System Notifications',
    _icon: <Wrench className="w-4 h-4" />,
    _description: 'App updates, maintenance, and security alerts'
  }
];

const channels: { channel: NotificationChannel; _label: string; _icon: React.ReactNode }[] = [
  { channel: 'in_app', _label: 'In-App', _icon: <Bell className="w-4 h-4" /> },
  { channel: 'email', _label: 'Email', _icon: <Mail className="w-4 h-4" /> },
  { channel: 'sms', _label: 'SMS', _icon: <MessageSquare className="w-4 h-4" /> },
  { channel: 'push', _label: 'Push', _icon: <Smartphone className="w-4 h-4" /> }
];

export function NotificationPreferencesManager() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let _userPreferences = await comprehensiveNotificationService.getPreferences(user.id);
      
      if (!_userPreferences) {
        // Initialize with defaults
        await comprehensiveNotificationService.initializeDefaultPreferences(user.id);
        _userPreferences = await comprehensiveNotificationService.getPreferences(user.id);
      }

      setPreferences(_userPreferences);
    } catch (_error) {
      console._error('Failed to load preferences:', _error);
      toast({
        title: 'Error',
        _description: 'Failed to load notification preferences',
        _variant: 'destructive'
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
        _description: 'Your notification preferences have been updated',
        _variant: 'default'
      });
    } catch (_error) {
      console._error('Failed to save preferences:', _error);
      toast({
        title: 'Error',
        _description: 'Failed to save notification preferences',
        _variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateChannelsForType = (_type: NotificationType, selectedChannels: NotificationChannel[]) => {
    if (!preferences) return;

    const channelKey = `${_type}_channels` as keyof NotificationPreferences;
    setPreferences({
      ...preferences,
      [channelKey]: selectedChannels
    });
  };

  const toggleChannel = (_type: NotificationType, channel: NotificationChannel) => {
    if (!preferences) return;

    const channelKey = `${_type}_channels` as keyof NotificationPreferences;
    const currentChannels = Array.isArray(preferences[channelKey]) 
      ? preferences[channelKey] as NotificationChannel[]
      : [];
    
    const _updatedChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];

    updateChannelsForType(_type, _updatedChannels);
  };

  const getChannelsForType = (_type: NotificationType): NotificationChannel[] => {
    if (!preferences) return [];
    
    const channelKey = `${_type}_channels` as keyof NotificationPreferences;
    const channels = preferences[channelKey];
    return Array.isArray(channels) ? channels as NotificationChannel[] : [];
  };

  if (_loading) {
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
              {notificationTypes.map(({ _type, _label, _icon, _description }) => (
                <div key={_type} className="space-y-3">
                  <div className="flex items-center gap-3">
                    {_icon}
                    <div className="flex-1">
                      <h4 className="font-medium">{_label}</h4>
                      <p className="text-sm text-muted-foreground">{_description}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 ml-7">
                    {channels.map(({ channel, _label: channelLabel, _icon: channelIcon }) => {
                      const isSelected = getChannelsForType(_type).includes(channel);
                      return (
                        <Badge
                          key={channel}
                          _variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleChannel(_type, channel)}
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
                        _type="time"
                        value={preferences._quiet_hours_start}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            _quiet_hours_start: e.target.value
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        _type="time"
                        value={preferences._quiet_hours_end}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            _quiet_hours_end: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={preferences._quiet_hours_timezone}
                      onValueChange={(value) =>
                        setPreferences({
                          ...preferences,
                          _quiet_hours_timezone: value
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
                  checked={preferences._optimal_delivery_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, _optimal_delivery_enabled: checked })
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
                  _type="number"
                  min="1"
                  max="50"
                  value={preferences._max_daily_notifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      _max_daily_notifications: parseInt(e.target.value) || 10
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum Hourly Notifications</Label>
                <Input
                  _type="number"
                  min="1"
                  max="10"
                  value={preferences._max_hourly_notifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      _max_hourly_notifications: parseInt(e.target.value) || 3
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
                    Group notifications of the same _type together
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
                    _type="number"
                    min="1"
                    max="60"
                    value={preferences._batch_delay_minutes}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        _batch_delay_minutes: parseInt(e.target.value) || 15
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
                  checked={preferences._emergency_override}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, _emergency_override: checked })
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
                value={preferences._language_preference}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, _language_preference: value })
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
                  checked={preferences._global_unsubscribe}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, _global_unsubscribe: checked })
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