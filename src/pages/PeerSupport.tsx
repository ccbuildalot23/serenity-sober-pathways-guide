import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Users, MessageCircle, Heart, Shield, AlertCircle, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
}

interface Peer {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
}

const PeerSupport = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Welcome to the peer support chat! How is everyone doing today?',
      sender: 'Sarah M.',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    },
    {
      id: '2',
      text: 'Hi everyone! Day 15 for me and feeling strong 💪',
      sender: 'Mike R.',
      timestamp: new Date(Date.now() - 180000), // 3 minutes ago
    },
    {
      id: '3',
      text: "That's amazing Mike! Keep up the great work!",
      sender: 'Lisa K.',
      timestamp: new Date(Date.now() - 60000), // 1 minute ago
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [showGuidelines, setShowGuidelines] = useState(false);

  const peers: Peer[] = [
    { id: '1', name: 'Sarah M.', status: 'online' },
    { id: '2', name: 'Mike R.', status: 'online' },
    { id: '3', name: 'Lisa K.', status: 'online' },
    { id: '4', name: 'David P.', status: 'offline', lastSeen: new Date(Date.now() - 3600000) },
    { id: '5', name: 'Emma W.', status: 'offline', lastSeen: new Date(Date.now() - 7200000) },
  ];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        text: newMessage,
        sender: 'You',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-transparent to-purple-100/50" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <motion.div 
                className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Users className="w-8 h-8 text-white" />
              </motion.div>
              Peer Support
            </h1>
            <p className="mt-3 text-gray-700 text-lg font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Connect with others on similar journeys
            </p>
            <p className="mt-1 text-gray-600">
              Safe space for sharing and mutual support
            </p>
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/patient/dashboard')}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold">Peer Support Chat</h1>
            <p className="text-gray-400">Connect with others on the recovery journey</p>
          </div>

          <Button
            onClick={() => setShowGuidelines(true)}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <Shield className="w-4 h-4 mr-2" />
            Guidelines
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
          {/* Peer List */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-4" data-testid="peer-list">
            <h2 className="text-lg font-semibold flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Online Peers ({peers.filter(p => p.status === 'online').length})
            </h2>
            
            <div className="space-y-2">
              {peers.map((peer) => (
                <div
                  key={peer.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        peer.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-sm font-medium">{peer.name}</span>
                  </div>
                  {peer.status === 'offline' && peer.lastSeen && (
                    <span className="text-xs text-gray-400">
                      {formatTime(peer.lastSeen)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-600">
              <p className="text-xs text-gray-400">
                This is a safe space for mutual support. Be kind and respectful to everyone.
              </p>
            </div>
          </div>

          {/* Chat Room */}
          <div className="lg:col-span-3 bg-gray-800 rounded-xl flex flex-col" data-testid="peer-support-chat">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Recovery Support Group
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Live</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto" data-testid="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  data-testid="chat-message"
                  className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                      message.sender === 'You'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" data-testid="message-author">{message.sender}</span>
                      <span className="text-xs opacity-70" data-testid="message-timestamp">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-600">
              <div className="flex space-x-2">
                <Input
                  data-testid="chat-message-input"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <Button
                  onClick={handleSendMessage}
                  data-testid="send-message-button"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => navigate('/crisis-support')}
            className="h-16 bg-red-600 hover:bg-red-700"
          >
            <AlertCircle className="w-5 h-5 mr-2" />
            Crisis Support
          </Button>
          
          <Button
            onClick={() => navigate('/community')}
            className="h-16 bg-green-600 hover:bg-green-700"
          >
            <Heart className="w-5 h-5 mr-2" />
            Community
          </Button>
          
          <Button
            onClick={() => navigate('/motivation')}
            className="h-16 bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Motivation
          </Button>
        </div>

        {/* Community Guidelines Modal */}
        {showGuidelines && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full space-y-6" data-testid="guidelines-modal">
              <div className="text-center space-y-4">
                <Shield className="w-12 h-12 text-blue-500 mx-auto" />
                <h3 className="text-xl font-semibold">Community Guidelines</h3>
                <div className="text-left space-y-3 text-sm text-gray-300" data-testid="guidelines-content">
                  <p><strong>Community Guidelines</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Be kind and supportive to others</li>
                    <li>Respect everyone's privacy and confidentiality</li>
                    <li>No judgment or criticism</li>
                    <li>Share from your own experience</li>
                    <li>If you're in crisis, contact emergency services</li>
                    <li>No medical advice - consult professionals</li>
                    <li>Keep conversations recovery-focused</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowGuidelines(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  I Understand
                </Button>
                <Button
                  onClick={() => setShowGuidelines(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default PeerSupport;