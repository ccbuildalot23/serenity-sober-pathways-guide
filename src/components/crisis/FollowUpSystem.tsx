
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { 
  Calendar, 
  Clock, 
  Heart, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare,
  Phone,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FollowUpTask {
  id: string;
  time: string;
  type: 'automated_check_in' | 'mood_assessment' | 'professional_follow_up';
  scheduled: Date;
  completed: boolean;
  crisisId: string;
}

interface CheckInResponse {
  id: string;
  taskId: string;
  timestamp: Date;
  moodRating: number;
  notes: string;
  needsSupport: boolean;
}

const FollowUpSystem = () => {
  const [pendingTasks, setPendingTasks] = useState<FollowUpTask[]>([]);
  const [activeCheckIn, setActiveCheckIn] = useState<FollowUpTask | null>(null);
  const [moodRating, setMoodRating] = useState([5]);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [needsSupport, setNeedsSupport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingTasks();
    
    // Check for due tasks every minute
    const interval = setInterval(checkForDueTasks, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadPendingTasks = () => {
    const tasks = JSON.parse(localStorage.getItem('followUpTasks') || '[]');
    const now = new Date();
    
    const pending = tasks.filter((task: FollowUpTask) => {
      const scheduledTime = new Date(task.scheduled);
      return !task.completed && scheduledTime <= now;
    });
    
    setPendingTasks(pending);
  };

  const checkForDueTasks = () => {
    const tasks = JSON.parse(localStorage.getItem('followUpTasks') || '[]');
    const now = new Date();
    
    const dueTasks = tasks.filter((task: FollowUpTask) => {
      const scheduledTime = new Date(task.scheduled);
      return !task.completed && scheduledTime <= now;
    });
    
    if (dueTasks.length > 0 && pendingTasks.length === 0) {
      setPendingTasks(dueTasks);
      
      // Show notification for first due task
      toast({
        title: "Follow-up Check-in",
        description: "It's time for your scheduled check-in. How are you feeling?",
        duration: 10000
      });
    }
  };

  const handleCheckInStart = (task: FollowUpTask) => {
    setActiveCheckIn(task);
    setMoodRating([5]);
    setCheckInNotes('');
    setNeedsSupport(false);
  };

  const handleCheckInComplete = async () => {
    if (!activeCheckIn) return;

    const response: CheckInResponse = {
      id: Date.now().toString(),
      taskId: activeCheckIn.id,
      timestamp: new Date(),
      moodRating: moodRating[0],
      notes: checkInNotes,
      needsSupport
    };

    // Save response
    const existingResponses = localStorage.getItem('checkInResponses') || '[]';
    const responses = JSON.parse(existingResponses);
    responses.push(response);
    localStorage.setItem('checkInResponses', JSON.stringify(responses));

    // Mark task as completed
    const tasks = JSON.parse(localStorage.getItem('followUpTasks') || '[]');
    const updatedTasks = tasks.map((task: FollowUpTask) => 
      task.id === activeCheckIn.id ? { ...task, completed: true } : task
    );
    localStorage.setItem('followUpTasks', JSON.stringify(updatedTasks));

    // Remove from pending tasks
    setPendingTasks(prev => prev.filter(task => task.id !== activeCheckIn.id));

    // Show appropriate response based on mood and support needs
    if (moodRating[0] <= 3 || needsSupport) {
      toast({
        title: "We're here for you",
        description: "Consider reaching out to your support network or professional help.",
        duration: 8000
      });
    } else {
      toast({
        title: "Great to hear!",
        description: "Keep up the positive momentum. Remember we're here if you need us.",
        duration: 5000
      });
    }

    setActiveCheckIn(null);
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'automated_check_in':
        return <Heart className="w-4 h-4" />;
      case 'mood_assessment':
        return <MessageSquare className="w-4 h-4" />;
      case 'professional_follow_up':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTaskTitle = (type: string) => {
    switch (type) {
      case 'automated_check_in':
        return 'Check-in Time';
      case 'mood_assessment':
        return 'Mood Assessment';
      case 'professional_follow_up':
        return 'Professional Follow-up';
      default:
        return 'Follow-up';
    }
  };

  const getTaskDescription = (type: string) => {
    switch (type) {
      case 'automated_check_in':
        return 'A quick check on how you\'re doing';
      case 'mood_assessment':
        return 'Rate your current mood and wellbeing';
      case 'professional_follow_up':
        return 'Consider scheduling professional support';
      default:
        return 'Follow-up check-in';
    }
  };

  const getMoodLabel = (rating: number) => {
    if (rating <= 2) return { text: "Very Low", color: "text-red-600" };
    if (rating <= 4) return { text: "Low", color: "text-orange-600" };
    if (rating <= 6) return { text: "Okay", color: "text-yellow-600" };
    if (rating <= 8) return { text: "Good", color: "text-green-600" };
    return { text: "Excellent", color: "text-emerald-600" };
  };

  if (activeCheckIn) {
    return (
      <Card className="border-blue-200">
        <CardHeader className="text-center">
          <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
            {getTaskIcon(activeCheckIn.type)}
          </div>
          <CardTitle className="text-blue-600">
            {getTaskTitle(activeCheckIn.type)}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {getTaskDescription(activeCheckIn.type)}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                How is your mood right now?
              </label>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Very Low</span>
                  <span>Excellent</span>
                </div>
                <Slider
                  value={moodRating}
                  onValueChange={setMoodRating}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="text-center">
                  <span className={`text-lg font-semibold ${getMoodLabel(moodRating[0]).color}`}>
                    {moodRating[0]}/10 - {getMoodLabel(moodRating[0]).text}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                How are you feeling? (Optional)
              </label>
              <Textarea
                placeholder="Share anything on your mind..."
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="needsSupport"
                checked={needsSupport}
                onChange={(e) => setNeedsSupport(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="needsSupport" className="text-sm text-gray-700">
                I could use some extra support right now
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleCheckInComplete}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Check-in
            </Button>

            {(moodRating[0] <= 3 || needsSupport) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-red-800 font-medium mb-1">Additional Support Available</p>
                    <p className="text-red-700 mb-2">
                      It sounds like you might benefit from extra support. Consider:
                    </p>
                    <ul className="text-red-700 text-xs space-y-1">
                      <li>• Reaching out to your support network</li>
                      <li>• Using crisis intervention tools</li>
                      <li>• Contacting professional help</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingTasks.length === 0) {
    return (
      <Card className="border-green-200">
        <CardContent className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-600 mb-2">
            All Caught Up!
          </h3>
          <p className="text-sm text-gray-600">
            No pending follow-ups at this time. We'll check in with you as scheduled.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Follow-up Check-ins
      </h3>
      
      {pendingTasks.map((task) => (
        <Card key={task.id} className="border-blue-200 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {getTaskIcon(task.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {getTaskTitle(task.type)}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {getTaskDescription(task.type)}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      Scheduled: {new Date(task.scheduled).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => handleCheckInStart(task)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Check-in
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FollowUpSystem;
