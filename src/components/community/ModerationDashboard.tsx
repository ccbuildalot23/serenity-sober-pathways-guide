import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, CheckCircle, XCircle, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  user_id: string;
  flag_reason: string;
  sentiment: string;
  crisis_risk: string;
  ai_confidence: number;
  priority: string;
  status: string;
  created_at: string;
  content?: any;
  user_profile?: any;
}

const ModerationDashboard: React.FC = () => {
  const { user } = useAuth();
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (user) {
      loadModerationItems();
      
      // Set up real-time subscription for moderation queue updates
      const channel = supabase
        .channel('moderation-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'moderation_queue'
          },
          (payload) => {
            console.log('Moderation queue update:', payload);
            loadModerationItems(); // Reload data when changes occur
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, activeTab]);

  const loadModerationItems = async () => {
    try {
      setLoading(true);
      
      // Mock data until types are updated - this will be replaced with real data fetching
      const mockData = [
        {
          id: '1',
          content_type: 'forum_post',
          content_id: 'post-1',
          user_id: 'user-1',
          flag_reason: 'Potential crisis language detected',
          sentiment: 'negative',
          crisis_risk: 'high',
          ai_confidence: 0.85,
          priority: 'urgent',
          status: 'pending',
          created_at: new Date().toISOString(),
          full_name: 'Anonymous User',
          email: 'user@example.com'
        }
      ];

      // Filter by active tab
      const filteredData = activeTab === 'all' 
        ? mockData 
        : mockData.filter(item => item.status === activeTab);

      // Fetch associated content for each item
      const itemsWithContent = await Promise.all(
        filteredData.map(async (item: any) => {
          let content = null;
          
          // Mock content for demonstration
          if (item.content_type === 'forum_post') {
            content = {
              title: 'Sample Forum Post',
              content: 'This is a sample forum post that was flagged by AI moderation for potential crisis language. The system detected concerning phrases that may indicate the user needs support.',
              anonymous_name: 'Anonymous123'
            };
          }

          return {
            ...item,
            content,
            user_profile: { full_name: item.full_name, email: item.email }
          } as ModerationItem;
        })
      );

      setModerationItems(itemsWithContent);
    } catch (error) {
      console.error('Error loading moderation items:', error);
      toast.error('Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (itemId: string, action: 'approve' | 'reject' | 'escalate') => {
    try {
      // Mock action handling - this will be replaced with real database updates
      console.log(`${action} action performed on item ${itemId} by user ${user?.id}`);
      
      // Update local state to reflect the action
      setModerationItems(items => 
        items.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'escalated'
              }
            : item
        )
      );

      toast.success(`Item ${action}d successfully`);
      loadModerationItems(); // Reload the list
    } catch (error) {
      console.error('Error updating moderation status:', error);
      toast.error('Failed to update moderation status');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'normal': return 'outline';
      default: return 'outline';
    }
  };

  const getCrisisRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading moderation queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Moderation</h1>
          <p className="text-muted-foreground">AI-powered content moderation dashboard</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={loadModerationItems}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="escalated">Escalated</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {moderationItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No items found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'pending' 
                    ? 'No content pending moderation' 
                    : `No ${activeTab} items found`}
                </p>
              </CardContent>
            </Card>
          ) : (
            moderationItems.map((item) => (
              <Card key={item.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge variant={getCrisisRiskColor(item.crisis_risk)}>
                          Crisis: {item.crisis_risk}
                        </Badge>
                        <Badge variant="outline">
                          {item.content_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">
                        {item.content?.title || `${item.content_type} content`}
                      </CardTitle>
                      <CardDescription>
                        Flagged for: {item.flag_reason}
                      </CardDescription>
                    </div>
                    
                    {item.crisis_risk === 'high' && (
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Sentiment:</span>
                      <p className="capitalize">{item.sentiment}</p>
                    </div>
                    <div>
                      <span className="font-medium">AI Confidence:</span>
                      <p>{Math.round(item.ai_confidence * 100)}%</p>
                    </div>
                    <div>
                      <span className="font-medium">Author:</span>
                      <p>{item.content?.anonymous_name || 'Anonymous'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <p>{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {item.content?.content && (
                    <div className="border rounded-lg p-3 bg-muted/50">
                      <p className="text-sm font-medium mb-2">Content Preview:</p>
                      <p className="text-sm line-clamp-3">
                        {item.content.content.substring(0, 300)}
                        {item.content.content.length > 300 && '...'}
                      </p>
                    </div>
                  )}

                  {item.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModerationAction(item.id, 'approve')}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModerationAction(item.id, 'reject')}
                        className="flex items-center gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      {item.crisis_risk === 'high' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleModerationAction(item.id, 'escalate')}
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Escalate Crisis
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModerationDashboard;