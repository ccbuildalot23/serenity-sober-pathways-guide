import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, Send, Phone, AlertTriangle, Star, Clock,
  UserCheck, Users, Loader2, ThumbsUp, Calendar, Video
} from 'lucide-react';
import VideoCallInterface from './VideoCallInterface';
import EnhancedQueueManagement from './EnhancedQueueManagement';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  message_text: string;
  sender_type: string;
  created_at: string;
  read_at?: string;
}

interface PeerSupporter {
  id: string;
  display_name: string;
  bio?: string;
  specialties: string[];
  average_rating: number;
  current_chat_count: number;
  is_available: boolean;
}

interface ChatSession {
  id: string;
  status: string;
  priority: string;
  peer_supporter_id?: string;
  supporter?: PeerSupporter;
  started_at: string;
  ended_at?: string;
}

interface QueueStatus {
  queue_position: number;
  estimated_wait_minutes: number;
}

const PeerSupportChat = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'main' | 'queue' | 'chat' | 'rating' | 'video'>('main');
  const [videoSession, setVideoSession] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join chat queue
  const joinQueue = async (priority: 'normal' | 'high' = 'normal', description?: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if already in queue
      const { data: existing } = await supabase
        .from('peer_support_queue')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        toast.info('You are already in the support queue');
        setView('queue');
        return;
      }

      // Add to queue
      const { error } = await supabase
        .from('peer_support_queue')
        .insert({
          user_id: user.id,
          priority,
          issue_description: description
        });

      if (error) throw error;

      setView('queue');
      toast.success('Added to support queue');
      
      // Start polling for queue updates
      pollQueueStatus();
    } catch (error: any) {
      toast.error(`Failed to join queue: ${error.message}`);
    }
    setLoading(false);
  };

  // Poll queue status
  const pollQueueStatus = () => {
    const interval = setInterval(async () => {
      if (!user) return;

      // Check if session started
      const { data: session } = await supabase
        .from('peer_chat_sessions')
        .select(`
          *
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (session) {
        setCurrentSession(session as ChatSession);
        setView('chat');
        clearInterval(interval);
        toast.success('Connected with peer supporter');
        return;
      }

      // Update queue position
      const { data: queue } = await supabase
        .from('peer_support_queue')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (queue) {
        setQueueStatus({
          queue_position: queue.queue_position || 1,
          estimated_wait_minutes: queue.estimated_wait_minutes || 5
        });
      } else {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;

    try {
      const { error } = await supabase
        .from('peer_chat_messages')
        .insert({
          session_id: currentSession.id,
          sender_id: user!.id,
          sender_type: 'user',
          message_text: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
    }
  };

  // Load chat messages
  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('peer_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
    } catch (error: any) {
      toast.error(`Failed to load messages: ${error.message}`);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!currentSession) return;

    loadMessages(currentSession.id);

    const channel = supabase
      .channel(`chat-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'peer_chat_messages',
          filter: `session_id=eq.${currentSession.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession]);

  // Crisis escalation
  const escalateToEmergency = async () => {
    if (!currentSession) return;

    const confirmed = window.confirm(
      'This will immediately notify our crisis response team. Do you want to continue?'
    );

    if (confirmed) {
      try {
        const { error } = await supabase
          .from('peer_chat_sessions')
          .update({
            status: 'escalated',
            escalated_to_crisis: true,
            escalation_reason: 'User requested crisis escalation'
          })
          .eq('id', currentSession.id);

        if (error) throw error;

        toast.success('Crisis team has been notified');
        window.open('tel:988', '_self');
      } catch (error: any) {
        toast.error(`Failed to escalate: ${error.message}`);
      }
    }
  };

  // End chat and rate
  const endChat = async () => {
    if (!currentSession) return;

    try {
      const { error } = await supabase
        .from('peer_chat_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setView('rating');
    } catch (error: any) {
      toast.error(`Failed to end chat: ${error.message}`);
    }
  };

  // Submit rating
  const submitRating = async () => {
    if (!currentSession || rating === 0) return;

    try {
      const { error } = await supabase
        .from('peer_chat_sessions')
        .update({
          user_rating: rating,
          user_feedback: feedback
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      toast.success('Thank you for your feedback!');
      setView('main');
      setCurrentSession(null);
      setRating(0);
      setFeedback('');
    } catch (error: any) {
      toast.error(`Failed to submit rating: ${error.message}`);
    }
  };

  // Schedule video session (placeholder)
  const scheduleVideoSession = () => {
    toast.info('Video sessions will be available soon');
    setView('video');
  };

  if (view === 'queue') {
    return <EnhancedQueueManagement />;
  }

  if (view === 'chat' && currentSession) {
    return (
      <div className="flex flex-col h-[600px] max-w-2xl mx-auto">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  {currentSession.supporter?.display_name || 'Peer Supporter'}
                </CardTitle>
                <div className="flex gap-2 mt-1">
                  {currentSession.supporter?.specialties?.map((specialty) => (
                    <Badge key={specialty} variant="secondary" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setView('video')}
                >
                  <Video className="w-4 h-4 mr-1" />
                  Video
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={escalateToEmergency}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Crisis
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={endChat}
                >
                  End Chat
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      message.sender_type === 'user'
                        ? 'bg-blue-600 text-white ml-4'
                        : 'bg-gray-100 text-gray-900 mr-4'
                    }`}
                  >
                    <p className="text-sm">{message.message_text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {typingIndicator && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg mr-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'rating' && currentSession) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Rate Your Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              How was your chat with {currentSession.supporter?.display_name}?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="ghost"
                  size="sm"
                  onClick={() => setRating(star)}
                  className="p-1"
                >
                  <Star 
                    className={`w-6 h-6 ${
                      star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                    }`} 
                  />
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Additional feedback (optional)
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts about the support you received..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setView('main')}
            >
              Skip
            </Button>
            <Button 
              className="flex-1"
              onClick={submitRating}
              disabled={rating === 0}
            >
              Submit Rating
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (view === 'video') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Schedule Video Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 mx-auto text-purple-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">Video Sessions Coming Soon</h3>
            <p className="text-sm text-gray-600 mb-4">
              We're working on bringing you face-to-face support sessions. 
              In the meantime, try our text-based peer support chat.
            </p>
          </div>

          <Button 
            className="w-full"
            onClick={() => setView('main')}
          >
            Back to Support Options
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main view
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-blue-800 mb-2">24/7 Peer Support</h2>
        <p className="text-gray-600">Connect with trained peer supporters anytime</p>
      </div>

      <div className="grid gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-green-800">Start Chat Support</h3>
            </div>
            <p className="text-sm text-green-700 mb-4">
              Connect instantly with a trained peer supporter for confidential chat support
            </p>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => joinQueue('normal')}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Start Chat Now
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <h3 className="font-semibold text-orange-800">High Priority Support</h3>
            </div>
            <p className="text-sm text-orange-700 mb-4">
              Need urgent support? Get connected faster with priority queue placement
            </p>
            <Button 
              variant="outline" 
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
              onClick={() => joinQueue('high')}
              disabled={loading}
            >
              Request Priority Support
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-purple-800">Schedule Video Session</h3>
            </div>
            <p className="text-sm text-purple-700 mb-4">
              Book a face-to-face video session with a peer supporter (Coming soon)
            </p>
            <Button 
              variant="outline" 
              className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
              onClick={scheduleVideoSession}
            >
              Schedule Session
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Phone className="w-6 h-6 text-red-600" />
              <h3 className="font-semibold text-red-800">Crisis Support</h3>
            </div>
            <p className="text-sm text-red-700 mb-4">
              In immediate crisis? Contact professional crisis support right away
            </p>
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => window.open('tel:988', '_self')}
              >
                Call 988
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => window.open('sms:741741', '_self')}
              >
                Text Crisis Line
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>All peer support chats are confidential and anonymous</p>
        <p>Our peer supporters are trained volunteers with lived recovery experience</p>
      </div>
    </div>
  );
};

export default PeerSupportChat;