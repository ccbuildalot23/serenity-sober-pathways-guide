
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Clock, Shield } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';

interface CardProps {
  onNext: () => void;
  onPrevious: () => void;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  isAnimating: boolean;
  onComplete: () => void;
}

export const PersonalizeCard: React.FC<CardProps> = ({ data, updateData }) => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
          <Settings className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-blue-900">
          Personalize Your Experience
        </h2>
        <p className="text-gray-600">
          Set up your preferences for the best recovery support
        </p>
      </div>

      {/* Settings Form */}
      <div className="space-y-6">
        {/* Check-in Times */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Daily Check-in Times</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="morning-time" className="text-sm text-gray-600">Morning</Label>
              <Input
                id="morning-time"
                type="time"
                value={data.morningCheckInTime}
                onChange={(e) => updateData({ morningCheckInTime: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="evening-time" className="text-sm text-gray-600">Evening</Label>
              <Input
                id="evening-time"
                type="time"
                value={data.eveningReflectionTime}
                onChange={(e) => updateData({ eveningReflectionTime: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Emergency Contact (Optional)</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="emergency-name" className="text-sm text-gray-600">Name</Label>
              <Input
                id="emergency-name"
                type="text"
                placeholder="e.g., John Smith, Mom, Sponsor"
                value={data.emergencyContact?.name || ''}
                onChange={(e) => updateData({ 
                  emergencyContact: { 
                    ...data.emergencyContact, 
                    name: e.target.value,
                    phone: data.emergencyContact?.phone || ''
                  } 
                })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="emergency-phone" className="text-sm text-gray-600">Phone Number</Label>
              <Input
                id="emergency-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={data.emergencyContact?.phone || ''}
                onChange={(e) => updateData({ 
                  emergencyContact: { 
                    ...data.emergencyContact, 
                    name: data.emergencyContact?.name || '',
                    phone: e.target.value
                  } 
                })}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Privacy & Notifications */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-800">Privacy & Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Anonymous Mode</p>
                <p className="text-sm text-gray-600">Hide personal details in exports</p>
              </div>
              <Switch
                checked={data.anonymousMode}
                onCheckedChange={(checked) => updateData({ anonymousMode: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Daily Reminders</p>
                <p className="text-sm text-gray-600">Check-in and reflection prompts</p>
              </div>
              <Switch
                checked={data.notificationPreferences.dailyReminders}
                onCheckedChange={(checked) => updateData({ 
                  notificationPreferences: { 
                    ...data.notificationPreferences, 
                    dailyReminders: checked 
                  } 
                })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Milestone Messages</p>
                <p className="text-sm text-gray-600">Celebrate your progress</p>
              </div>
              <Switch
                checked={data.notificationPreferences.milestoneMessages}
                onCheckedChange={(checked) => updateData({ 
                  notificationPreferences: { 
                    ...data.notificationPreferences, 
                    milestoneMessages: checked 
                  } 
                })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ready Message */}
      <div className="bg-emerald-50 p-4 rounded-lg text-center">
        <p className="text-emerald-800 font-medium">
          You're all set! Your recovery journey awaits.
        </p>
      </div>
    </div>
  );
};
