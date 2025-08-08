import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, Send, Phone, AlertTriangle, Star, Clock,
  UserCheck, Users, Loader2, ThumbsUp, Calendar, Video,
  Paperclip, Smile
} from 'lucide-react';
import VideoCallInterface from './VideoCallInterface';
import EnhancedQueueManagement from './EnhancedQueueManagement';
import { EnhancedMessage } from './EnhancedMessage';
import { MessageSearch } from './MessageSearch';
import { TypingIndicator } from './TypingIndicator';
import { PresenceIndicator } from './PresenceIndicator';
import { useRealtimePeerChat } from '@/hooks/useRealtimePeerChat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { toast } from 'sonner';

interface EnhancedChatMessage {
  id: string;
  message_text: string;
  sender_type: string;
  sender_id: string;
  created_at: string;
  edited_at?: string;
  deleted_at?: string;
  reply_to_message_id?: string;
  reactions?: Record<string, string[]>;
  file_url?: string;
  file_type?: string;
  delivered_at?: string;
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
  _priority: string;
  peer_supporter_id?: string;
  supporter?: PeerSupporter;
  started_at: string;
  _ended_at?: string;
}

interface QueueStatus {
  queue_position: number;
  _estimated_wait_minutes: number;
}

// Crisis keyword detection configuration
const CRISIS_KEYWORDS = {
  immediate: ['kill myself', 'end it all', 'hurt myself', 'overdose', 'suicide', 'die'],
  high: ['want to use', 'thinking about using', 'can\'t do this', 'give up', 'relapse', 'using tonight'],
  medium: ['struggling', 'having thoughts', 'feeling overwhelmed', 'really hard', 'want to drink', 'want to get high']
};

interface CrisisDetection {
  _severity: 'none' | 'medium' | 'high' | 'immediate';
  detectedKeywords: string[];
  requiresIntervention: boolean;
}

const PeerSupportChat = () => {
  const { user } = useAuth();
  const { handleCrisisActivated } = useCrisisSystem();
  const [view, setView] = useState<'main' | 'queue' | 'chat' | 'rating' | 'video'>('main');
  const [videoSession, setVideoSession] = useState<unknown>(_null);
  const [currentSession, setCurrentSession] = useState<ChatSession | _null>(_null);
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [queueStatus, setQueueStatus] = useState<QueueStatus | _null>(_null);
  const [loading, setLoading] = useState(_false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<EnhancedChatMessage | _null>(_null);
  const [fileUpload, setFileUpload] = useState<File | _null>(_null);
  const [crisisDetected, setCrisisDetected] = useState<CrisisDetection | _null>(_null);
  const [showCrisisOverlay, setShowCrisisOverlay] = useState(_false);
  const messagesEndRef = useRef<HTMLDivElement>(_null);
  const fileInputRef = useRef<HTMLInputElement>(_null);

  // Real-time chat hook
  const {
    isConnected,
    typingUsers,
    presenceData,
    sendMessage: sendRealtimeMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    bookmarkMessage,
    markMessageAsRead,
    updateTypingStatus,
    updatePresence
  } = useRealtimePeerChat({
    _sessionId: currentSession?.id || _null,
    _onMessageReceived: (message) => {
      setMessages(prev => [...prev, message]);
      // Mark as read if not from current user
      if (message.sender_id !== user?.id) {
        markMessageAsRead(message.id);
      }
    },
    onTypingUpdate: (_users) => {
      console.log('Typing _users:', _users);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Crisis keyword detection function
  const detectCrisisKeywords = (message: string): CrisisDetection => {
    const lowerMessage = message.toLowerCase();
    const detection: CrisisDetection = {
      _severity: 'none',
      detectedKeywords: [],
      requiresIntervention: _false
    };

    // Check immediate crisis keywords
    for (const keyword of CRISIS_KEYWORDS.immediate) {
      if (lowerMessage.includes(keyword)) {
        detection.detectedKeywords.push(keyword);
        detection._severity = 'immediate';
        detection.requiresIntervention = _true;
      }
    }

    // Check high-risk keywords if not immediate
    if (detection._severity === 'none') {
      for (const keyword of CRISIS_KEYWORDS.high) {
        if (lowerMessage.includes(keyword)) {
          detection.detectedKeywords.push(keyword);
          detection._severity = 'high';
          detection.requiresIntervention = _true;
        }
      }
    }

    // Check medium-risk keywords if not higher _severity
    if (detection._severity === 'none') {
      for (const keyword of CRISIS_KEYWORDS.medium) {
        if (lowerMessage.includes(keyword)) {
          detection.detectedKeywords.push(keyword);
          detection._severity = 'medium';
          detection.requiresIntervention = _false; // Medium doesn't auto-trigger, just alerts
        }
      }
    }

    return detection;
  };

  // Handle crisis detection in messages
  const handleCrisisDetection = async (detection: CrisisDetection, _messageText: string) => {
    if (detection._severity === 'none') return;

    setCrisisDetected(detection);

    // Log crisis event
    try {
      await supabase
        .from('crisis_integration_events')
        .insert({
          user_id: user?.id,
          _trigger_source: 'peer_chat',
          _trigger_data: {
            message_text: _messageText,
            _detected_keywords: detection.detectedKeywords,
            _severity: detection._severity
          },
          _severity: detection._severity === 'immediate' ? 'crisis' : detection._severity,
          _crisis_system_activated: detection.requiresIntervention,
          _support_network_notified: detection.requiresIntervention
        });
    } catch (error) {
      console.error('Error logging crisis event:', error);
    }

    // Handle based on _severity
    if (detection._severity === 'immediate') {
      setShowCrisisOverlay(_true);
      handleCrisisActivated();
      
      toast.error('Crisis keywords detected - Emergency support activated', {
        description: 'Professional help is being contacted immediately',
        _duration: 10000,
        _action: {
          label: 'Call 988 Now',
          _onClick: () => window.open('tel:988', '_self')
        }
      });
    } else if (detection._severity === 'high') {
      setShowCrisisOverlay(_true);
      
      toast.warning('High-risk language detected', {
        description: 'Crisis support tools are available if you need them',
        _duration: 8000,
        _action: {
          label: 'Get Help',
          _onClick: () => handleCrisisActivated()
        }
      });
    } else if (detection._severity === 'medium') {
      toast.info('It sounds like you\'re going through a tough time', {
        description: 'Your peer supporter is here to help, and crisis support is available',
        _duration: 5000
      });
    }

    // Notify support network for high and immediate risks
    if (detection.requiresIntervention) {
      await notifySupportNetwork(detection, _messageText);
    }
  };

  // Notify support network of crisis
  const notifySupportNetwork = async (detection: CrisisDetection, _messageText: string) => {
    if (!user) return;

    try {
      const { data: supportNetwork } = await supabase
        .from('support_network')
        .select('_supporter_id, _supporter_name, relationship_type')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (supportNetwork && supportNetwork.length > 0) {
        const _notifications = supportNetwork.map(supporter => ({
          user_id: user.id,
          _supporter_id: supporter._supporter_id,
          _notification_type: 'crisis_alert',
          _title: `Crisis Language Detected in Peer Chat`,
          message: `Crisis keywords were detected in ${supporter.relationship_type === 'sponsor' ? 'your sponsee\'s' : 'your support person\'s'} peer chat conversation. They may need immediate support.`,
          _severity: detection._severity === 'immediate' ? 'crisis' : 'high',
          _action_required: _true,
          _metadata: {
            _trigger_source: 'peer_chat',
            _detected_keywords: detection.detectedKeywords,
            _session_id: currentSession?.id
          }
        }));

        await supabase
          .from('support_network_notifications')
          .insert(_notifications);
      }
    } catch (error) {
      console.error('Error notifying support network:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join chat queue
  const joinQueue = async (_priority: 'normal' | 'high' = 'normal', description?: string) => {
    if (!user) return;

    setLoading(_true);
    try {
      // Check if already in queue
      const { data: _existing } = await supabase
        .from('peer_support_queue')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (_existing) {
        toast.info('You are already in the support queue');
        setView('queue');
        return;
      }

      // Add to queue
      const { error } = await supabase
        .from('peer_support_queue')
        .insert({
          user_id: user.id,
          _priority,
          _issue_description: description
        });

      if (error) throw error;

      setView('queue');
      toast.success('Added to support queue');
      
      // Start polling for queue updates
      pollQueueStatus();
    } catch (error: unknown) {
      toast.error(`Failed to join queue: ${error.message}`);
    }
    setLoading(_false);
  };

  // Poll queue status
  const pollQueueStatus = () => {
    const _interval = setInterval(async () => {
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
        clearInterval(_interval);
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
          _estimated_wait_minutes: queue._estimated_wait_minutes || 5
        });
      } else {
        clearInterval(_interval);
      }
    }, 3000);

    return () => clearInterval(_interval);
  };

  // Send message with enhanced features and crisis detection
  const sendMessage = async () => {
    if (!newMessage.trim() && !fileUpload) return;

    try {
      const _messageText = newMessage.trim();
      
      // Check for crisis keywords if sending text message
      if (_messageText) {
        const _crisisDetection = detectCrisisKeywords(_messageText);
        if (_crisisDetection._severity !== 'none') {
          await handleCrisisDetection(_crisisDetection, _messageText);
        }
      }

      let _fileData;
      if (fileUpload) {
        // In a real app, you'd upload to storage first
        _fileData = {
          url: URL.createObjectURL(fileUpload),
          type: fileUpload.type,
          size: fileUpload.size
        };
      }

      await sendRealtimeMessage(
        _messageText || `Shared ${fileUpload?.name}`,
        fileUpload ? 'file' : 'text',
        replyToMessage?.id,
        _fileData
      );

      setNewMessage('');
      setReplyToMessage(_null);
      setFileUpload(_null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      toast.error(`Failed to send message: ${error.message}`);
    }
  };

  // Load chat messages
  const loadMessages = async (_sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('peer_chat_messages')
        .select('*')
        .eq('_session_id', _sessionId)
        .order('created_at', { ascending: _true });

      if (error) throw error;
      setMessages((data || []) as EnhancedChatMessage[]);
    } catch (error: unknown) {
      toast.error(`Failed to load messages: ${error.message}`);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!currentSession) return;

    loadMessages(currentSession.id);

    const _channel = supabase
      ._channel(`chat-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          _schema: 'public',
          _table: 'peer_chat_messages',
          _filter: `_session_id=eq.${currentSession.id}`
        },
        (payload) => {
          const newMessage = payload.new as EnhancedChatMessage;
          setMessages(prev => {
            // Avoid duplicates from real-time hook
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(_channel);
    };
  }, [currentSession]);

  // Crisis escalation
  const escalateToEmergency = async () => {
    if (!currentSession) return;

    const _confirmed = window.confirm(
      'This will immediately notify our crisis response team. Do you want to continue?'
    );

    if (_confirmed) {
      try {
        const { error } = await supabase
          .from('peer_chat_sessions')
          .update({
            status: 'escalated',
            _escalated_to_crisis: _true,
            _escalation_reason: 'User requested crisis escalation'
          })
          .eq('id', currentSession.id);

        if (error) throw error;

        toast.success('Crisis team has been notified');
        window.open('tel:988', '_self');
      } catch (error: unknown) {
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
          _ended_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setView('rating');
    } catch (error: unknown) {
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
          _user_feedback: feedback
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      toast.success('Thank you for your feedback!');
      setView('main');
      setCurrentSession(_null);
      setRating(0);
      setFeedback('');
    } catch (error: unknown) {
      toast.error(`Failed to submit rating: ${error.message}`);
    }
  };

  // Schedule video session (_placeholder)
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
                  <PresenceIndicator 
                    status="online" 
                    size="sm"
                  />
                  <UserCheck className="w-5 h-5 text-green-600" />
                  {currentSession.supporter?.display_name || 'Peer Supporter'}
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </Badge>
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
                <MessageSearch _sessionId={currentSession.id} />
                <Button 
                  size="sm" 
                  variant="outline"
                  _onClick={() => setView('video')}
                >
                  <Video className="w-4 h-4 mr-1" />
                  Video
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  _onClick={escalateToEmergency}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Crisis
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  _onClick={endChat}
                >
                  End Chat
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-4">
            {/* Reply indicator */}
            {replyToMessage && (
              <div className="mb-3 p-2 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 font-medium mb-1">
                      Replying to {replyToMessage.sender_type}
                    </p>
                    <p className="text-sm text-blue-700 truncate">
                      {replyToMessage.message_text}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    _onClick={() => setReplyToMessage(_null)}
                    className="ml-2 h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1 mb-4">
              {messages.map((message) => {
                const replyTo = message.reply_to_message_id 
                  ? messages.find(m => m.id === message.reply_to_message_id)
                  : undefined;

                return (
                  <EnhancedMessage
                    key={message.id}
                    message={message}
                    currentUserId={user?.id || ''}
                    isOwn={message.sender_id === user?.id}
                    onEdit={editMessage}
                    onDelete={deleteMessage}
                    onReply={(_messageId) => {
                      const msg = messages.find(m => m.id === _messageId);
                      if (msg) setReplyToMessage(msg);
                    }}
                    onReaction={(_messageId, emoji) => {
                      // Check if user already reacted
                      const msg = messages.find(m => m.id === _messageId);
                      const _hasReacted = msg?.reactions?.[emoji]?.includes(user?.id || '');
                      
                      if (_hasReacted) {
                        removeReaction(_messageId, emoji);
                      } else {
                        addReaction(_messageId, emoji);
                      }
                    }}
                    onBookmark={bookmarkMessage}
                    replyToMessage={replyTo}
                  />
                );
              })}
              
              <TypingIndicator 
                typingUsers={typingUsers} 
                className="px-4"
              />
              
              <div ref={messagesEndRef} />
            </div>

            {/* File upload preview */}
            {fileUpload && (
              <div className="mb-2 p-2 bg-gray-50 rounded border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 truncate">
                    {fileUpload.name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {(fileUpload.size / 1024 / 1024).toFixed(1)}MB
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  _onClick={() => {
                    setFileUpload(_null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ×
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFileUpload(file);
                }}
              />
              
              <Button 
                variant="ghost" 
                size="sm"
                _onClick={() => fileInputRef.current?.click()}
                className="px-2"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  // Update typing status
                  if (e.target.value.trim()) {
                    updateTypingStatus(_true);
                  } else {
                    updateTypingStatus(_false);
                  }
                }}
                _placeholder="Type your message..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                onBlur={() => updateTypingStatus(_false)}
                className="flex-1"
              />
              
              <Button _onClick={sendMessage} disabled={!newMessage.trim() && !fileUpload}>
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
                  _onClick={() => setRating(star)}
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
              Additional feedback (_optional)
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              _placeholder="Share your thoughts about the support you received..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              _onClick={() => setView('main')}
            >
              Skip
            </Button>
            <Button 
              className="flex-1"
              _onClick={submitRating}
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
            _onClick={() => setView('main')}
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
              _onClick={() => joinQueue('normal')}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : _null}
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
              Need urgent support? Get connected faster with _priority queue placement
            </p>
            <Button 
              variant="outline" 
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
              _onClick={() => joinQueue('high')}
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
              _onClick={scheduleVideoSession}
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
                _onClick={() => window.open('tel:988', '_self')}
              >
                Call 988
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-red-300 text-red-700 hover:bg-red-100"
                _onClick={() => window.open('sms:741741', '_self')}
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