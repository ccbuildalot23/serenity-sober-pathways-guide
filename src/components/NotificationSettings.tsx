
import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Bell, Clock, Heart, Phone, BookOpen } from 'lucide-react';
import { NotificationService } from '@/services/notificationService';

interface NotificationToggles {
  checkIn: boolean;
  affirm: boolean;
  support: boolean;
  spiritual: boolean;
}

export default function NotificationSettings() {
  const [time, setTime] = useState('09:00');
  const [freq, setFreq] = useState(3);
  const [toggles, setToggles] = useState<NotificationToggles>({ 
    checkIn: true, 
    affirm: true, 
    support: true, 
    spiritual: true 
  });
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedSettings = localStorage.getItem('notification_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setTime(settings.time || '09:00');
      setFreq(settings.freq || 3);
      setToggles(settings.toggles || toggles);
    }
  }, []);

  const save = async () => {
    const settings = { time, freq, toggles };
    localStorage.setItem('notification_settings', JSON.stringify(settings));
    await NotificationService.scheduleAll(settings);
  };

  const requestPermission = async () => {
    const result = await NotificationService.requestPermission();
    setPermission(result);
  };

  const notificationTypes = [
    { key: 'checkIn', label: 'Daily Check-In', icon: Heart, description: 'Gentle reminders to log your mood' },
    { key: 'affirm', label: 'Affirmations', icon: BookOpen, description: 'Positive thoughts for your day' },
    { key: 'support', label: 'Support Call Reminder', icon: Phone, description: 'Prompts to reach out for support' },
    { key: 'spiritual', label: 'Spiritual Principles', icon: Bell, description: 'Daily wisdom and reflection' }
  ];

  if (permission === 'denied') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-[#1E3A8A] flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Notifications Blocked</h3>
            <p className="text-gray-600 mb-4">
              Notifications are currently blocked. Please enable them in your browser settings to receive recovery reminders.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-[#1E3A8A] flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {permission !== 'granted' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-[#1E3A8A] mb-3">Enable notifications to receive recovery reminders</p>
            <Button onClick={requestPermission} className="bg-[#10B981] text-white hover:bg-emerald-600">
              Enable Notifications
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="font-medium text-[#1E3A8A] flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              Preferred Reminder Time
            </Label>
            <input 
              type="time" 
              value={time} 
              onChange={e => setTime(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
            />
          </div>

          <div>
            <Label className="font-medium text-[#1E3A8A] mb-2 block">
              Reminders per week: {freq}
            </Label>
            <input 
              type="range" 
              min="1" 
              max="7" 
              value={freq} 
              onChange={e => setFreq(+e.target.value)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>7</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-[#1E3A8A]">Notification Types</h3>
          {notificationTypes.map(({ key, label, icon: Icon, description }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-[#10B981]" />
                <div>
                  <span className="text-[#1E3A8A] font-medium">{label}</span>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>
              <Switch
                checked={toggles[key as keyof NotificationToggles]}
                onCheckedChange={val => setToggles({ ...toggles, [key]: val })}
              />
            </div>
          ))}
        </div>

        <Button 
          onClick={save} 
          className="w-full bg-[#10B981] text-white hover:bg-emerald-600"
          disabled={permission !== 'granted'}
        >
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
