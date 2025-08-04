// Anonymous Peer Chat - "We get it" support from others in recovery
// No real names, just understanding

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Heart, Users, Mic } from 'lucide-react';
import { usePeerConnection } from '@/hooks/usePeerConnection';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnonymousChatProps {
  roomType?: 'general' | 'crisis' | 'celebration';
}

export const AnonymousChat: React.FC<AnonymousChatProps> = ({ roomType = 'general' }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    peers,
    isConnected,
    typingPeers,
    sendMessage,
    sendEncouragement,
    startTyping,
    quickEncouragements,
    roomInfo
  } = usePeerConnection(roomType);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoomTitle = () => {
    switch (roomType) {
      case 'crisis':
        return "Crisis Support Room";
      case 'celebration':
        return "Victory Celebration Room";
      default:
        return "Recovery Chat";
    }
  };

  const getRoomDescription = () => {
    switch (roomType) {
      case 'crisis':
        return "Everyone here understands. No judgment.";
      case 'celebration':
        return "Share your wins, no matter how small!";
      default:
        return "Anonymous support from people who get it.";
    }
  };

  return (
    <Card className="h-[600px] bg-gray-900 border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{getRoomTitle()}</h3>
            <p className="text-sm text-gray-400">{getRoomDescription()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-gray-700">
              <Users className="w-3 h-3 mr-1" />
              {peers.length} here
            </Badge>
            {isConnected && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet. Be the first to share.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.isMe ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-4 py-2",
                  msg.isMe
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-200",
                  msg.type === 'encouragement' && "bg-gradient-to-r from-pink-600 to-purple-600"
                )}
              >
                {!msg.isMe && (
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {msg.username}
                  </p>
                )}
                <p className="text-sm">{msg.message}</p>
                <p className="text-xs opacity-60 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {typingPeers.length > 0 && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
            </div>
            <span>
              {typingPeers.length === 1 
                ? `${typingPeers[0]} is typing...`
                : `${typingPeers.length} people are typing...`
              }
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Encouragements */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickEncouragements.map((enc, idx) => (
            <Button
              key={idx}
              size="sm"
              variant="outline"
              className="whitespace-nowrap text-xs border-gray-700 hover:bg-gray-800"
              onClick={() => sendEncouragement(enc)}
            >
              {enc}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              startTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder={
              roomType === 'crisis' 
                ? "Share what's on your mind..." 
                : "Type your message..."
            }
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            disabled={!isConnected}
          />
          
          <Button
            onClick={handleSend}
            disabled={!message.trim() || !isConnected}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
          
          {/* Voice message button (future feature) */}
          <Button
            variant="outline"
            className="border-gray-700 hover:bg-gray-800"
            disabled
            title="Voice messages coming soon"
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>
        
        {!isConnected && (
          <p className="text-xs text-red-400 mt-2">
            Connecting to chat room...
          </p>
        )}
      </div>
    </Card>
  );
};