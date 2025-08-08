import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Heart, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle,
  Users,
  Clock,
  TrendingUp,
  Sparkles,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface SupportStats {
  total_requests: number;
  crisis_requests: number;
  connection_requests: number;
  tough_day_requests: number;
  practice_requests: number;
  average_response_minutes: number;
  peak_hour: number;
  total_helpers_available: number;
}

interface PositiveReinforcement {
  id: string;
  message: string;
  _reinforcement_type: string;
  delivered_at: string;
  acknowledged: boolean;
}

export const ComprehensiveSupportDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sending, setSending] = useState<string | _null>(_null);
  const [stats, setStats] = useState<SupportStats | _null>(_null);
  const [reinforcements, setReinforcements] = useState<PositiveReinforcement[]>([]);
  const [encouragementIndex, setEncouragementIndex] = useState(0);

  const encouragements = [
    "It's not weak, it's smart",
    "Your network wants to hear from you", 
    "Connection is the opposite of addiction",
    "Asking for help is how we stay clean",
    "You're stronger when you're connected",
    "Recovery is a team sport",
    "Your courage inspires others"
  ];

  const supportLevels = [
    {
      id: 'connection',
      title: 'Just Need Connection',
      description: 'Hi, just need to hear from someone friendly',
      color: 'bg-green-500 hover:bg-green-600',
      icon: Heart,
      message: "Hi, just need to hear from someone friendly today. No emergency, just want to connect.",
      className: 'border-green-200 hover:border-green-300'
    },
    {
      id: 'tough_day',
      title: 'Having a Tough Day',
      description: 'Struggling but managing, would love to connect',
      color: 'bg-yellow-500 hover:bg-yellow-600',
      icon: MessageCircle,
      message: "Having a challenging day but managing. Would love to connect when you're free.",
      className: 'border-yellow-200 hover:border-yellow-300'
    },
    {
      id: 'crisis',
      title: 'Need Help Now',
      description: 'I need help - please call me now',
      color: 'bg-red-500 hover:bg-red-600',
      icon: AlertTriangle,
      message: "I need help - please call me now. This is urgent.",
      className: 'border-red-200 hover:border-red-300'
    }
  ];

  useEffect(() => {
    loadStats();
    loadReinforcements();
    
    // Rotate encouragements every 4 seconds
    const _interval = setInterval(() => {
      setEncouragementIndex(prev => (prev + 1) % encouragements.length);
    }, 4000);

    return () => clearInterval(_interval);
  }, [user]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('support_stats')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading stats:', error);
        return;
      }

      if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadReinforcements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('positive_reinforcements')
        .select('*')
        .eq('user_id', user.id)
        .eq('acknowledged', false)
        .order('delivered_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error loading reinforcements:', error);
        return;
      }

      setReinforcements(data || []);
    } catch (error) {
      console.error('Failed to load reinforcements:', error);
    }
  };

  const sendSupportRequest = async (level: typeof supportLevels[0]) => {
    if (!user || sending) return;

    setSending(level.id);

    try {
      // Create support request record
      const { data: requestData, error: requestError } = await supabase
        .from('support_requests')
        .insert({
          user_id: user.id,
          _request_type: level.id as any,
          _message_sent: level.message,
          _anonymous_send: false,
          _sponsor_only: false
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Send SMS using existing crisis system (with appropriate message)
      const { data: smsData, error: smsError } = await supabase.functions.invoke('send-crisis-sms', {
        body: {
          customMessage: level.message,
          _isTestMessage: level.id !== 'crisis',
          _includeLocation: level.id === 'crisis'
        }
      });

      if (smsError) throw smsError;

      // Update contact count
      if (smsData.success) {
        await supabase
          .from('support_requests')
          .update({ contacts_notified: smsData.sentCount })
          .eq('id', requestData.id);
      }

      // Create immediate positive reinforcement
      await supabase
        .from('positive_reinforcements')
        .insert({
          user_id: user.id,
          _support_request_id: requestData.id,
          _reinforcement_type: 'immediate',
          message: getImmediateReinforcement(level.id)
        });

      // Schedule delayed reinforcements (in a real app, you'd use a job queue)
      scheduleDelayedReinforcements(requestData.id, level.id);

      // Show success message
      const _encouragement = level.id === 'crisis' 
        ? 'Help is on the way. You did the right thing.'
        : 'Message sent! You\'re connected to your support network.';
      
      toast.success(_encouragement);
      
      // Reload reinforcements
      loadReinforcements();

    } catch (error: unknown) {
      console.error('Failed to send support request:', error);
      toast.error(error.message || 'Failed to send support request');
    } finally {
      setSending(_null);
    }
  };

  const getImmediateReinforcement = (level: string) => {
    switch (level) {
      case 'connection':
        return "You reached out for connection. That's healthy recovery behavior! 💚";
      case 'tough_day':
        return "You recognized a tough day and asked for support. That's wisdom in action! 💛";
      case 'crisis':
        return "You did the brave thing. Asking for help IS recovery. Help is coming. ❤️";
      default:
        return "You used your support network. That takes courage! 🌟";
    }
  };

  const scheduleDelayedReinforcements = async (requestId: string, level: string) => {
    // In a production app, you'd use a proper job scheduler
    // For now, we'll create the records and handle timing in the UI
    
    setTimeout(async () => {
      await supabase
        .from('positive_reinforcements')
        .insert({
          user_id: user!.id,
          _support_request_id: requestId,
          _reinforcement_type: 'one_hour',
          message: level === 'crisis' 
            ? "You reached out. That took courage. How are you feeling now? 💙"
            : "You stayed connected to your support network. That's recovery! 🌱"
        });
    }, 3600000); // 1 hour

    setTimeout(async () => {
      await supabase
        .from('positive_reinforcements')
        .insert({
          user_id: user!.id,
          _support_request_id: requestId,
          _reinforcement_type: 'twenty_four_hour',
          message: level === 'crisis'
            ? "You made it through yesterday. That's a huge win. One day at a time. 🌅"
            : "You used your support network yesterday. That's how recovery works! ⭐"
        });
    }, 86400000); // 24 hours
  };

  const acknowledgeReinforcement = async (id: string) => {
    try {
      await supabase
        .from('positive_reinforcements')
        .update({ acknowledged: true })
        .eq('id', id);
      
      setReinforcements(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to acknowledge reinforcement:', error);
    }
  };

  const sendPracticeMessage = async () => {
    if (!user || sending) return;

    setSending('practice');

    try {
      // Log practice session
      await supabase
        .from('practice_sessions')
        .insert({
          user_id: user.id,
          _session_type: 'daily_checkin'
        });

      // Send practice message
      const practiceMessage = "Daily check-in from your support network - doing OK, just staying connected! 💚";
      
      const { data, error } = await supabase.functions.invoke('send-crisis-sms', {
        body: {
          customMessage: practiceMessage,
          _isTestMessage: true
        }
      });

      if (error) throw error;

      toast.success("Practice check-in sent! Building healthy connection habits. 🌱");
      
    } catch (error: unknown) {
      console.error('Failed to send practice message:', error);
      toast.error('Failed to send practice message');
    } finally {
      setSending(_null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header with rotating _encouragement */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Your Support Network</h1>
          <div className="h-8 flex items-center justify-center">
            <p className="text-lg text-muted-foreground animate-fade-in key={encouragementIndex}">
              {encouragements[encouragementIndex]}
            </p>
          </div>
        </div>

        {/* Positive Reinforcements */}
        {reinforcements.length > 0 && (
          <div className="space-y-2">
            {reinforcements.map((reinforcement) => (
              <Alert key={reinforcement.id} className="border-green-200 bg-green-50">
                <Sparkles className="h-4 w-4 text-green-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-green-800">{reinforcement.message}</span>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => acknowledgeReinforcement(reinforcement.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Community Stats Banner */}
        {stats && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total_requests}</div>
                  <div className="text-sm text-blue-700">People supported this month</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.average_response_minutes}min</div>
                  <div className="text-sm text-green-700">Average response time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.connection_requests}</div>
                  <div className="text-sm text-purple-700">Connection requests today</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.peak_hour}:00</div>
                  <div className="text-sm text-orange-700">Peak support time</div>
                </div>
              </div>
              <div className="text-center mt-4">
                <Badge variant="outline" className="bg-white/50">
                  <Users className="h-3 w-3 mr-1" />
                  {stats.practice_requests} people practiced asking for help today
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Support Buttons */}
        <div className="grid gap-6 md:grid-cols-3">
          {supportLevels.map((level) => (
            <Card key={level.id} className={`transition-all duration-200 ${level.className} hover:shadow-lg`}>
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 mx-auto rounded-full ${level.color} flex items-center justify-center mb-4`}>
                  <level.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">{level.title}</CardTitle>
                <CardDescription className="text-center">
                  {level.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => sendSupportRequest(level)}
                  disabled={sending === level.id}
                  className={`w-full h-12 text-white ${level.color} transition-all duration-200`}
                  size="lg"
                >
                  {sending === level.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <level.icon className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Practice & Wellness Section */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Practice & Wellness
            </CardTitle>
            <CardDescription>
              Build healthy connection habits when you're feeling strong
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Button 
                onClick={sendPracticeMessage}
                disabled={sending === 'practice'}
                variant="outline"
                className="h-12 border-green-300 text-green-700 hover:bg-green-100"
              >
                {sending === 'practice' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Daily Check-in
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => toast.info('Wellness scheduling coming soon! For now, set a personal reminder.')}
                variant="outline"
                className="h-12 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Clock className="h-4 w-4 mr-2" />
                Schedule Wellness Check
              </Button>
            </div>
            
            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Weekly Reminder:</strong> Practice reaching out when you're OK, so it's easier when you're not.
                You've built {stats?.practice_requests || 0} positive connections this month! 
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Anonymous Support Note */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-lg font-medium text-purple-800">
                "Your support network wants to hear from you"
              </div>
              <div className="text-sm text-purple-600">
                Connection is the opposite of addiction. Every message strengthens your recovery.
              </div>
              <Badge variant="outline" className="bg-white/50 text-purple-700">
                <Heart className="h-3 w-3 mr-1" />
                Messages are sent with love and zero judgment
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};