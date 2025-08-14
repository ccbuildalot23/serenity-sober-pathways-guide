import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  AlertTriangle, 
  Heart,
  Sparkles,
  Loader2,
  Phone,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  aiTherapyService, 
  type AITherapySession, 
  type AIMessage,
  type RiskAssessment 
} from '@/services/aiTherapyService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AIChatWidgetProps {
  className?: string;
  onCrisisDetected?: (assessment: RiskAssessment) => void;
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ 
  className,
  onCrisisDetected 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<AITherapySession | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [showCrisisResources, setShowCrisisResources] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session when widget opens
  useEffect(() => {
    if (isOpen && !session && user) {
      initializeSession();
    }
  }, [isOpen, user]);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      const newSession = await aiTherapyService.startSession(user?.id || 'anonymous');
      setSession(newSession);
      setMessages(newSession.messages.filter(m => m.role !== 'system'));
      setRiskLevel(newSession.riskLevel);
    } catch (error) {
      console.error('Failed to start AI session:', error);
      toast.error('Failed to start chat session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !session || isTyping) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    // Add user message to UI immediately
    const tempUserMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Process message and get AI response
      const aiResponse = await aiTherapyService.processMessage(session.id, userMessage);
      
      // Update messages with AI response
      setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), aiResponse]);
      
      // Check for crisis detection
      if (aiResponse.riskAssessment) {
        setRiskLevel(aiResponse.riskAssessment.level);
        if (aiResponse.riskAssessment.requiresEscalation) {
          setShowCrisisResources(true);
          onCrisisDetected?.(aiResponse.riskAssessment);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRiskIndicator = () => {
    switch (riskLevel) {
      case 'critical':
        return { color: 'text-red-500', bg: 'bg-red-100', label: 'Crisis Support Active' };
      case 'high':
        return { color: 'text-orange-500', bg: 'bg-orange-100', label: 'High Support' };
      case 'medium':
        return { color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Moderate Support' };
      default:
        return { color: 'text-green-500', bg: 'bg-green-100', label: 'Active Listening' };
    }
  };

  const riskIndicator = getRiskIndicator();

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              className
            )}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              size="icon"
            >
              <Sparkles className="h-6 w-6" />
            </Button>
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col",
              "border border-gray-200",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white/20">
                  <AvatarFallback className="bg-white/20 text-white">
                    <Sparkles className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">Serenity AI</h3>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs opacity-90">Always here for you</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Risk Level Indicator */}
            <div className={cn("px-4 py-2", riskIndicator.bg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className={cn("h-4 w-4", riskIndicator.color)} />
                  <span className={cn("text-sm font-medium", riskIndicator.color)}>
                    {riskIndicator.label}
                  </span>
                </div>
                {(riskLevel === 'high' || riskLevel === 'critical') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setShowCrisisResources(!showCrisisResources)}
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Crisis Help
                  </Button>
                )}
              </div>
            </div>

            {/* Crisis Resources Alert */}
            {showCrisisResources && (
              <Alert className="mx-4 mt-2 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm">
                  <strong className="block mb-1">Immediate Help Available:</strong>
                  <div className="space-y-1 text-xs">
                    <div>• Crisis Lifeline: <strong>988</strong> (24/7)</div>
                    <div>• Text "HELLO" to <strong>741741</strong></div>
                    <div>• Emergency: <strong>911</strong></div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <span className={cn(
                        "text-xs mt-1 block",
                        message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                      )}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </motion.div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                        <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                        <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share what's on your mind..."
                  className="flex-1"
                  disabled={isLoading || isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || isTyping}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                <Shield className="h-3 w-3 inline mr-1" />
                Your conversations are encrypted and confidential
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};