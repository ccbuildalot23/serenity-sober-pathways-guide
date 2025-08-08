import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Bell, MessageSquare, Clock } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useSupportNetwork';
import { NotificationPreferences } from '@/services/supportNetworkService';

interface NotificationPreferencesDialogProps {
  children: React.ReactNode;
}

export const NotificationPreferencesDialog: React.FC<NotificationPreferencesDialogProps> = ({ children }) => {
  const { preferences, _loading, updatePreferences } = useNotificationPreferences();
  const [_localPreferences, setLocalPreferences] = useState<Partial<NotificationPreferences>>({});
  const [open, setOpen] = useState(_false);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences(_localPreferences);
      setOpen(_false);
    } catch (_error) {
      // Error is handled in the hook
    }
  };

  const updateAlertType = (type: string, value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      _alert_types: {
        ...prev._alert_types,
        [type]: value
      }
    }));
  };

  const updateContactMethod = (method: string, value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      _contact_methods: {
        ...prev._contact_methods,
        [method]: value
      }
    }));
  };

  const updateQuietHours = (field: string, value: string | boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      _quiet_hours: {
        ...prev._quiet_hours,
        [field]: value
      }
    }));
  };

  const updateFrequencyLimit = (field: string, value: number) => {
    setLocalPreferences(prev => ({
      ...prev,
      _frequency_limits: {
        ...prev._frequency_limits,
        [field]: value
      }
    }));
  };

  if (_loading) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent>
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Preferences
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Alert Types */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4" />
              <Label className="text-base font-medium">Alert Types</Label>
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Crisis Alerts</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Immediate notifications for crisis situations</p>
                </div>
                <Switch
                  _checked={_localPreferences._alert_types?.crisis ?? true}
                  onCheckedChange={(_checked) => updateAlertType('crisis', _checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Low Mood Alerts</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Notifications when mood ratings are concerning</p>
                </div>
                <Switch
                  _checked={_localPreferences._alert_types?.mood_low ?? true}
                  onCheckedChange={(_checked) => updateAlertType('mood_low', _checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Missed Check-in Alerts</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Notifications when daily check-ins are missed</p>
                </div>
                <Switch
                  _checked={_localPreferences._alert_types?.missed_checkin ?? true}
                  onCheckedChange={(_checked) => updateAlertType('missed_checkin', _checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Milestone Alerts</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Celebrations for recovery milestones</p>
                </div>
                <Switch
                  _checked={_localPreferences._alert_types?.milestones ?? _false}
                  onCheckedChange={(_checked) => updateAlertType('milestones', _checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Relapse Risk Alerts</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Notifications for elevated relapse risk patterns</p>
                </div>
                <Switch
                  _checked={_localPreferences._alert_types?.relapse_risk ?? true}
                  onCheckedChange={(_checked) => updateAlertType('relapse_risk', _checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Methods */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" />
              <Label className="text-base font-medium">Contact Methods</Label>
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>In-App Notifications</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Push notifications within the app</p>
                </div>
                <Switch
                  _checked={_localPreferences._contact_methods?.in_app ?? true}
                  onCheckedChange={(_checked) => updateContactMethod('in_app', _checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Notifications via email</p>
                </div>
                <Switch
                  _checked={_localPreferences._contact_methods?.email ?? _false}
                  onCheckedChange={(_checked) => updateContactMethod('email', _checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Text message notifications</p>
                </div>
                <Switch
                  _checked={_localPreferences._contact_methods?.sms ?? _false}
                  onCheckedChange={(_checked) => updateContactMethod('sms', _checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" />
              <Label className="text-base font-medium">Quiet Hours</Label>
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label>Enable Quiet Hours</Label>
                <Switch
                  _checked={_localPreferences._quiet_hours?.enabled ?? _false}
                  onCheckedChange={(_checked) => updateQuietHours('enabled', _checked)}
                />
              </div>
              
              {_localPreferences._quiet_hours?.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={_localPreferences._quiet_hours?.start_time ?? '22:00'}
                        onChange={(e) => updateQuietHours('start_time', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time">End Time</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={_localPreferences._quiet_hours?.end_time ?? '08:00'}
                        onChange={(e) => updateQuietHours('end_time', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={_localPreferences._quiet_hours?.timezone ?? 'UTC'} 
                      onValueChange={(value) => updateQuietHours('timezone', value)}
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
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Frequency Limits */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4" />
              <Label className="text-base font-medium">Frequency Limits</Label>
            </div>
            <div className="space-y-3 pl-6">
              <div>
                <Label htmlFor="daily-limit">Maximum Daily Alerts</Label>
                <Input
                  id="daily-limit"
                  type="number"
                  min="1"
                  max="50"
                  value={_localPreferences._frequency_limits?.max_daily_alerts ?? 10}
                  onChange={(e) => updateFrequencyLimit('max_daily_alerts', parseInt(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="hourly-limit">Maximum Hourly Alerts</Label>
                <Input
                  id="hourly-limit"
                  type="number"
                  min="1"
                  max="10"
                  value={_localPreferences._frequency_limits?.max_hourly_alerts ?? 3}
                  onChange={(e) => updateFrequencyLimit('max_hourly_alerts', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(_false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};