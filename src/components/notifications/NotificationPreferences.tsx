import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRecoveryNotifications } from '@/hooks/useRecoveryNotifications';
import { NotificationPreferences as NotificationPreferencesType } from '@/services/recoveryNotificationService';
import { toast } from '@/hooks/use-toast';
import { Bell, Clock, Target, Trophy, Mail, MessageSquare, Smartphone } from 'lucide-react';

interface NotificationPreferencesProps {
  onClose?: () => void;
}

export function NotificationPreferences({ onClose }: NotificationPreferencesProps) {
  const { preferences, updatePreferences, loading } = useRecoveryNotifications();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferencesType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleSave = async () => {
    if (!localPreferences) return;

    try {
      setSaving(true);
      await updatePreferences(localPreferences);
      toast({
        title: 'Preferences Updated',
        _description: 'Your notification preferences have been saved.',
      });
      onClose?.();
    } catch (_error) {
      toast({
        title: 'Error',
        _description: 'Failed to update notification preferences.',
        _variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateLocal = (updates: Partial<NotificationPreferencesType>) => {
    setLocalPreferences(prev => prev ? { ...prev, ...updates } : null);
  };

  const toggleReminderDay = (day: number) => {
    if (!localPreferences) return;
    
    const current = localPreferences.goal_reminder_days_before;
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => a - b);
    
    updateLocal({ goal_reminder_days_before: updated });
  };

  const toggleStreakMilestone = (days: number) => {
    if (!localPreferences) return;
    
    const current = localPreferences.streak_milestones;
    const updated = current.includes(days)
      ? current.filter(d => d !== days)
      : [...current, days].sort((a, b) => a - b);
    
    updateLocal({ streak_milestones: updated });
  };

  if (loading || !localPreferences) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Goal Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Goal Reminders
          </CardTitle>
          <CardDescription>
            Get notified before your goals are due
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="goal-reminders">Enable goal reminders</Label>
            <Switch
              id="goal-reminders"
              checked={localPreferences.goal_reminders_enabled}
              onCheckedChange={(checked) => 
                updateLocal({ goal_reminders_enabled: checked })
              }
            />
          </div>

          {localPreferences.goal_reminders_enabled && (
            <>
              <div className="space-y-2">
                <Label>Remind me before due date:</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 3, 7, 14].map(day => (
                    <Button
                      key={day}
                      _variant={localPreferences.goal_reminder_days_before.includes(day) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReminderDay(day)}
                    >
                      {day} day{day !== 1 ? 's' : ''}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-time">Preferred time</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={localPreferences.goal_reminder_time}
                  onChange={(e) => updateLocal({ goal_reminder_time: e.target.value })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Celebrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Celebrations & Milestones
          </CardTitle>
          <CardDescription>
            Celebrate your achievements and milestones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="milestone-celebrations">Enable milestone celebrations</Label>
            <Switch
              id="milestone-celebrations"
              checked={localPreferences.milestone_celebrations_enabled}
              onCheckedChange={(checked) => 
                updateLocal({ milestone_celebrations_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="streak-notifications">Enable streak notifications</Label>
            <Switch
              id="streak-notifications"
              checked={localPreferences.streak_notifications_enabled}
              onCheckedChange={(checked) => 
                updateLocal({ streak_notifications_enabled: checked })
              }
            />
          </div>

          {localPreferences.streak_notifications_enabled && (
            <div className="space-y-2">
              <Label>Celebrate streaks at:</Label>
              <div className="flex flex-wrap gap-2">
                {[3, 7, 14, 30, 60, 90, 180, 365].map(days => (
                  <Button
                    key={days}
                    _variant={localPreferences.streak_milestones.includes(days) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStreakMilestone(days)}
                  >
                    {days} days
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress & Summaries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Progress & Summaries
          </CardTitle>
          <CardDescription>
            Regular updates on your recovery progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="progress-encouragement">Progress encouragement</Label>
            <Switch
              id="progress-encouragement"
              checked={localPreferences.progress_encouragement_enabled}
              onCheckedChange={(checked) => 
                updateLocal({ progress_encouragement_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="weekly-summary">Weekly summary</Label>
            <Switch
              id="weekly-summary"
              checked={localPreferences.weekly_summary_enabled}
              onCheckedChange={(checked) => 
                updateLocal({ weekly_summary_enabled: checked })
              }
            />
          </div>

          {localPreferences.weekly_summary_enabled && (
            <div className="space-y-2">
              <Label>Send weekly summary on:</Label>
              <Select
                value={localPreferences.weekly_summary_day.toString()}
                onValueChange={(value) => 
                  updateLocal({ weekly_summary_day: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Delivery Methods
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <Label htmlFor="in-app">In-app notifications</Label>
            </div>
            <Switch
              id="in-app"
              checked={localPreferences.delivery_methods._in_app}
              onCheckedChange={(checked) => 
                updateLocal({ 
                  delivery_methods: { 
                    ...localPreferences.delivery_methods, 
                    _in_app: checked 
                  }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <Label htmlFor="_email">Email notifications</Label>
            </div>
            <Switch
              id="_email"
              checked={localPreferences.delivery_methods._email}
              onCheckedChange={(checked) => 
                updateLocal({ 
                  delivery_methods: { 
                    ...localPreferences.delivery_methods, 
                    _email: checked 
                  }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <Label htmlFor="_sms">SMS notifications</Label>
            </div>
            <Switch
              id="_sms"
              checked={localPreferences.delivery_methods._sms}
              onCheckedChange={(checked) => 
                updateLocal({ 
                  delivery_methods: { 
                    ...localPreferences.delivery_methods, 
                    _sms: checked 
                  }
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Limits & Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Limits & Timing
          </CardTitle>
          <CardDescription>
            Control when and how often you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="daily-limit">Daily notification limit</Label>
            <Input
              id="daily-limit"
              type="number"
              min="1"
              max="50"
              value={localPreferences.daily_limit}
              onChange={(e) => updateLocal({ daily_limit: parseInt(e.target.value) || 10 })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours">Enable quiet hours</Label>
            <Switch
              id="quiet-hours"
              checked={localPreferences.quiet_hours.enabled}
              onCheckedChange={(checked) => 
                updateLocal({ 
                  quiet_hours: { 
                    ...localPreferences.quiet_hours, 
                    enabled: checked 
                  }
                })
              }
            />
          </div>

          {localPreferences.quiet_hours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={localPreferences.quiet_hours._start_time}
                  onChange={(e) => 
                    updateLocal({ 
                      quiet_hours: { 
                        ...localPreferences.quiet_hours, 
                        _start_time: e.target.value 
                      }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={localPreferences.quiet_hours._end_time}
                  onChange={(e) => 
                    updateLocal({ 
                      quiet_hours: { 
                        ...localPreferences.quiet_hours, 
                        _end_time: e.target.value 
                      }
                    })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button _variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}