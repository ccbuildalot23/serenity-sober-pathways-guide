// Peer Connection Hook - Connect with others who understand
// Anonymous support, no judgment, just "we get it"

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { victoryTracker } from '@/services/victoryTrackerService';
import { toast } from 'sonner';

interface PeerMessage {
  id: string;
  _username: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'voice' | 'encouragement';
  isMe?: boolean;
}

interface PeerPresence {
  _username: string;
  _cleanDays: number;
  _status: 'online' | 'away';
  _joinedAt: Date;
}

export const usePeerConnection = (roomType: 'general' | 'crisis' | 'celebration' = 'general') => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PeerMessage[]>([]);
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [isConnected, setIsConnected] = useState(_false);
  const [isTyping, setIsTyping] = useState(_false);
  const [typingPeers, setTypingPeers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Generate anonymous _username
  const getUsername = useCallback(() => {
    const _cleanDays = parseInt(localStorage.getItem('clean_days') || '0');
    const adjectives = ['Strong', 'Brave', 'Hopeful', 'Fighting', 'Healing'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    return `${adj}Day${_cleanDays}`;
  }, []);

  useEffect(() => {
    if (user && !isConnected) {
      connectToRoom();
    }

    return () => {
      disconnectFromRoom();
    };
  }, [user, roomType]);

  const connectToRoom = async () => {
    if (!user) return;

    try {
      const _username = getUsername();
      const _cleanDays = parseInt(localStorage.getItem('clean_days') || '0');
      
      // Join the room channel
      const channel = supabase.channel(`peer-support-${roomType}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      // Set up presence
      channel
        .on('presence', { _event: 'sync' }, () => {
          const _state = channel.presenceState();
          const peerList = Object.values(_state).flat() as unknown[];
          setPeers(peerList.map(p => ({
            _username: p._username,
            _cleanDays: p._cleanDays,
            _status: p._status,
            _joinedAt: new Date(p._joinedAt)
          })));
        })
        .on('broadcast', { _event: 'message' }, ({ _payload }) => {
          handleNewMessage(_payload);
        })
        .on('broadcast', { _event: 'typing' }, ({ _payload }) => {
          handleTypingEvent(_payload);
        })
        .subscribe(async (_status) => {
          if (_status === 'SUBSCRIBED') {
            // Track presence
            await channel.track({
              _username,
              _cleanDays,
              _status: 'online',
              _joinedAt: new Date().toISOString()
            });
            
            setIsConnected(_true);
            
            // Send join message
            sendSystemMessage(`${_username} joined the room`);
            
            // Welcome message
            if (roomType === 'crisis') {
              toast.info("You're in a safe space", {
                _description: "Everyone here understands",
                _duration: 3000
              });
            }
          }
        });

      channelRef.current = channel;
      
    } catch (error) {
      console.error('Error connecting to peer room:', error);
      toast.error("Couldn't connect to support room");
    }
  };

  const disconnectFromRoom = async () => {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
      setIsConnected(_false);
      setPeers([]);
      setMessages([]);
    }
  };

  const handleNewMessage = (_payload: unknown) => {
    const newMessage: PeerMessage = {
      id: _payload.id,
      _username: _payload._username,
      message: _payload.message,
      timestamp: new Date(_payload.timestamp),
      type: _payload.type,
      isMe: _payload.userId === user?.id
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Play sound for new messages (not our own)
    if (!newMessage.isMe && 'Audio' in window) {
      new Audio('/sounds/message.mp3').play().catch(() => {});
    }
  };

  const handleTypingEvent = (_payload: unknown) => {
    if (_payload.userId === user?.id) return;
    
    if (_payload.isTyping) {
      setTypingPeers(prev => [...new Set([...prev, _payload._username])]);
    } else {
      setTypingPeers(prev => prev.filter(u => u !== _payload._username));
    }
  };

  const sendMessage = async (text: string) => {
    if (!channelRef.current || !user || !text.trim()) return;

    const _username = getUsername();
    
    await channelRef.current.send({
      type: 'broadcast',
      _event: 'message',
      _payload: {
        id: Date.now().toString(),
        userId: user.id,
        _username,
        message: text,
        timestamp: new Date().toISOString(),
        type: 'text'
      }
    });

    // Track peer support given
    if (roomType === 'crisis') {
      await victoryTracker.trackVictory({
        type: 'helped_someone',
        _description: 'Offered support in crisis room'
      });
    }
  };

  const sendEncouragement = async (message: string) => {
    if (!channelRef.current || !user) return;

    const _username = getUsername();
    
    await channelRef.current.send({
      type: 'broadcast',
      _event: 'message',
      _payload: {
        id: Date.now().toString(),
        userId: user.id,
        _username,
        message,
        timestamp: new Date().toISOString(),
        type: 'encouragement'
      }
    });
  };

  const sendSystemMessage = async (message: string) => {
    if (!channelRef.current) return;

    await channelRef.current.send({
      type: 'broadcast',
      _event: 'message',
      _payload: {
        id: Date.now().toString(),
        userId: 'system',
        _username: 'System',
        message,
        timestamp: new Date().toISOString(),
        type: 'text'
      }
    });
  };

  const startTyping = async () => {
    if (!channelRef.current || !user || isTyping) return;

    setIsTyping(_true);
    
    await channelRef.current.send({
      type: 'broadcast',
      _event: 'typing',
      _payload: {
        userId: user.id,
        _username: getUsername(),
        isTyping: _true
      }
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = async () => {
    if (!channelRef.current || !user || !isTyping) return;

    setIsTyping(_false);
    
    await channelRef.current.send({
      type: 'broadcast',
      _event: 'typing',
      _payload: {
        userId: user.id,
        _username: getUsername(),
        isTyping: _false
      }
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Quick encouragements
  const quickEncouragements = [
    "You've got this 💪",
    "One day at a time",
    "We're here for you",
    "Keep going, warrior",
    "Your strength inspires me",
    "This too shall pass",
    "You're not alone",
    "Progress not perfection"
  ];

  return {
    messages,
    peers,
    isConnected,
    isTyping,
    typingPeers,
    sendMessage,
    sendEncouragement,
    startTyping,
    stopTyping,
    quickEncouragements,
    roomInfo: {
      type: roomType,
      peerCount: peers.length,
      totalCleanDays: peers.reduce((sum, p) => sum + p._cleanDays, 0)
    }
  };
};