import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Heart, 
  Shield, 
  Users, 
  Bell,
  MessageCircle,
  MapPin,
  Send,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Simple messaging interface for supporters
interface SupportMessage {
  id: string;
  sender_name: string;
  message: string;
  timestamp: string;
  isFromPatient: boolean;
  read: boolean;
}

interface LocationShare {
  id: string;
  patient_name: string;
  address: string;
  timestamp: string;
  isEmergency: boolean;
}

const SupporterDashboard = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: '1',
      sender_name: 'Recovery Partner',
      message: 'Hi, I wanted to share my location with you for safety.',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      isFromPatient: true,
      read: false
    },
    {
      id: '2',
      sender_name: 'Recovery Partner',
      message: 'I completed my daily check-in today!',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      isFromPatient: true,
      read: true
    }
  ]);

  const [locationShares] = useState<LocationShare[]>([
    {
      id: '1',
      patient_name: 'Recovery Partner',
      address: '123 Recovery St, New York, NY',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      isEmergency: false
    }
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [selectedPatientId] = useState('patient-1');

  const unreadCount = messages.filter(msg => !msg.read && msg.isFromPatient).length;

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: SupportMessage = {
      id: Date.now().toString(),
      sender_name: 'You',
      message: newMessage,
      timestamp: new Date().toISOString(),
      isFromPatient: false,
      read: true
    };

    setMessages(prev => [message, ...prev]);
    setNewMessage('');
  };

  const handleMarkAsRead = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, read: true } : msg
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Heart className="w-8 h-8 text-primary" />
                Supporter Dashboard
              </h1>
              <p className="mt-2 text-muted-foreground">
                Supporting your loved one's recovery journey with real-time communication.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1">
                <Bell className="w-3 h-3" />
                {unreadCount} Unread
              </Badge>
              <Badge variant="secondary">
                Support Member
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Messages</p>
                  <p className="text-3xl font-bold text-foreground">{messages.length}</p>
                </div>
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unread</p>
                  <p className="text-3xl font-bold text-foreground">{unreadCount}</p>
                </div>
                <Bell className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Locations</p>
                  <p className="text-3xl font-bold text-foreground">{locationShares.length}</p>
                </div>
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-lg font-bold text-green-600">Connected</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Recent Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Messages List */}
                <div className="h-96 overflow-y-auto space-y-3 border rounded-lg p-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg max-w-[80%] cursor-pointer ${
                        !message.isFromPatient
                          ? 'ml-auto bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                      onClick={() => !message.read && handleMarkAsRead(message.id)}
                    >
                      <div className="flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{message.sender_name}</p>
                          <p className="text-sm mt-1">{message.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-70">
                              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                            </span>
                            {!message.read && message.isFromPatient && (
                              <Badge variant="destructive" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Shares */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shared Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locationShares.map((location) => (
                  <div key={location.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{location.patient_name}</span>
                          {location.isEmergency && (
                            <Badge variant="destructive" className="text-xs">
                              Emergency
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {location.address}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(location.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View on Map
                      </Button>
                    </div>
                  </div>
                ))}
                {locationShares.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No locations shared yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Actions */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full" variant="outline">
                  Send Encouragement
                </Button>
                <Button className="w-full" variant="outline">
                  Request Check-in
                </Button>
                <Button className="w-full" variant="outline">
                  Emergency Contact
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Safety Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Location Sharing Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can see their location when shared
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Emergency Alerts Enabled</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll be notified of any emergency situations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crisis Support */}
        <div className="mt-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-destructive">
                Crisis Support Information
              </h3>
              <p className="text-sm text-destructive/80 mt-1">
                If you're concerned about immediate safety: 988 Suicide & Crisis Lifeline or 
                contact local emergency services. Remember, your support matters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupporterDashboard;