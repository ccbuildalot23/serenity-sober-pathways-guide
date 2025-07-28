import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Users, Clock, Star, MessageSquare, AlertTriangle, 
  CheckCircle, UserCheck, Settings, BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import SupporterPerformanceDashboard from './SupporterPerformanceDashboard';

interface QueueUser {
  id: string;
  priority: string;
  issue_description?: string;
  created_at: string;
  estimated_wait_minutes: number;
}

interface ActiveChat {
  id: string;
  user_id: string;
  status: string;
  priority: string;
  started_at: string;
}

interface SupporterStats {
  total_chats_completed: number;
  average_rating: number;
  current_chat_count: number;
  is_available: boolean;
}

const SupporterDashboard = () => {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [queueUsers, setQueueUsers] = useState<QueueUser[]>([]);
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [stats, setStats] = useState<SupporterStats>({
    total_chats_completed: 0,
    average_rating: 0,
    current_chat_count: 0,
    is_available: false
  });
  const [loading, setLoading] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);

  // Load supporter profile and stats
  const loadSupporterData = async () => {
    if (!user) return;

    try {
      const { data: supporter, error } = await supabase
        .from('peer_supporters')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (supporter) {
        setStats(supporter);
        setIsAvailable(supporter.is_available);
      }
    } catch (error: any) {
      console.error('Error loading supporter data:', error);
    }
  };

  // Load queue users
  const loadQueueUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('peer_support_queue')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQueueUsers(data || []);
    } catch (error: any) {
      console.error('Error loading queue:', error);
    }
  };

  // Load active chats
  const loadActiveChats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('peer_chat_sessions')
        .select('*')
        .eq('peer_supporter_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setActiveChats(data || []);
    } catch (error: any) {
      console.error('Error loading active chats:', error);
    }
  };

  useEffect(() => {
    loadSupporterData();
    loadQueueUsers();
    loadActiveChats();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadQueueUsers();
      loadActiveChats();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Toggle availability
  const toggleAvailability = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('peer_supporters')
        .upsert({
          user_id: user.id,
          display_name: user.email?.split('@')[0] || 'Peer Supporter',
          is_available: !isAvailable
        });

      if (error) throw error;

      setIsAvailable(!isAvailable);
      toast.success(isAvailable ? 'You are now offline' : 'You are now available for chats');
    } catch (error: any) {
      toast.error(`Failed to update availability: ${error.message}`);
    }
    setLoading(false);
  };

  // Accept next user from queue
  const acceptNextUser = async () => {
    if (!user || queueUsers.length === 0) return;

    setLoading(true);
    try {
      const nextUser = queueUsers[0];

      // Create chat session
      const { data: session, error: sessionError } = await supabase
        .from('peer_chat_sessions')
        .insert({
          user_id: nextUser.id,
          peer_supporter_id: user.id,
          status: 'active',
          priority: nextUser.priority
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Remove user from queue
      const { error: queueError } = await supabase
        .from('peer_support_queue')
        .delete()
        .eq('id', nextUser.id);

      if (queueError) throw queueError;

      toast.success('Chat session started');
      loadQueueUsers();
      loadActiveChats();
    } catch (error: any) {
      toast.error(`Failed to accept user: ${error.message}`);
    }
    setLoading(false);
  };

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'crisis': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  if (showPerformance) {
    return <SupporterPerformanceDashboard />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-800">Peer Supporter Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Available for chats</span>
            <Switch 
              checked={isAvailable} 
              onCheckedChange={toggleAvailability}
              disabled={loading}
            />
          </div>
          <Badge variant={isAvailable ? "default" : "secondary"}>
            {isAvailable ? 'Online' : 'Offline'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPerformance(true)}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Performance
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Chats</p>
                <p className="text-2xl font-bold">{stats.total_chats_completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold">
                  {stats.average_rating ? stats.average_rating.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Chats</p>
                <p className="text-2xl font-bold">{stats.current_chat_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Queue Length</p>
                <p className="text-2xl font-bold">{queueUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Support Queue
              </span>
              {queueUsers.length > 0 && isAvailable && (
                <Button 
                  size="sm"
                  onClick={acceptNextUser}
                  disabled={loading}
                >
                  Accept Next
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {queueUsers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No users waiting in queue</p>
            ) : (
              queueUsers.slice(0, 5).map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getPriorityColor(user.priority)} text-white`}>
                      {user.priority}
                    </Badge>
                    <div>
                      <p className="font-medium">User #{index + 1}</p>
                      <p className="text-sm text-gray-600">
                        Waiting {Math.floor((Date.now() - new Date(user.created_at).getTime()) / 60000)} min
                      </p>
                    </div>
                  </div>
                  {user.issue_description && (
                    <div className="text-xs text-gray-500 max-w-[200px] truncate">
                      {user.issue_description}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Chats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Active Chats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeChats.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No active chats</p>
            ) : (
              activeChats.map((chat, index) => (
                <div key={chat.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Chat #{index + 1}</p>
                      <p className="text-sm text-gray-600">
                        Started {Math.floor((Date.now() - new Date(chat.started_at).getTime()) / 60000)} min ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getPriorityColor(chat.priority)} text-white`}>
                      {chat.priority}
                    </Badge>
                    <Button size="sm" variant="outline">
                      View Chat
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions for new supporters */}
      {stats.total_chats_completed === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <CheckCircle className="w-5 h-5" />
              Welcome to Peer Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-700">
              <p><strong>Getting Started:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Toggle your availability to "Online" to start receiving chat requests</li>
                <li>Users will be added to the queue based on priority (Crisis → High → Normal)</li>
                <li>Click "Accept Next" to start a chat with the next user in queue</li>
                <li>Use the crisis escalation button if a situation requires professional help</li>
                <li>Always maintain confidentiality and provide supportive, non-judgmental communication</li>
              </ul>
              
              <p className="mt-4"><strong>Remember:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>You are providing peer support, not professional therapy</li>
                <li>Encourage users to seek professional help when appropriate</li>
                <li>Take care of your own wellbeing - take breaks when needed</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupporterDashboard;