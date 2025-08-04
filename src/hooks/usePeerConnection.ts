// Peer Connection Hook - Connect with others who understand
// Anonymous support, no judgment, just "we get it"

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { hopeMessenger } from '@/services/hopeMessengerService';
import { victoryTracker } from '@/services/victoryTrackerService';
import { toast } from 'sonner';

interface PeerMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'voice' | 'encouragement';
  isMe?: boolean;
}

interface PeerPresence {
  username: string;
  cleanDays: number;
  status: 'online' | 'away';
  joinedAt: Date;
}

export const usePeerConnection = (roomType: 'general' | 'crisis' | 'celebration' = 'general') => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PeerMessage[]>([]);
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingPeers, setTypingPeers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Generate anonymous username
  const getUsername = useCallback(() => {
    const cleanDays = parseInt(localStorage.getItem('clean_days') || '0');
    const adjectives = ['Strong', 'Brave', 'Hopeful', 'Fighting', 'Healing'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    return `${adj}Day${cleanDays}`;
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
      const username = getUsername();
      const cleanDays = parseInt(localStorage.getItem('clean_days') || '0');
      
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
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const peerList = Object.values(state).flat() as any[];
          setPeers(peerList.map(p => ({
            username: p.username,
            cleanDays: p.cleanDays,
            status: p.status,
            joinedAt: new Date(p.joinedAt)
          })));
        })
        .on('broadcast', { event: 'message' }, ({ payload }) => {
          handleNewMessage(payload);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          handleTypingEvent(payload);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track presence
            await channel.track({
              username,
              cleanDays,
              status: 'online',
              joinedAt: new Date().toISOString()
            });
            
            setIsConnected(true);
            
            // Send join message
            sendSystemMessage(`${username} joined the room`);
            
            // Welcome message
            if (roomType === 'crisis') {
              toast.info("You're in a safe space", {
                description: "Everyone here understands",
                duration: 3000
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
      setIsConnected(false);
      setPeers([]);
      setMessages([]);
    }
  };

  const handleNewMessage = (payload: any) => {
    const newMessage: PeerMessage = {
      id: payload.id,
      username: payload.username,
      message: payload.message,
      timestamp: new Date(payload.timestamp),
      type: payload.type,
      isMe: payload.userId === user?.id
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Play sound for new messages (not our own)
    if (!newMessage.isMe && 'Audio' in window) {
      new Audio('/sounds/message.mp3').play().catch(() => {});
    }
  };

  const handleTypingEvent = (payload: any) => {
    if (payload.userId === user?.id) return;
    
    if (payload.isTyping) {
      setTypingPeers(prev => [...new Set([...prev, payload.username])]);
    } else {
      setTypingPeers(prev => prev.filter(u => u !== payload.username));
    }
  };

  const sendMessage = async (text: string) => {
    if (!channelRef.current || !user || !text.trim()) return;

    const username = getUsername();
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        id: Date.now().toString(),
        userId: user.id,
        username,
        message: text,
        timestamp: new Date().toISOString(),
        type: 'text'
      }
    });

    // Track peer support given
    if (roomType === 'crisis') {
      await victoryTracker.trackVictory({
        type: 'helped_someone',
        description: 'Offered support in crisis room'
      });
    }
  };

  const sendEncouragement = async (message: string) => {
    if (!channelRef.current || !user) return;

    const username = getUsername();
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        id: Date.now().toString(),
        userId: user.id,
        username,
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
      event: 'message',
      payload: {
        id: Date.now().toString(),
        userId: 'system',
        username: 'System',
        message,
        timestamp: new Date().toISOString(),
        type: 'text'
      }
    });
  };

  const startTyping = async () => {
    if (!channelRef.current || !user || isTyping) return;

    setIsTyping(true);
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        username: getUsername(),
        isTyping: true
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

    setIsTyping(false);
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        username: getUsername(),
        isTyping: false
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
      totalCleanDays: peers.reduce((sum, p) => sum + p.cleanDays, 0)
    }
  };
};