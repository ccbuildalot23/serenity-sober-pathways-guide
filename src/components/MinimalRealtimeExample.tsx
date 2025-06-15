
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RealtimeChannel } from '@supabase/supabase-js';

export const MinimalRealtimeExample: React.FC = () => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [messages, setMessages] = useState<string[]>([]);
  const [lastPing, setLastPing] = useState<Date | null>(null);

  const addMessage = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    setMessages(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  const connect = async () => {
    if (channel) {
      channel.unsubscribe();
    }

    addMessage('Creating minimal realtime channel...');
    
    const newChannel = supabase.channel('minimal-test', {
      config: {
        broadcast: { self: true }
      }
    });

    newChannel
      .on('broadcast', { event: 'ping' }, (payload) => {
        addMessage(`Ping received: ${JSON.stringify(payload)}`);
        setLastPing(new Date());
      })
      .subscribe((channelStatus) => {
        addMessage(`Channel status: ${channelStatus}`);
        setStatus(channelStatus);
        
        if (channelStatus === 'SUBSCRIBED') {
          addMessage('Successfully connected! Sending test ping...');
          
          // Send a test ping
          newChannel.send({
            type: 'broadcast',
            event: 'ping',
            payload: { message: 'test-ping', timestamp: Date.now() }
          });
        }
      });

    setChannel(newChannel);
  };

  const disconnect = () => {
    if (channel) {
      addMessage('Disconnecting channel...');
      channel.unsubscribe();
      setChannel(null);
      setStatus('disconnected');
    }
  };

  const sendPing = () => {
    if (channel && status === 'SUBSCRIBED') {
      addMessage('Sending manual ping...');
      channel.send({
        type: 'broadcast',
        event: 'ping',
        payload: { 
          message: 'manual-ping', 
          timestamp: Date.now(),
          random: Math.random() 
        }
      });
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBSCRIBED':
        return 'bg-green-100 text-green-800';
      case 'CHANNEL_ERROR':
        return 'bg-red-100 text-red-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  useEffect(() => {
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [channel]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Minimal Realtime Test</h1>
        <p className="text-gray-600">Simple test to verify basic realtime functionality</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Connection Status
            <Badge className={getStatusColor(status)}>
              {status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={connect}
              disabled={status === 'SUBSCRIBED'}
              variant={status === 'SUBSCRIBED' ? 'secondary' : 'default'}
            >
              Connect
            </Button>
            <Button 
              onClick={disconnect}
              disabled={status === 'disconnected'}
              variant="outline"
            >
              Disconnect
            </Button>
            <Button 
              onClick={sendPing}
              disabled={status !== 'SUBSCRIBED'}
              variant="outline"
            >
              Send Ping
            </Button>
            <Button 
              onClick={clearMessages}
              variant="ghost"
              size="sm"
            >
              Clear
            </Button>
          </div>
          
          {lastPing && (
            <div className="text-sm text-gray-600">
              Last ping: {lastPing.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages ({messages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-sm">No messages yet. Click "Connect" to start.</p>
            ) : (
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {messages.join('\n')}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>1. Click "Connect" to establish a realtime channel</p>
          <p>2. If successful, you should see "SUBSCRIBED" status and receive a test ping</p>
          <p>3. Use "Send Ping" to test manual message sending</p>
          <p>4. If this works, your basic realtime setup is correct</p>
          <p className="font-semibold text-amber-600">
            Note: This test doesn't require any database tables or complex setup
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MinimalRealtimeExample;
