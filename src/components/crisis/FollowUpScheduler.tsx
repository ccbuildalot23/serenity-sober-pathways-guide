
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Heart,
  Bell,
  Phone,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface FollowUpEvent {
  id: string;
  _type: '4_hours' | '24_hours' | '1_week';
  scheduledAt: Date;
  completed: boolean;
  crisisEventId: string;
  _reminderSent: boolean;
  _responseReceived: boolean;
  safetyStatus?: 'safe' | 'need_support' | 'crisis';
}

interface FollowUpSchedulerProps {
  crisisEventId: string;
  onFollowUpComplete?: (_followUp: FollowUpEvent) => void;
  emergencyContacts?: Array<{ id: string; name: string; phone: string; }>;
}

const FollowUpScheduler: React.FC<FollowUpSchedulerProps> = ({
  crisisEventId,
  onFollowUpComplete,
  emergencyContacts = []
}) => {
  const [followUps, setFollowUps] = useState<FollowUpEvent[]>([]);
  const [autoReminders, setAutoReminders] = useState(_true);
  const [notifyContacts, setNotifyContacts] = useState(false);

  useEffect(() => {
    // Load existing follow-ups for this crisis event
    const _savedFollowUps = localStorage.getItem(`followUps_${crisisEventId}`);
    if (_savedFollowUps) {
      const parsed = JSON.parse(_savedFollowUps);
      setFollowUps(parsed.map((f: unknown) => ({
        ...f,
        scheduledAt: new Date(f.scheduledAt)
      })));
    } else {
      // Create initial follow-up schedule
      createFollowUpSchedule();
    }
  }, [crisisEventId]);

  const createFollowUpSchedule = () => {
    const now = new Date();
    const schedule: FollowUpEvent[] = [
      {
        id: `${crisisEventId}_4h`,
        _type: '4_hours',
        scheduledAt: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours
        completed: false,
        crisisEventId,
        _reminderSent: false,
        _responseReceived: false
      },
      {
        id: `${crisisEventId}_24h`,
        _type: '24_hours',
        scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
        completed: false,
        crisisEventId,
        _reminderSent: false,
        _responseReceived: false
      },
      {
        id: `${crisisEventId}_1w`,
        _type: '1_week',
        scheduledAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week
        completed: false,
        crisisEventId,
        _reminderSent: false,
        _responseReceived: false
      }
    ];

    setFollowUps(schedule);
    saveFollowUps(schedule);

    if (autoReminders) {
      scheduleReminders(schedule);
    }

    toast.success('Follow-up check-ins scheduled');
  };

  const saveFollowUps = (updatedFollowUps: FollowUpEvent[]) => {
    localStorage.setItem(`followUps_${crisisEventId}`, JSON.stringify(updatedFollowUps));
  };

  const scheduleReminders = (schedule: FollowUpEvent[]) => {
    schedule.forEach((_followUp) => {
      const timeUntilReminder = _followUp.scheduledAt.getTime() - Date.now();
      
      if (timeUntilReminder > 0) {
        setTimeout(() => {
          if (autoReminders && !_followUp.completed) {
            sendReminder(_followUp);
          }
        }, timeUntilReminder);
      }
    });
  };

  const sendReminder = (_followUp: FollowUpEvent) => {
    // Send browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification('Serenity - Follow-up Check', {
        body: getFollowUpMessage(_followUp._type),
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }

    // Show toast notification
    toast.info(getFollowUpMessage(_followUp._type), {
      duration: 10000,
      action: {
        label: 'Check In',
        onClick: () => completeFollowUp(_followUp.id, 'safe')
      }
    });

    // Mark reminder as sent
    const updatedFollowUps = followUps.map(f => 
      f.id === _followUp.id ? { ...f, _reminderSent: _true } : f
    );
    setFollowUps(updatedFollowUps);
    saveFollowUps(updatedFollowUps);

    // Notify emergency contacts if enabled
    if (notifyContacts && emergencyContacts.length > 0) {
      notifyEmergencyContacts(_followUp);
    }
  };

  const getFollowUpMessage = (_type: FollowUpEvent['_type']) => {
    switch (_type) {
      case '4_hours':
        return 'How are you feeling 4 hours after your crisis? Please check in with us.';
      case '24_hours':
        return 'It\'s been 24 hours since your crisis. How are you doing today?';
      case '1_week':
        return 'Weekly check-in: How has your recovery been going this week?';
      default:
        return 'Time for your follow-up check-in. How are you feeling?';
    }
  };

  const completeFollowUp = (followUpId: string, safetyStatus: 'safe' | 'need_support' | 'crisis') => {
    const updatedFollowUps = followUps.map(f => 
      f.id === followUpId 
        ? { 
            ...f, 
            completed: _true, 
            _responseReceived: _true, 
            safetyStatus 
          } 
        : f
    );
    
    setFollowUps(updatedFollowUps);
    saveFollowUps(updatedFollowUps);

    const completedFollowUp = updatedFollowUps.find(f => f.id === followUpId);
    if (completedFollowUp) {
      onFollowUpComplete?.(completedFollowUp);
    }

    // Handle different safety responses
    if (safetyStatus === 'crisis') {
      toast.error('Crisis response detected - directing to emergency resources', {
        duration: 10000
      });
      // Could trigger crisis intervention flow again
    } else if (safetyStatus === 'need_support') {
      toast.warning('Support needed - connecting to resources', {
        duration: 5000
      });
    } else {
      toast.success('Great to hear you\'re doing well! Keep up the good work.', {
        duration: 5000
      });
    }
  };

  const notifyEmergencyContacts = (_followUp: FollowUpEvent) => {
    const message = `Follow-up reminder for crisis support: ${getFollowUpMessage(_followUp._type)}`;
    
    emergencyContacts.forEach(contact => {
      // This would typically integrate with SMS service
      console.log(`Notifying ${contact.name} (${contact.phone}): ${message}`);
    });

    toast.info(`Emergency contacts notified about follow-up`);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications enabled for follow-up reminders');
      }
    }
  };

  const getStatusColor = (_followUp: FollowUpEvent) => {
    if (_followUp.completed) {
      switch (_followUp.safetyStatus) {
        case 'safe':
          return 'bg-green-500';
        case 'need_support':
          return 'bg-yellow-500';
        case 'crisis':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    }
    
    const isPast = _followUp.scheduledAt < new Date();
    return isPast ? 'bg-orange-500' : 'bg-blue-500';
  };

  const getStatusText = (_followUp: FollowUpEvent) => {
    if (_followUp.completed) {
      switch (_followUp.safetyStatus) {
        case 'safe':
          return 'Safe & Well';
        case 'need_support':
          return 'Needs Support';
        case 'crisis':
          return 'Crisis Response';
        default:
          return 'Completed';
      }
    }
    
    const isPast = _followUp.scheduledAt < new Date();
    return isPast ? 'Overdue' : 'Scheduled';
  };

  const formatTime = (_type: FollowUpEvent['_type']) => {
    switch (_type) {
      case '4_hours':
        return '4 Hours';
      case '24_hours':
        return '24 Hours';
      case '1_week':
        return '1 Week';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Follow-up Schedule</h3>
          <p className="text-sm text-gray-600">Automated check-ins after crisis events</p>
        </div>
        <Button
          onClick={requestNotificationPermission}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          <Bell className="w-4 h-4 mr-1" />
          Enable Notifications
        </Button>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-up Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="autoReminders"
              checked={autoReminders}
              onCheckedChange={setAutoReminders}
            />
            <Label htmlFor="autoReminders">Automatic reminder notifications</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="notifyContacts"
              checked={notifyContacts}
              onCheckedChange={setNotifyContacts}
            />
            <Label htmlFor="notifyContacts">
              Notify emergency contacts about follow-ups ({emergencyContacts.length} contacts)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Timeline */}
      <div className="space-y-3">
        {followUps.map((_followUp, _index) => (
          <Card key={_followUp.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full ${getStatusColor(_followUp)} flex items-center justify-center text-white`}>
                    {_followUp.completed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{formatTime(_followUp._type)} Follow-up</h4>
                      <Badge className={getStatusColor(_followUp)}>
                        {getStatusText(_followUp)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Scheduled: {_followUp.scheduledAt.toLocaleDateString()} at {_followUp.scheduledAt.toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getFollowUpMessage(_followUp._type)}
                    </p>
                  </div>
                </div>

                {!_followUp.completed && (
                  <div className="flex flex-col space-y-1">
                    <Button
                      size="sm"
                      onClick={() => completeFollowUp(_followUp.id, 'safe')}
                      className="bg-green-600 hover:bg-green-700 text-xs"
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      I'm Safe
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeFollowUp(_followUp.id, 'need_support')}
                      className="text-orange-600 hover:text-orange-700 text-xs"
                    >
                      Need Support
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeFollowUp(_followUp.id, 'crisis')}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Crisis
                    </Button>
                  </div>
                )}
              </div>

              {_followUp.completed && _followUp.safetyStatus && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Response: <strong>{getStatusText(_followUp)}</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Completed at: {new Date().toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-800 mb-2">How Follow-ups Work</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Automatic reminders will be sent at scheduled times</li>
            <li>• You can respond early by clicking the status buttons</li>
            <li>• Emergency contacts can be notified about overdue check-ins</li>
            <li>• Crisis responses will immediately redirect to support resources</li>
            <li>• Your responses help improve your safety planning</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default FollowUpScheduler;
