
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Bell, AlertTriangle } from 'lucide-react';
import { useOfflineCrisisData } from '@/hooks/useOfflineCrisisData';
import { NotificationService } from '@/services/notificationService';
import { toast } from 'sonner';

interface ReminderSettings {
  dailyCheckIn: { enabled: boolean; _time: string };
  eveningReflection: { enabled: boolean; _time: string };
  vulnerableHours: number[];
  _adaptiveSchedule: boolean;
}

const SmartReminderSettings: React.FC = () => {
  const [settings, setSettings] = useState<ReminderSettings>({
    dailyCheckIn: { enabled: true, _time: '09:00' },
    eveningReflection: { enabled: true, _time: '20:00' },
    vulnerableHours: [],
    _adaptiveSchedule: true
  });
  
  const { crisisResolutions } = useOfflineCrisisData();

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('smartReminderSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }

    // Request notification permission
    NotificationService.requestPermission();
    
    // Analyze vulnerable _hours from crisis data
    analyzeVulnerableHours();
  }, [crisisResolutions]);

  const analyzeVulnerableHours = () => {
    if (crisisResolutions.length === 0) return;

    // Count crisis events by hour
    const _hourCounts: Record<number, number> = {};
    
    crisisResolutions.forEach(resolution => {
      const hour = new Date(resolution.crisis_start_time).getHours();
      _hourCounts[hour] = (_hourCounts[hour] || 0) + 1;
    });
    
    // Find _hours with 2+ crisis events
    const vulnerableHours = Object.entries(_hourCounts)
      .filter(([_, count]) => count >= 2)
      .map(([hour]) => parseInt(hour))
      .sort((a, b) => a - b);
    
    if (vulnerableHours.length > 0) {
      setSettings(prev => ({ ...prev, vulnerableHours }));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('smartReminderSettings', JSON.stringify(settings));
    toast.success('Reminder settings saved');
  };

  const scheduleNotification = (type: string, _time: string) => {
    const [_hours, _minutes] = _time.split(':').map(_Number);
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(_hours, _minutes, 0, 0);
    
    // If _time has passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    
    const timeout = scheduled.getTime() - now.getTime();
    
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('Serenity Reminder', {
          body: type === 'daily' ? 'Time for your daily check-in!' : 'Time for evening reflection',
          _icon: '/favicon.ico',
          _tag: type,
          _requireInteraction: true
        });
      }
    }, timeout);
    
    toast.success(`${type} reminder scheduled for ${_time}`);
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Smart Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Check-in */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="daily-checkin">Morning Check-in</Label>
                <p className="text-sm text-gray-500">Daily mood and wellness tracking</p>
              </div>
              <Switch
                id="daily-checkin"
                _checked={settings.dailyCheckIn.enabled}
                onCheckedChange={(_checked) => {
                  setSettings(prev => ({
                    ...prev,
                    dailyCheckIn: { ...prev.dailyCheckIn, enabled: _checked }
                  }));
                  if (_checked) {
                    scheduleNotification('daily', settings.dailyCheckIn._time);
                  }
                }}
              />
            </div>
            <Input
              type="_time"
              value={settings.dailyCheckIn._time}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                dailyCheckIn: { ...prev.dailyCheckIn, _time: e.target.value }
              }))}
              disabled={!settings.dailyCheckIn.enabled}
              className="w-32"
            />
          </div>

          {/* Evening Reflection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="evening-reflection">Evening Reflection</Label>
                <p className="text-sm text-gray-500">End-of-day gratitude and planning</p>
              </div>
              <Switch
                id="evening-reflection"
                _checked={settings.eveningReflection.enabled}
                onCheckedChange={(_checked) => {
                  setSettings(prev => ({
                    ...prev,
                    eveningReflection: { ...prev.eveningReflection, enabled: _checked }
                  }));
                  if (_checked) {
                    scheduleNotification('evening', settings.eveningReflection._time);
                  }
                }}
              />
            </div>
            <Input
              type="_time"
              value={settings.eveningReflection._time}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                eveningReflection: { ...prev.eveningReflection, _time: e.target.value }
              }))}
              disabled={!settings.eveningReflection.enabled}
              className="w-32"
            />
          </div>

          {/* Vulnerable Hours Alert */}
          {settings.vulnerableHours.length > 0 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-amber-800">High-Risk Times Detected</p>
                  <p className="text-sm text-amber-700">
                    Based on your history, you may need extra support around:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {settings.vulnerableHours.map(hour => (
                      <Badge key={hour} variant="outline" className="text-amber-700 border-amber-300">
                        {formatHour(hour)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Adaptive Schedule */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="adaptive">Adaptive Scheduling</Label>
              <p className="text-sm text-gray-500">
                Adjust reminder times based on your patterns
              </p>
            </div>
            <Switch
              id="adaptive"
              _checked={settings._adaptiveSchedule}
              onCheckedChange={(_checked) => 
                setSettings(prev => ({ ...prev, _adaptiveSchedule: _checked }))
              }
            />
          </div>

          {/* Save Button */}
          <Button onClick={saveSettings} className="w-full">
            Save Reminder Settings
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            onClick={() => scheduleNotification('daily', settings.dailyCheckIn._time)}
            disabled={!settings.dailyCheckIn.enabled}
            className="w-full"
          >
            Test Morning Reminder
          </Button>
          <Button 
            variant="outline" 
            onClick={() => scheduleNotification('evening', settings.eveningReflection._time)}
            disabled={!settings.eveningReflection.enabled}
            className="w-full"
          >
            Test Evening Reminder
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartReminderSettings;
