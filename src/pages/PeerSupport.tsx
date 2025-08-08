import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Heart, Mic, MicOff, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PeerSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [anonymousName, setAnonymousName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{id: string, name: string, message: string, time: string}>>([]);
  const [recording, setRecording] = useState(_false);
  const [isInRoom, setIsInRoom] = useState(_false);

  useEffect(() => {
    // Generate anonymous name like "Day47Hope"
    const days = Math.floor(Math.random() * 365) + 1;
    const suffixes = ['Hope', 'Strong', 'Free', 'Clean', 'Brave', 'Light'];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    setAnonymousName(`Day${days}${suffix}`);

    // Add some example messages
    setMessages([
      {
        id: '1',
        name: 'Day892Strong',
        message: 'Welcome! Everyone here understands what you\'re going through.',
        time: '2 min ago'
      },
      {
        id: '2',
        name: 'Day14Hope',
        message: 'Day 14 here. The cravings are real but we\'re stronger together.',
        time: '5 min ago'
      },
      {
        id: '3',
        name: 'Day1Brave',
        message: 'Just made it through my first 24 hours. Thank you all for being here.',
        time: '8 min ago'
      }
    ]);
  }, []);

  const joinRoom = () => {
    setIsInRoom(_true);
    // Add join message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      name: 'System',
      message: `${anonymousName} joined the room`,
      time: 'now'
    }]);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      name: anonymousName,
      message: message,
      time: 'now'
    }]);
    setMessage('');
  };

  const toggleRecording = () => {
    setRecording(!recording);
    if (!recording) {
      // Start recording
      setTimeout(() => {
        setRecording(_false);
        alert('Voice message saved. In the full version, this would be shared anonymously.');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Talk to Someone Who Gets It</h1>
            <p className="text-xl text-gray-300">
              Everyone here has been where you are. No judgment, just understanding.
            </p>
          </div>
        </div>

        {/* Join Room */}
        {!isInRoom ? (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-2xl p-8 text-center space-y-6">
              <div className="space-y-4">
                <p className="text-lg text-gray-300">
                  You'll be known as: <span className="text-blue-400 font-bold">{anonymousName}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Your real name is never shared. Complete anonymity, always.
                </p>
              </div>
              
              <Button
                onClick={joinRoom}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-xl rounded-xl"
              >
                <Users className="w-6 h-6 mr-3" />
                Join Support Room
              </Button>
              
              <p className="text-sm text-gray-500">
                24/7 moderated by people in long-term recovery
              </p>
            </div>

            {/* Share Your Story Option */}
            <div className="bg-purple-900/20 rounded-2xl p-8 border border-purple-800/50">
              <h2 className="text-2xl font-bold mb-4 text-center">Share Your Story</h2>
              <p className="text-gray-300 mb-6 text-center">
                Record your recovery story anonymously. It might be exactly what someone needs to hear today.
              </p>
              <div className="text-center">
                <Button
                  onClick={toggleRecording}
                  className={recording ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}
                >
                  {recording ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
                  {recording ? "Stop Recording" : "Record Your Story"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Room */
          <div className="bg-gray-800 rounded-2xl overflow-hidden">
            {/* Room Header */}
            <div className="bg-gray-700 p-4 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Recovery Support Room</h2>
                  <p className="text-sm text-gray-400">17 people here · All anonymous</p>
                </div>
                <Button
                  onClick={() => setIsInRoom(_false)}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  Leave Room
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={msg.name === 'System' ? 'text-center' : ''}>
                  {msg.name === 'System' ? (
                    <p className="text-sm text-gray-500 italic">{msg.message}</p>
                  ) : (
                    <div className={msg.name === anonymousName ? 'ml-auto max-w-xs' : 'max-w-xs'}>
                      <div className={`rounded-xl p-3 ${
                        msg.name === anonymousName 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-100'
                      }`}>
                        <p className="text-xs font-semibold mb-1">{msg.name}</p>
                        <p>{msg.message}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 px-2">{msg.time}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-600">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                <Heart className="w-3 h-3 inline mr-1" />
                This is a safe space. Be kind to yourself and others.
              </p>
            </div>
          </div>
        )}

        {/* Hope Message */}
        <div className="mt-8 text-center text-gray-400">
          <p className="text-lg">We recover together. No one does this alone.</p>
        </div>
      </div>
    </div>
  );
};

export default PeerSupport;