import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, Calendar, Phone, Users, AlertTriangle, 
  UserCheck, Loader2, CheckCircle, ArrowRight
} from 'lucide-react';
import { enhancedPeerSupportService, QueueScheduleOptions } from '@/services/enhancedPeerSupportService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QueueUser {
  id: string;
  priority: string;
  issue_description?: string;
  created_at: string;
  estimated_wait_minutes: number;
  callback_requested: boolean;
  scheduled_time?: string;
}

const EnhancedQueueManagement = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'options' | 'queue' | 'schedule' | 'callback'>('options');
  const [priority, setPriority] = useState<'normal' | 'high' | 'crisis'>('normal');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [callbackPhone, setCallbackPhone] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [estimatedWait, setEstimatedWait] = useState(15);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(new Date(selectedDate));
    }
  }, [selectedDate]);

  const loadAvailableSlots = async (date: Date) => {
    try {
      const slots = await enhancedPeerSupportService.getAvailableTimeSlots(date);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load time slots:', error);
      toast.error('Failed to load available time slots');
    }
  };

  const joinImmediateQueue = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await enhancedPeerSupportService.joinQueueWithScheduling(user.id, priority);
      setView('queue');
      toast.success('Added to support queue');
      startQueuePolling();
    } catch (error: any) {
      toast.error(`Failed to join queue: ${error.message}`);
    }
    setLoading(false);
  };

  const scheduleSession = async () => {
    if (!user || !selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);
      await enhancedPeerSupportService.joinQueueWithScheduling(user.id, priority, {
        scheduled_time: scheduledDateTime.toISOString()
      });
      
      toast.success(`Session scheduled for ${scheduledDateTime.toLocaleString()}`);
      setView('queue');
    } catch (error: any) {
      toast.error(`Failed to schedule session: ${error.message}`);
    }
    setLoading(false);
  };

  const requestCallback = async () => {
    if (!user || !callbackPhone) return;

    setLoading(true);
    try {
      await enhancedPeerSupportService.joinQueueWithScheduling(user.id, priority, {
        callback_requested: true,
        callback_phone: callbackPhone
      });
      
      toast.success('Callback requested - we will call you when a supporter is available');
      setView('queue');
    } catch (error: any) {
      toast.error(`Failed to request callback: ${error.message}`);
    }
    setLoading(false);
  };

  const startQueuePolling = () => {
    const interval = setInterval(async () => {
      if (!user) return;

      try {
        // Check queue status (simplified)
        const position = Math.max(1, Math.floor(Math.random() * 5));
        const wait = Math.max(2, estimatedWait - 1);
        
        setQueueStatus({
          position,
          estimated_wait: wait
        });
        setEstimatedWait(wait);

        // Simulate match found
        if (wait <= 1) {
          clearInterval(interval);
          toast.success('Matched with a peer supporter!');
          setView('options');
        }
      } catch (error) {
        console.error('Queue polling error:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'crisis': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityDescription = (p: string) => {
    switch (p) {
      case 'crisis': return 'Immediate support needed';
      case 'high': return 'Urgent support requested';
      default: return 'Standard support';
    }
  };

  if (view === 'queue') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            In Support Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {queueStatus?.position || 1}
            </div>
            <p className="text-gray-600">Position in queue</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-800">Estimated wait time:</span>
              <span className="font-bold text-blue-900">
                {queueStatus?.estimated_wait || estimatedWait} minutes
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className={`${getPriorityColor(priority)} text-white`}>
                {priority} priority
              </Badge>
              <span className="text-xs text-blue-700">
                {getPriorityDescription(priority)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Request received
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              Finding best match...
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <UserCheck className="w-4 h-4" />
              Ready to connect
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setView('options')}
          >
            Leave Queue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (view === 'schedule') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Schedule Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="date">Select Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {selectedDate && (
            <div>
              <Label htmlFor="time">Available Time Slots</Label>
              <Select onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a time" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Priority Level</Label>
            <Select onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="crisis">Crisis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setView('options')}
            >
              Back
            </Button>
            <Button 
              className="flex-1"
              onClick={scheduleSession}
              disabled={!selectedDate || !selectedTime || loading}
            >
              Schedule Session
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (view === 'callback') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            Request Callback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            We'll call you when a peer supporter becomes available. Current wait time is approximately {estimatedWait} minutes.
          </p>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={callbackPhone}
              onChange={(e) => setCallbackPhone(e.target.value)}
            />
          </div>

          <div>
            <Label>Priority Level</Label>
            <Select onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="crisis">Crisis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setView('options')}
            >
              Back
            </Button>
            <Button 
              className="flex-1"
              onClick={requestCallback}
              disabled={!callbackPhone || loading}
            >
              Request Callback
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Connect with Peer Support
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Current estimated wait: {estimatedWait} minutes
            </span>
          </div>
          <p className="text-xs text-blue-700">
            3 supporters available • Queue length: 2 users
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            className="w-full justify-between"
            onClick={joinImmediateQueue}
            disabled={loading}
          >
            <span>Join Queue Now</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={() => setView('schedule')}
          >
            <span>Schedule for Later</span>
            <Calendar className="w-4 h-4" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={() => setView('callback')}
          >
            <span>Request Callback</span>
            <Phone className="w-4 h-4" />
          </Button>
        </div>

        <div className="border-t pt-4">
          <div>
            <Label>Priority Level</Label>
            <Select onValueChange={(value: any) => setPriority(value)} defaultValue="normal">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Normal Support</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>High Priority</span>
                  </div>
                </SelectItem>
                <SelectItem value="crisis">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Crisis Support</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-center">
          <Button variant="link" className="text-red-600 hover:text-red-700">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Need immediate crisis support?
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedQueueManagement;