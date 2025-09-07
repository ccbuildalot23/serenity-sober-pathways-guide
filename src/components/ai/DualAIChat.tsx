import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Stethoscope, 
  Send, 
  AlertCircle, 
  Heart,
  Brain,
  Loader2,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Message {
  id: string;
  type: 'user' | 'peer' | 'clinical';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface AIMode {
  id: 'peer' | 'clinical';
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  avatar: string;
  greeting: string;
}

const AI_MODES: Record<string, AIMode> = {
  peer: {
    id: 'peer',
    name: 'Peer Support',
    description: 'Talk to someone who understands',
    icon: <Heart className="h-5 w-5" />,
    color: 'bg-blue-500',
    avatar: '👥',
    greeting: "Hi there! I'm here to listen and support you. I understand what you're going through, and you're not alone in this journey."
  },
  clinical: {
    id: 'clinical',
    name: 'Clinical Guidance',
    description: 'Get professional recommendations',
    icon: <Stethoscope className="h-5 w-5" />,
    color: 'bg-green-500',
    avatar: '🏥',
    greeting: "Hello! I'm here to provide evidence-based guidance and clinical recommendations. How can I assist you today?"
  }
};

export function DualAIChat() {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<'peer' | 'clinical'>('peer');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with greeting message when mode changes
  useEffect(() => {
    const mode = AI_MODES[selectedMode];
    const greetingMessage: Message = {
      id: `greeting-${Date.now()}`,
      type: selectedMode === 'peer' ? 'peer' : 'clinical',
      content: mode.greeting,
      timestamp: new Date()
    };
    setMessages([greetingMessage]);
  }, [selectedMode]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Crisis detection
  const detectCrisisKeywords = (text: string): boolean => {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'want to die',
      'self harm', 'hurt myself', 'overdose', 'not worth living'
    ];
    const lowerText = text.toLowerCase();
    return crisisKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Simulate AI response (replace with actual AI integration)
  const generateAIResponse = async (userMessage: string, mode: 'peer' | 'clinical'): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check for crisis keywords
    if (detectCrisisKeywords(userMessage)) {
      setShowCrisisAlert(true);
      if (mode === 'peer') {
        return "I hear that you're going through something really difficult right now. Your feelings are valid, and I'm here with you. Would you like to talk to someone who can provide immediate support? The crisis helpline (988) is available 24/7, and they have caring professionals ready to listen.";
      } else {
        return "Based on what you've shared, I recommend immediate support. Please contact the 988 Suicide & Crisis Lifeline or go to your nearest emergency room. Your safety is the top priority. Would you like me to help you connect with crisis support services?";
      }
    }

    // Sample responses based on mode
    if (mode === 'peer') {
      const responses = [
        "I understand how challenging that must be. You're showing real strength by reaching out and talking about it.",
        "That sounds really tough. Remember, recovery isn't linear - it's okay to have difficult days.",
        "You're not alone in feeling this way. Many of us have been there, and it does get better with time and support.",
        "I hear you, and your feelings are completely valid. What's been helping you cope lately?",
        "Thank you for sharing that with me. It takes courage to open up about these feelings."
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    } else {
      const responses = [
        "Based on current clinical guidelines, I recommend incorporating mindfulness exercises and cognitive behavioral techniques. Would you like specific exercises?",
        "Research shows that maintaining consistent sleep schedules and regular physical activity can significantly impact mood. Let's create a structured plan.",
        "Your symptoms suggest you might benefit from professional evaluation. I can help you prepare questions for your healthcare provider.",
        "Evidence-based interventions for your situation include behavioral activation and thought challenging. Shall we explore these techniques?",
        "Clinical studies indicate that combining therapy with lifestyle modifications yields the best outcomes. Let's discuss a comprehensive approach."
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Show typing indicator
    const typingMessage: Message = {
      id: `typing-${Date.now()}`,
      type: selectedMode === 'peer' ? 'peer' : 'clinical',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await generateAIResponse(userMessage.content, selectedMode);
      
      // Remove typing indicator and add actual response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isTyping);
        return [...filtered, {
          id: `ai-${Date.now()}`,
          type: selectedMode === 'peer' ? 'peer' : 'clinical',
          content: response,
          timestamp: new Date()
        }];
      });
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast.error('Failed to get response. Please try again.');
      // Remove typing indicator on error
      setMessages(prev => prev.filter(m => !m.isTyping));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">AI Support Chat</CardTitle>
          <Badge variant="outline" className="ml-2">
            Beta Feature
          </Badge>
        </div>
        
        {/* Mode Selection */}
        <Tabs value={selectedMode} onValueChange={(v) => setSelectedMode(v as 'peer' | 'clinical')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="peer" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Peer Support
            </TabsTrigger>
            <TabsTrigger value="clinical" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Clinical Guidance
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Mode Description */}
        <div className="mt-3 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            {AI_MODES[selectedMode].icon}
            <span className="font-medium">{AI_MODES[selectedMode].name}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {AI_MODES[selectedMode].description}
          </p>
        </div>

        {/* Crisis Alert */}
        <AnimatePresence>
          {showCrisisAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3"
            >
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Crisis Support Available:</strong> If you're in crisis, please call 988 (Suicide & Crisis Lifeline) 
                  or text "HELLO" to 741741 (Crisis Text Line). Help is available 24/7.
                  <Button 
                    variant="link" 
                    className="ml-2 p-0 h-auto"
                    onClick={() => window.location.href = '/crisis-help'}
                  >
                    Get immediate help →
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type !== 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={message.type === 'peer' ? 'bg-blue-100' : 'bg-green-100'}>
                      {message.type === 'peer' ? '👥' : '🏥'}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[70%] ${message.type === 'user' ? 'order-first' : ''}`}>
                  {message.isTyping ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Typing...</span>
                    </div>
                  ) : (
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.type === 'peer'
                          ? 'bg-blue-50 dark:bg-blue-950 text-foreground'
                          : 'bg-green-50 dark:bg-green-950 text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t">
          <Alert className="mb-3">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This AI provides supportive guidance but is not a replacement for professional mental health care. 
              In emergencies, please contact 988 or emergency services.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Type your message to ${AI_MODES[selectedMode].name}...`}
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}